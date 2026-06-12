import { useEffect, useState } from 'react';
import type { ChangeRequest } from '../../shared/types';
import { strongholdApi } from '../api/strongholdApi';

export function ApprovalQueue({ refreshKey = 0 }: { refreshKey?: number }) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [message, setMessage] = useState('');

  async function load() {
    try { const next = await strongholdApi.listChangeRequests(); setRequests(Array.isArray(next) ? next : []); } catch { setRequests([]); }
  }
  useEffect(() => { void load(); }, [refreshKey]);

  async function act(request: ChangeRequest, action: 'approve' | 'reject' | 'apply') {
    const updated = await strongholdApi.decideChangeRequest(request.id, action, { actor: 'Igris', reason: `${action} from Stronghold UI` });
    setMessage(`${action}d ${updated.title}`);
    await load();
  }

  const pending = requests.filter(request => request.status !== 'applied' && request.status !== 'rejected');
  return <section className="panel"><h2>Approval Queue</h2><p>Phase 2 requests move from proposed → approved/rejected → applied. No direct writes from the dashboard.</p>{message && <p className="statusLine">{message}</p>}{pending.length === 0 ? <p className="muted">No pending approvals</p> : <div className="list">{pending.map(request => <article className="row" key={request.id}><div><strong>{request.title}</strong><p className="muted">{request.kind} · {request.status} · requested by {request.requestedBy}</p></div><div className="actions">{request.status === 'pending_review' && <><button onClick={() => void act(request, 'approve')}>Approve</button><button className="secondary" onClick={() => void act(request, 'reject')}>Reject</button></>}{request.status === 'approved' && <button onClick={() => void act(request, 'apply')}>Apply</button>}</div></article>)}</div>}</section>;
}
