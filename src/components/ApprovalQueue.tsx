import { useEffect, useMemo, useState } from 'react';
import { strongholdApi, type ApprovalCard } from '../api/strongholdApi';
import { Panel } from './Cards/Panel';
import { EmptyState } from './Feedback/EmptyState';
import { StatusPill } from './Feedback/StatusPill';
import { useToast } from './Controls/Toast';
import { Palette } from './Shell/Palette';
import { useAnnounce } from './Shell/LiveRegionProvider';

export function ApprovalQueue({ refreshKey = 0 }: { refreshKey?: number }) {
  const [cards, setCards] = useState<ApprovalCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
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

  async function decide(card: ApprovalCard, action: 'approve' | 'reject') {
    const before = cards;
    setPendingId(card.id); setPendingAction(action); setError(null); setResolvedBanner(null);
    const reason = reasonDrafts[card.id]?.trim() || undefined;
    try {
      const updated = await strongholdApi.decideApproval(card.id, action, { reason });
      const message = `${action === 'approve' ? 'Approved' : 'Rejected'}: ${updated.title}`;
      setResolvedBanner(message); announce(action === 'approve' ? 'Approved' : 'Rejected');
      showToast({ tone: 'success', title: message, duration: 5000, undo: { label: 'Undo', ttlMs: 5000, onClick: () => { setCards(before); setResolvedBanner(null); announce('Approval action undone locally'); } } });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      setError(message); showToast({ tone: 'danger', title: `${action} failed`, description: message });
    } finally { setPendingId(null); setPendingAction(null); }
  }

  const active = cards.filter(card => card.status === 'pending');
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
        case 'a': case 'r': { if (currentIndex < 0) return; const btn = approvals[currentIndex].querySelector<HTMLButtonElement>(e.key === 'a' ? '[data-action="approve"]' : '[data-action="reject"]'); btn?.click(); break; }
        case '?': { e.preventDefault(); setShortcutOverlayOpen(true); break; }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function bulk(action: 'approve' | 'reject' | 'changes') {
    if (action === 'changes') {
      setReasonsOpen(prev => Object.fromEntries([...Object.entries(prev), ...selectedCards.map(card => [card.id, true])]));
      showToast({ tone: 'info', title: 'Request changes', description: `${selectedCards.length} approval reason boxes opened.`, duration: 5000, undo: { label: 'Undo', onClick: () => setReasonsOpen({}), ttlMs: 5000 } });
    } else {
      void Promise.all(selectedCards.map(card => decide(card, action)));
    }
    clearSelection();
  }

  return (
    <section className="panel" data-approval-queue>
      <h2>Approval Queue</h2>
      <p>Audit-log only — every resolve writes one immutable entry. No cascading writes.</p>
      <label className="cronInline"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} /> Show resolved</label>
      {active.length > 0 ? <label className="cronInline"><input type="checkbox" checked={allSelected} onChange={e => setSelectedIds(e.target.checked ? new Set(activeIds) : new Set())} /> Select all</label> : null}
      {resolvedBanner && <div className="visuallyInlineStatus" data-approval-resolved>{resolvedBanner}</div>}
      {error && <div className="visuallyInlineStatus danger" role="alert" data-approval-error>{error}</div>}
      {active.length === 0 ? <EmptyState title="All caught up" description="No pending approvals" /> : (
        <div className="list">
          {active.map(card => {
            const isPending = pendingId === card.id;
            const reasonOpen = !!reasonsOpen[card.id];
            return (
              <Panel as="article" key={card.id} title={card.title} actions={<StatusPill tone="info" label="request" />}>
                <div className="row approvalCard" data-approval-id={card.id} data-approval-status={card.status} tabIndex={0}>
                  <input type="checkbox" aria-label={`Select ${card.title}`} checked={selectedIds.has(card.id)} onChange={() => toggle(card.id)} />
                  <div className="approvalCardBody"><p className="muted">{card.requestedBy ? `requested by ${card.requestedBy}` : 'pending'} · {card.status}</p><button type="button" className="linkButton" onClick={() => setReasonsOpen(prev => ({ ...prev, [card.id]: !prev[card.id] }))} data-approval-reason-toggle={card.id} aria-expanded={reasonOpen}>{reasonOpen ? 'Hide reason' : 'Add reason'}</button>{reasonOpen && <textarea className="approvalReason" data-approval-reason-input={card.id} placeholder="Optional reason (max 500 chars)" maxLength={500} value={reasonDrafts[card.id] || ''} onChange={e => setReasonDrafts(prev => ({ ...prev, [card.id]: e.target.value }))} />}</div>
                  <div className="actions"><button type="button" onClick={() => void decide(card, 'approve')} disabled={isPending} data-action="approve" data-approval-action={`approve:${card.id}`}>{isPending && pendingAction === 'approve' ? 'Approving…' : 'Approve'}</button><button type="button" className="btn-secondary" onClick={() => void decide(card, 'reject')} disabled={isPending} data-action="reject" data-approval-action={`reject:${card.id}`}>{isPending && pendingAction === 'reject' ? 'Rejecting…' : 'Reject'}</button></div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
      {selectedIds.size > 0 ? <div className="bulkActionBar" role="region" aria-label="Approval bulk actions"><span className="bulkActionBar__count">{selectedIds.size} selected</span><div className="bulkActionBar__actions"><button type="button" onClick={() => bulk('approve')}>Approve</button><button type="button" onClick={() => bulk('reject')}>Reject</button><button type="button" onClick={() => bulk('changes')}>Request changes</button></div><button type="button" className="bulkActionBar__clear" onClick={clearSelection}>Clear selection</button></div> : null}
      {showResolved && recentlyResolved.length > 0 && <details className="resolvedStack" data-approval-resolved-stack><summary>Recently resolved ({recentlyResolved.length})</summary><ul>{recentlyResolved.map(card => <li key={card.id}><strong>{card.title}</strong> — Resolved ({card.status}){card.decidedAt ? ` · ${new Date(card.decidedAt).toLocaleString()}` : ''}</li>)}</ul></details>}
      <Palette mode="shortcuts" open={shortcutOverlayOpen} onClose={() => setShortcutOverlayOpen(false)} />
    </section>
  );
}
