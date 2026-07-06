import { useEffect, useRef } from 'react';
import type { WorkCard } from '../types';

export type WorkCardDrawerProps = {
  card: WorkCard | null;
  onClose: () => void;
};

/**
 * Read-only drawer for a work card. Shows full frontmatter metadata.
 *
 * SECURITY NOTE (R8): the drawer never links out to the card's `filePath`,
 * nor exposes the absolute path in the visible UI. Only the basename
 * (e.g. `R8-WORKCARD-FEED.md`) is rendered as a label until Sentinel
 * signs off on broader file-path exposure. The markdown body is intentionally
 * not fetched here yet — that requires a Sentinel-approved `/api/workcards/:id/body`
 * endpoint with pathGuard allowlist expansion (out of scope for this PR).
 */
export function WorkCardDrawer({ card, onClose }: WorkCardDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!card) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []).filter(el => !el.hasAttribute('disabled'));
    window.setTimeout(() => focusables()[0]?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); triggerRef.current?.focus(); };
  }, [card, onClose]);

  if (!card) return null;

  const basename = card.filePath.split(/[\\/]/).pop() || card.filePath;

  return (
    <div className="workCardDrawerBackdrop" role="dialog" aria-modal="true" aria-label={`Work card ${card.workCardId}`} onClick={onClose}>
      <div ref={drawerRef} className="workCardDrawer" onClick={event => event.stopPropagation()} data-work-card-drawer={card.workCardId}>
        <header className="workCardDrawerHeader">
          <div>
            <span className="agenticOsWorkBadge">{card.workCardId}</span>
            <span className={`workCardRiskBadge ${card.risk.toLowerCase()}`}>risk {card.risk.toLowerCase()}</span>
            <span className={`status ${card.status}`}>{card.status}</span>
          </div>
          <button type="button" className="agenticOsRecheck" onClick={onClose} aria-label="Close drawer">Close</button>
        </header>

        <h3 className="workCardDrawerTitle">{card.title}</h3>

        <dl className="workCardDrawerMeta">
          <div><dt>Project</dt><dd>{card.project}</dd></div>
          <div><dt>Owner</dt><dd>{card.owner}</dd></div>
          <div><dt>QC</dt><dd>{card.qc}</dd></div>
          <div><dt>Created</dt><dd>{card.created}</dd></div>
          {card.schedule ? <div><dt>Schedule</dt><dd>{card.schedule}</dd></div> : null}
          {card.mode ? <div><dt>Mode</dt><dd>{card.mode}</dd></div> : null}
          <div><dt>Last updated</dt><dd>{new Date(card.lastUpdated).toLocaleString()}</dd></div>
          <div><dt>Source file</dt><dd title="Full path hidden pending Sentinel R8 review">{basename}</dd></div>
        </dl>

        <section className="workCardDrawerBody" aria-label="Work card body">
          <h4>Body</h4>
          <p className="muted">Markdown body read gated on Sentinel R8 review — frontmatter above is the live source of truth.</p>
        </section>
      </div>
    </div>
  );
}