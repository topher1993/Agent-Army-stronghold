import { useEffect, useMemo, useRef, useState } from 'react';
import { strongholdApi, type ApprovalCard } from '../api/strongholdApi';
import { Panel } from './Cards/Panel';
import { EmptyState } from './Feedback/EmptyState';
import { StatusPill } from './Feedback/StatusPill';
import { useToast } from './Controls/Toast';
import { Palette } from './Shell/Palette';
import { useAnnounce } from './Shell/LiveRegionProvider';

/**
 * Soft-mutable approve/reject pattern.
 *
 * Click does NOT immediately POST. Instead it stages a pending op
 * (a `setTimeout(commit, ttlMs + 250)`). Within the window the
 * toast's Undo button clears the timer and restores local state —
 * no backend call. After the window the commit runs and either
 * succeeds (refresh from backend) or fails (restore card + danger
 * toast). Bulk uses the same primitive per-card with one summary
 * toast whose Undo clears every staged timer.
 */
type PendingAction = 'approve' | 'reject';
type PendingOp = {
  id: string;
  action: PendingAction;
  reason?: string;
  titleAtStage: string;
  timerId: ReturnType<typeof setTimeout>;
};

const UNDO_TTL_MS = 5000;
const COMMIT_GRACE_MS = 250;

export function ApprovalQueue({ refreshKey = 0 }: { refreshKey?: number }) {
  const [cards, setCards] = useState<ApprovalCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  // Soft-mutable staging area: card.id -> op.
  const [staged, setStaged] = useState<Record<string, PendingOp>>({});
  const stagedRef = useRef<Record<string, PendingOp>>({});
  stagedRef.current = staged;
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [reasonsOpen, setReasonsOpen] = useState<Record<string, boolean>>({});
  const [resolvedBanner, setResolvedBanner] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [shortcutOverlayOpen, setShortcutOverlayOpen] = useState(false);
  const { showToast } = useToast();
  const announce = useAnnounce();

  async function load() {
    try { const next = await strongholdApi.listApprovals(); setCards(Array.isArray(next) ? next : []); setError(null); }
    catch (err) { setCards([]); setError(err instanceof Error ? err.message : 'failed to load approvals'); }
  }
  useEffect(() => { void load(); }, [refreshKey]);

  // Cleanup: clear every in-flight timer when the component unmounts so
  // we never POST after navigating away.
  useEffect(() => {
    return () => {
      for (const op of Object.values(stagedRef.current)) clearTimeout(op.timerId);
    };
  }, []);

  /**
   * Commit runs when the staged op's timer fires. Only POSTs at this
   * point — undo during the window prevents ever reaching here.
   */
  async function commitOp(op: PendingOp) {
    setStaged(prev => {
      if (!prev[op.id]) return prev;
      const next = { ...prev };
      delete next[op.id];
      return next;
    });
    setPendingId(op.id);
    setPendingAction(op.action);
    setError(null);
    try {
      const updated = await strongholdApi.decideApproval(
        op.id,
        op.action,
        op.reason ? { reason: op.reason } : {}
      );
      const doneMsg = `${op.action === 'approve' ? 'Approved' : 'Rejected'}: ${updated.title || op.titleAtStage}`;
      setResolvedBanner(doneMsg);
      announce(op.action === 'approve' ? 'Approved' : 'Rejected');
      showToast({ tone: op.action === 'approve' ? 'success' : 'warning', title: doneMsg, duration: 4000 });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `${op.action} failed`;
      setError(msg);
      setResolvedBanner(null);
      showToast({ tone: 'danger', title: `${op.action} failed`, description: msg });
    } finally {
      setPendingId(null);
      setPendingAction(null);
    }
  }

  function stageDecision(card: ApprovalCard, action: PendingAction, opts: { quiet?: boolean } = {}) {
    const existing = staged[card.id];
    if (existing) {
      if (existing.action === action) return; // idempotent
      clearTimeout(existing.timerId);
    }

    const reason = reasonDrafts[card.id]?.trim() || undefined;
    const titleAtStage = card.title;

    const undoThis = () => {
      const current = stagedRef.current[card.id];
      if (!current || current.action !== action) return; // already committed or replaced
      clearTimeout(current.timerId);
      setStaged(prev => {
        if (prev[card.id]?.action !== action) return prev;
        const next = { ...prev };
        delete next[card.id];
        return next;
      });
      setResolvedBanner(null);
      announce('Approval action cancelled');
    };

    const timerId = setTimeout(() => commitOp({ id: card.id, action, reason, titleAtStage, timerId: 0 as unknown as ReturnType<typeof setTimeout> }), UNDO_TTL_MS + COMMIT_GRACE_MS);

    setStaged(prev => ({
      ...prev,
      [card.id]: { id: card.id, action, reason, titleAtStage, timerId },
    }));
    setResolvedBanner(`${action === 'approve' ? 'Approving' : 'Rejecting'}: ${titleAtStage}`);

    if (!opts.quiet) {
      const message = `${action === 'approve' ? 'Approving' : 'Rejecting'}: ${titleAtStage}`;
      showToast({
        tone: 'info',
        title: message,
        description: 'Will commit in 5 seconds. Click Undo to cancel.',
        duration: UNDO_TTL_MS + COMMIT_GRACE_MS,
        undo: { label: 'Undo', ttlMs: UNDO_TTL_MS, onClick: undoThis },
      });
    }
  }

  function revertAllStaged() {
    for (const op of Object.values(stagedRef.current)) clearTimeout(op.timerId);
    setStaged({});
    setResolvedBanner(null);
    announce('All staged approvals cancelled');
  }

  // Active list = pending approvals not currently staged.
  const active = useMemo(
    () => cards.filter(card => card.status === 'pending' && !staged[card.id]),
    [cards, staged]
  );
  const activeIds = useMemo(() => active.map(card => card.id), [active]);
  const recentlyResolved = cards.filter(card => card.status !== 'pending').slice(0, 5);
  const allSelected = activeIds.length > 0 && activeIds.every(id => selectedIds.has(id));
  const selectedCards = active.filter(card => selectedIds.has(card.id));

  const toggle = (id: string) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const clearSelection = () => setSelectedIds(new Set());

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const approvals = Array.from(document.querySelectorAll<HTMLElement>('[data-approval-id]'));
      const currentIndex = approvals.findIndex(el => el.contains(document.activeElement));
      switch (e.key) {
        case 'j': { e.preventDefault(); const next = approvals[Math.min(currentIndex + 1, approvals.length - 1)] || approvals[0]; next?.focus(); break; }
        case 'k': { e.preventDefault(); const prev = approvals[Math.max(currentIndex - 1, 0)] || approvals[approvals.length - 1]; prev?.focus(); break; }
        case 'a': case 'r': { if (currentIndex < 0) return; const act = e.key === 'a' ? 'approve' : 'reject'; const btn = approvals[currentIndex].querySelector<HTMLButtonElement>(`[data-action="${act}"]`); btn?.click(); break; }
        case '?': { e.preventDefault(); setShortcutOverlayOpen(true); break; }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /**
   * Bulk approve/reject creates one staged op per selected card. Each
   * is silent (no per-card toast); one summary toast's Undo button
   * reverts ALL staged timers. This matches user mental model ("undo
   * my batch") while still using the same soft-mutable primitive
   * per card.
   */
  function bulk(action: 'approve' | 'reject' | 'changes') {
    if (action === 'changes') {
      setReasonsOpen(prev => Object.fromEntries([...Object.entries(prev), ...selectedCards.map(card => [card.id, true])]));
      showToast({ tone: 'info', title: 'Request changes', description: `${selectedCards.length} approval reason boxes opened.`, duration: 5000, undo: { label: 'Undo', onClick: () => setReasonsOpen({}), ttlMs: 5000 } });
    } else {
      const count = selectedCards.length;
      for (const card of selectedCards) stageDecision(card, action, { quiet: true });
      showToast({
        tone: 'info',
        title: `${action === 'approve' ? 'Approving' : 'Rejecting'} ${count}`,
        description: `${count} approval${count === 1 ? '' : 's'} will commit in 5 seconds. Click Undo to cancel all.`,
        duration: UNDO_TTL_MS + COMMIT_GRACE_MS,
        undo: { label: 'Undo all', ttlMs: UNDO_TTL_MS, onClick: revertAllStaged },
      });
    }
    clearSelection();
  }

  function cardById(id: string): ApprovalCard | undefined {
    return cards.find(c => c.id === id);
  }

  const stagedCount = Object.keys(staged).length;

  return (
    <section className="panel" data-approval-queue>
      <h2>Approval Queue</h2>
      <p>Audit-log only — every resolve writes one immutable entry. No cascading writes.</p>
      <label className="cronInline"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} /> Show resolved</label>
      {active.length > 0 ? <label className="cronInline"><input type="checkbox" checked={allSelected} onChange={e => setSelectedIds(e.target.checked ? new Set(activeIds) : new Set())} /> Select all</label> : null}
      {resolvedBanner && <div className="visuallyInlineStatus" data-approval-resolved>{resolvedBanner}</div>}
      {error && <div className="visuallyInlineStatus danger" role="alert" data-approval-error>{error}</div>}
      {stagedCount > 0 ? (
        <div className="visuallyInlineStatus" data-approval-staged-summary>
          {stagedCount} approval{stagedCount === 1 ? '' : 's'} pending commit (Undo from toast)
        </div>
      ) : null}
      {active.length === 0 && stagedCount === 0 ? <EmptyState title="All caught up" description="No pending approvals" /> : null}
      {active.length === 0 && stagedCount > 0 ? (
        <div className="list" data-approval-staged-list>
          {Object.values(staged).map(op => {
            const card = cardById(op.id);
            return (
              <Panel
                as="article"
                key={`staged-${op.id}`}
                title={card?.title || op.titleAtStage}
                actions={<StatusPill tone={op.action === 'approve' ? 'success' : 'warning'} label={`staged ${op.action}`} />}
              >
                <div className="row approvalCard approvalCard--staged" data-approval-id={op.id} data-approval-staged={op.action}>
                  <p className="muted">Will commit in {Math.ceil(UNDO_TTL_MS / 1000)}s unless undone.</p>
                  <div className="actions">
                    <button type="button" className="linkButton" onClick={() => {
                      const current = stagedRef.current[op.id];
                      if (!current) return;
                      clearTimeout(current.timerId);
                      setStaged(prev => { const next = { ...prev }; delete next[op.id]; return next; });
                    }} data-approval-cancel-staged={op.id}>
                      Cancel now
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : null}
      {active.length > 0 ? (
        <div className="list">
          {active.map(card => {
            const isPending = pendingId === card.id;
            const reasonOpen = !!reasonsOpen[card.id];
            return (
              <Panel as="article" key={card.id} title={card.title} actions={<StatusPill tone="info" label="request" />}>
                <div className="row approvalCard" data-approval-id={card.id} data-approval-status={card.status} tabIndex={0}>
                  <input type="checkbox" aria-label={`Select ${card.title}`} checked={selectedIds.has(card.id)} onChange={() => toggle(card.id)} />
                  <div className="approvalCardBody">
                    <p className="muted">{card.requestedBy ? `requested by ${card.requestedBy}` : 'pending'} · {card.status}</p>
                    <button type="button" className="linkButton" onClick={() => setReasonsOpen(prev => ({ ...prev, [card.id]: !prev[card.id] }))} data-approval-reason-toggle={card.id} aria-expanded={reasonOpen}>{reasonOpen ? 'Hide reason' : 'Add reason'}</button>
                    {reasonOpen && <textarea className="approvalReason" data-approval-reason-input={card.id} placeholder="Optional reason (max 500 chars)" maxLength={500} value={reasonDrafts[card.id] || ''} onChange={e => setReasonDrafts(prev => ({ ...prev, [card.id]: e.target.value }))} />}
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      onClick={() => stageDecision(card, 'approve')}
                      disabled={isPending}
                      data-action="approve"
                      data-approval-action={`approve:${card.id}`}
                    >
                      {isPending && pendingAction === 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => stageDecision(card, 'reject')}
                      disabled={isPending}
                      data-action="reject"
                      data-approval-action={`reject:${card.id}`}
                    >
                      {isPending && pendingAction === 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : null}
      {selectedIds.size > 0 ? <div className="bulkActionBar" role="region" aria-label="Approval bulk actions"><span className="bulkActionBar__count">{selectedIds.size} selected</span><div className="bulkActionBar__actions"><button type="button" onClick={() => bulk('approve')}>Approve</button><button type="button" onClick={() => bulk('reject')}>Reject</button><button type="button" onClick={() => bulk('changes')}>Request changes</button></div><button type="button" className="bulkActionBar__clear" onClick={clearSelection}>Clear selection</button></div> : null}
      {showResolved && recentlyResolved.length > 0 && <details className="resolvedStack" data-approval-resolved-stack><summary>Recently resolved ({recentlyResolved.length})</summary><ul>{recentlyResolved.map(card => <li key={card.id}><strong>{card.title}</strong> — Resolved ({card.status}){card.decidedAt ? ` · ${new Date(card.decidedAt).toLocaleString()}` : ''}</li>)}</ul></details>}
      <Palette mode="shortcuts" open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} />
    </section>
  );
}
