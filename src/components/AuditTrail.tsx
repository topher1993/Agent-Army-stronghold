import { useEffect, useState } from 'react';
import type { AuditEvent } from '../../shared/types';
import { strongholdApi } from '../api/strongholdApi';

export function AuditTrail({ refreshKey = 0 }: { refreshKey?: number }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { strongholdApi.listAudit().then(next => setEvents(Array.isArray(next) ? next : [])).catch(() => setEvents([])); }, [refreshKey]);
  const visible = showAll ? events.slice().reverse() : events.slice(-8).reverse();
  return (
    <section className="panel">
      <h2>Audit Trail</h2>
      <p>Every proposal, denial, approval, and apply attempt must be recorded with redacted metadata.</p>
      {events.length === 0 ? <p className="muted">No audit events yet</p> : (
        <>
          <div className="list">
            {visible.map(event => <article className="row" key={event.id}><div><strong>{event.action}</strong><p className="muted">{event.outcome} · {event.actor} · {new Date(event.timestamp).toLocaleString()}</p></div><span className="status ok">redacted</span></article>)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            {showAll ? <button type="button" className="linkButton" onClick={() => setShowAll(false)}>Show less</button> : <button type="button" className="linkButton" onClick={() => setShowAll(true)}>Show all ({events.length} events)</button>}
          </div>
        </>
      )}
    </section>
  );
}
