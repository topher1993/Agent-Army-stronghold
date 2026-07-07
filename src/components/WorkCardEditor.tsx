import { useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { ChangeRequest } from '../../shared/types';
import { Form } from './Forms/Form';
import { FormField } from './Forms/FormField';
import { FormActions } from './Forms/FormActions';
import { useAnnounce } from './Shell/LiveRegionProvider';

export type WorkCardEditorProps = { onCreated?: (request: ChangeRequest) => void };
const DEFAULT_FORM = { workCardId: '', project: '', title: '', owner: 'Igris', qc: 'Tusk', risk: 'YELLOW' as 'GREEN' | 'YELLOW' | 'RED', status: 'review' as 'planned' | 'active' | 'blocked' | 'review' | 'complete', schedule: '', mode: '', rationale: '' };

export function WorkCardEditor({ onCreated }: WorkCardEditorProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const announce = useAnnounce();
  function update<K extends keyof typeof DEFAULT_FORM>(key: K, value: typeof DEFAULT_FORM[K]) { setForm(current => ({ ...current, [key]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (submitting) return;
    const nextErrors: Record<string, string> = {};
    if (!form.workCardId.trim()) nextErrors.workCardId = 'Work card ID is required';
    if (!form.project.trim()) nextErrors.project = 'Project is required';
    if (!form.title.trim()) nextErrors.title = 'Title is required';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); setStatus('workCardId, project, and title are required'); announce(`Validation failed: ${Object.keys(nextErrors)[0]}`); return; }
    setSubmitting(true); setStatus(''); setErrors({});
    try {
      const payload = { workCardId: form.workCardId.trim(), project: form.project.trim(), title: form.title.trim(), owner: form.owner.trim(), qc: form.qc.trim(), risk: form.risk, status: form.status, ...(form.schedule.trim() ? { schedule: form.schedule.trim() } : {}), ...(form.mode.trim() ? { mode: form.mode.trim() } : {}), created: new Date().toISOString().slice(0, 10) };
      const request = await strongholdApi.createChangeRequest({ kind: 'workcard.create', title: form.title.trim(), rationale: form.rationale.trim() || 'Created from Stronghold UI', requestedBy: 'Chris', reviewers: ['Igris', 'Sentinel'], payload });
      setStatus(`Created proposal ${request.id.slice(0, 8)} — awaiting approval`); setForm(DEFAULT_FORM); announce('Saved'); onCreated?.(request);
    } catch (error) { setStatus(error instanceof Error ? error.message : 'Unable to create proposal'); announce('Action failed'); }
    finally { setSubmitting(false); }
  }
  return <section className="panel workCardEditor" aria-label="Work card proposal form"><p>Submit a new work card as a proposal — approval is required before the markdown is written to the work-cards directory.</p><Form onSubmit={submit}><FormField label="Work card ID" error={errors.workCardId}><input value={form.workCardId} onChange={event => update('workCardId', event.target.value)} placeholder="e.g. WC-44-3" aria-invalid={!!errors.workCardId} /></FormField><FormField label="Project" error={errors.project}><input value={form.project} onChange={event => update('project', event.target.value)} placeholder="e.g. japanese-tutor" aria-invalid={!!errors.project} /></FormField><FormField label="Title" error={errors.title}><input value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Add telemetry wrapper" aria-invalid={!!errors.title} /></FormField><FormField label="Owner"><input value={form.owner} onChange={event => update('owner', event.target.value)} /></FormField><FormField label="QC"><input value={form.qc} onChange={event => update('qc', event.target.value)} /></FormField><FormField label="Risk"><select value={form.risk} onChange={event => update('risk', event.target.value as typeof DEFAULT_FORM.risk)}><option value="GREEN">GREEN</option><option value="YELLOW">YELLOW</option><option value="RED">RED</option></select></FormField><FormField label="Status"><select value={form.status} onChange={event => update('status', event.target.value as typeof DEFAULT_FORM.status)}><option value="planned">planned</option><option value="active">active</option><option value="blocked">blocked</option><option value="review">review</option><option value="complete">complete</option></select></FormField><FormField label="Schedule (optional)"><input value={form.schedule} onChange={event => update('schedule', event.target.value)} placeholder="e.g. Phase 45" /></FormField><FormField label="Mode (optional)"><input value={form.mode} onChange={event => update('mode', event.target.value)} placeholder="e.g. tdd" /></FormField><FormField label="Rationale"><textarea value={form.rationale} onChange={event => update('rationale', event.target.value)} placeholder="Why this card? Who owns it after approval?" /></FormField><FormActions><button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Create work card proposal'}</button></FormActions></Form>{status ? <p className="statusLine">{status}</p> : null}</section>;
}
