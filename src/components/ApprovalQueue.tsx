import { useEffect, useState } from 'react';
import { strongholdApi, type ApprovalCard } from '../api/strongholdApi';
import { Panel } from './Cards/Panel';
import { EmptyState } from './Feedback/EmptyState';
import { StatusPill } from './Feedback/StatusPill';
import { useToast } from './Controls/Toast';

// FEATURE 1 — Approval Queue (right rail)
// Audit-log-only: every click hits POST /api/approvals/:id/{approve|reject}.
// The endpoint appends exactly one immutable audit entry per resolve and
// 409s on a second concurrent resolve (see server/index.ts).
//
// UX contract:
//  - Two buttons per pending card: Approve, Reject.
//  - Optional reason textarea, collapsed by default.
//  - Optimistic disable + spinner while the call is in flight.
//  - On success: card flips to a "Resolved (approved|rejected)" state with a
//    timestamp and disappears from the active list on next refresh.
//  - On error: toast with the server-supplied message + buttons re-enable.

export function ApprovalQueue({ refreshKey = 0 }: { refreshKey?: number }) {
  const [cards, setCards] = useState<ApprovalCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [reasonsOpen, setReasonsOpen] = useState<Record<string, boolean>>({});
  const [resolvedBanner, setResolvedBanner] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const { showToast } = useToast();

  async function load() {
    try {
      const next = await strongholdApi.listApprovals();
      setCards(Array.isArray(next) ? next : []);
      setError(null);
    } catch (err) {
      setCards([]);
      setError(err instanceof Error ? err.message : 'failed to load approvals');
    }
  }
  useEffect(() => { void load(); }, [refreshKey]);

  async function decide(card: ApprovalCard, action: 'approve' | 'reject') {
    setPendingId(card.id);
    setPendingAction(action);
    setError(null);
    setResolvedBanner(null);
    const reason = reasonDrafts[card.id]?.trim() || undefined;
    try {
      const updated = await strongholdApi.decideApproval(card.id, action, { reason });
      const message = `${action === 'approve' ? 'Approved' : 'Rejected'}: ${updated.title}`;
      setResolvedBanner(message);
      showToast({ tone: 'success', title: message });
      // Re-fetch the list so the card drops out of the active list cleanly.
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      setError(message);
      showToast({ tone: 'danger', title: `${action} failed`, description: message });
    } finally {
      setPendingId(null);
      setPendingAction(null);
    }
  }

  const active = cards.filter(card => card.status === 'pending');
  const recentlyResolved = cards.filter(card => card.status !== 'pending').slice(0, 5);

  return (
    <section className="panel" data-approval-queue>
      <h2>Approval Queue</h2>
      <p>Audit-log only — every resolve writes one immutable entry. No cascading writes.</p>
      <label className="cronInline"><input type="checkbox" checked={showResolved} onChange={e => setShowResolved(e.target.checked)} /> Show resolved</label>
      {resolvedBanner && <div className="visuallyInlineStatus" data-approval-resolved>{resolvedBanner}</div>}
      {error && <div className="visuallyInlineStatus danger" role="alert" data-approval-error>{error}</div>}
      {active.length === 0
        ? <EmptyState title="All caught up" description="No pending approvals" />
        : (
          <div className="list">
            {active.map(card => {
              const isPending = pendingId === card.id;
              const reasonOpen = !!reasonsOpen[card.id];
              return (
                <Panel as="article" key={card.id} title={card.title} actions={<StatusPill tone="info" label="request" />}><div className="row approvalCard" data-approval-id={card.id} data-approval-status={card.status}>
                  <div className="approvalCardBody">
                    <p className="muted">{card.requestedBy ? `requested by ${card.requestedBy}` : 'pending'} · {card.status}</p>
                    <button
                      type="button"
                      className="linkButton"
                      onClick={() => setReasonsOpen(prev => ({ ...prev, [card.id]: !prev[card.id] }))}
                      data-approval-reason-toggle={card.id}
                      aria-expanded={reasonOpen}
                    >
                      {reasonOpen ? 'Hide reason' : 'Add reason'}
                    </button>
                    {reasonOpen && (
                      <textarea
                        className="approvalReason"
                        data-approval-reason-input={card.id}
                        placeholder="Optional reason (max 500 chars)"
                        maxLength={500}
                        value={reasonDrafts[card.id] || ''}
                        onChange={e => setReasonDrafts(prev => ({ ...prev, [card.id]: e.target.value }))}
                      />
                    )}
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      onClick={() => void decide(card, 'approve')}
                      disabled={isPending}
                      data-approval-action={`approve:${card.id}`}
                    >
                      {isPending && pendingAction === 'approve' ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => void decide(card, 'reject')}
                      disabled={isPending}
                      data-approval-action={`reject:${card.id}`}
                    >
                      {isPending && pendingAction === 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                  </div>
                </div></Panel>
              );
            })}
          </div>
        )}
      {showResolved && recentlyResolved.length > 0 && (
        <details className="resolvedStack" data-approval-resolved-stack>
          <summary>Recently resolved ({recentlyResolved.length})</summary>
          <ul>
            {recentlyResolved.map(card => (
              <li key={card.id}>
                <strong>{card.title}</strong> — Resolved ({card.status}){card.decidedAt ? ` · ${new Date(card.decidedAt).toLocaleString()}` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
