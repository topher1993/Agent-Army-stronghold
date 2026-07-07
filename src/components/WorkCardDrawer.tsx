import { useEffect, useRef, useState } from 'react';
import type { WorkCard, WorkCardStatus } from '../types';
import { StatusPill } from './Feedback/StatusPill';

const STATUSES: WorkCardStatus[] = ['planned', 'active', 'blocked', 'review', 'complete'];
type Draft = { title: string; owner: string; schedule: string; status: WorkCardStatus };
type FieldName = keyof Draft;

export type WorkCardDrawerProps = {
  card: WorkCard | null;
  onClose: () => void;
  onUpdate?: (id: string, patch: Partial<WorkCard>) => void;
};

function draftKey(id: string) { return `stronghold.workCardDrafts.${id}`; }
function readDraft(id?: string): Draft | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(draftKey(id));
    return raw ? JSON.parse(raw) as Draft : null;
  } catch { return null; }
}

export function WorkCardDrawer({ card, onClose, onUpdate }: WorkCardDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState<Draft | null>(() => readDraft(card?.workCardId));
  const [editing, setEditing] = useState<FieldName | null>(null);
  const [savedField, setSavedField] = useState<FieldName | null>(null);

  useEffect(() => { if (card) { setDraft(readDraft(card.workCardId)); setEditing(null); } }, [card?.workCardId]);
  useEffect(() => {
    if (!card) return;
    try {
      if (draft) localStorage.setItem(draftKey(card.workCardId), JSON.stringify(draft));
      else localStorage.removeItem(draftKey(card.workCardId));
    } catch { /* localStorage may be disabled */ }
  }, [draft, card?.workCardId]);

  useEffect(() => {
    if (!card) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || []).filter(el => !el.hasAttribute('disabled'));
    window.setTimeout(() => focusables()[0]?.focus(), 0);
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && !editing) onClose();
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
  }, [card, editing, onClose]);

  if (!card) return null;

  const display: Draft = {
    title: draft?.title ?? card.title,
    owner: draft?.owner ?? card.owner,
    schedule: draft?.schedule ?? card.schedule ?? '',
    status: draft?.status ?? card.status,
  };
  const basename = card.filePath.split(/[\\/]/).pop() || card.filePath;
  const ensureDraft = () => draft ?? display;
  const startEdit = (field: FieldName) => { setDraft(ensureDraft()); setEditing(field); };
  const cancel = () => { setEditing(null); setDraft(readDraft(card.workCardId)); };
  const commit = (field: FieldName) => {
    const nextDraft = ensureDraft();
    setDraft(nextDraft);
    onUpdate?.(card.workCardId, { [field]: nextDraft[field] } as Partial<WorkCard>);
    setEditing(null);
    setSavedField(field);
    window.setTimeout(() => setSavedField(current => current === field ? null : current), 2000);
  };
  const reset = () => { setDraft(null); setEditing(null); };

  return (
    <div className="workCardDrawerBackdrop" role="dialog" aria-modal="true" aria-label={`Work card ${card.workCardId}`} onClick={onClose}>
      <div ref={drawerRef} className="workCardDrawer" onClick={event => event.stopPropagation()} data-work-card-drawer={card.workCardId}>
        <header className="workCardDrawerHeader">
          <div><span className="agenticOsWorkBadge">{card.workCardId}</span><span className={`workCardRiskBadge ${card.risk.toLowerCase()}`}>risk {card.risk.toLowerCase()}</span><span className={`status ${display.status}`}>{display.status}</span></div>
          <button type="button" className="agenticOsRecheck" onClick={onClose} aria-label="Close drawer">Close</button>
        </header>

        <EditableText field="title" value={display.title} editing={editing} savedField={savedField} startEdit={startEdit} setDraft={setDraft} display={display} commit={commit} cancel={cancel} title />

        <dl className="workCardDrawerMeta">
          <div><dt>Project</dt><dd>{card.project}</dd></div>
          <div><dt>Owner</dt><dd><EditableText field="owner" value={display.owner} editing={editing} savedField={savedField} startEdit={startEdit} setDraft={setDraft} display={display} commit={commit} cancel={cancel} /></dd></div>
          <div><dt>QC</dt><dd>{card.qc}</dd></div>
          <div><dt>Created</dt><dd>{card.created}</dd></div>
          <div><dt>Schedule</dt><dd>{editing === 'schedule' ? <input autoFocus type="date" aria-label="schedule" value={display.schedule} onChange={event => setDraft({ ...display, schedule: event.target.value })} onBlur={() => commit('schedule')} onKeyDown={event => { if (event.key === 'Enter') commit('schedule'); if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }} /> : <button type="button" className="workCardDrawerEditable" aria-label="Edit schedule" onClick={() => startEdit('schedule')}>{display.schedule || 'No schedule'}</button>}{savedField === 'schedule' ? <StatusPill tone="success" label="saved" size="sm" /> : null}</dd></div>
          <div><dt>Status</dt><dd>{editing === 'status' ? <select autoFocus aria-label="status" value={display.status} onChange={event => setDraft({ ...display, status: event.target.value as WorkCardStatus })} onBlur={() => commit('status')} onKeyDown={event => { if (event.key === 'Enter') commit('status'); if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }}>{STATUSES.map(status => <option key={status} value={status}>{status.toUpperCase()}</option>)}</select> : <button type="button" className="workCardDrawerEditable" aria-label="Edit status" onClick={() => startEdit('status')}>{display.status}</button>}{savedField === 'status' ? <StatusPill tone="success" label="saved" size="sm" /> : null}</dd></div>
          {card.mode ? <div><dt>Mode</dt><dd>{card.mode}</dd></div> : null}
          <div><dt>Last updated</dt><dd>{new Date(card.lastUpdated).toLocaleString()}</dd></div>
          <div><dt>Source file</dt><dd title="Full path hidden pending Sentinel R8 review">{basename}</dd></div>
        </dl>
        <button type="button" className="linkButton" onClick={reset}>Reset to original</button>

        <section className="workCardDrawerBody" aria-label="Work card body"><h4>Body</h4><p className="muted">Markdown body read gated on Sentinel R8 review — frontmatter above is the live source of truth.</p></section>
      </div>
    </div>
  );
}

function EditableText({ field, value, editing, savedField, startEdit, setDraft, display, commit, cancel, title = false }: {
  field: 'title' | 'owner'; value: string; editing: FieldName | null; savedField: FieldName | null; startEdit: (field: FieldName) => void; setDraft: (draft: Draft) => void; display: Draft; commit: (field: FieldName) => void; cancel: () => void; title?: boolean;
}) {
  const input = editing === field ? <input autoFocus aria-label={field} value={value} onChange={event => setDraft({ ...display, [field]: event.target.value })} onBlur={() => commit(field)} onKeyDown={event => { if (event.key === 'Enter') commit(field); if (event.key === 'Escape') { event.stopPropagation(); cancel(); } }} /> : null;
  const saved = savedField === field ? <StatusPill tone="success" label="saved" size="sm" /> : null;
  if (title) {
    return input ? <div className="workCardDrawerInlineTitle">{input}{saved}</div> : <div className="workCardDrawerInlineTitle"><h3 className="workCardDrawerTitle" onClick={() => startEdit(field)} tabIndex={0} role="button" aria-label={`Edit ${field}`} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); startEdit(field); } }}>{value}</h3>{saved}</div>;
  }
  return input ? <>{input}{saved}</> : <><button type="button" className="workCardDrawerEditable" aria-label={`Edit ${field}`} onClick={() => startEdit(field)}>{value}</button>{saved}</>;
}
