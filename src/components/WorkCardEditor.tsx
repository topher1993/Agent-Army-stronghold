import { useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { ChangeRequest } from '../../shared/types';

export type WorkCardEditorProps = {
  onCreated?: (request: ChangeRequest) => void;
};

const DEFAULT_FORM = {
  workCardId: '',
  project: '',
  title: '',
  owner: 'Igris',
  qc: 'Tusk',
  risk: 'YELLOW' as 'GREEN' | 'YELLOW' | 'RED',
  status: 'in_progress' as 'ready' | 'in_progress' | 'blocked' | 'review' | 'complete',
  schedule: '',
  mode: '',
  rationale: '',
};

/**
 * Proposal form for a new work card. Submits a `changeRequest` with
 * `kind: 'workcard.create'` so the actual markdown write is gated by
 * the existing approval workflow. No direct file-system access from
 * the browser — this mirrors `TaskEditor.tsx` and `MissionEditor.tsx`.
 */
export function WorkCardEditor({ onCreated }: WorkCardEditorProps) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof typeof DEFAULT_FORM>(key: K, value: typeof DEFAULT_FORM[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (!form.workCardId.trim() || !form.project.trim() || !form.title.trim()) {
      setStatus('workCardId, project, and title are required');
      return;
    }
    setSubmitting(true);
    setStatus('');
    try {
      const payload = {
        workCardId: form.workCardId.trim(),
        project: form.project.trim(),
        title: form.title.trim(),
        owner: form.owner.trim(),
        qc: form.qc.trim(),
        risk: form.risk,
        status: form.status,
        ...(form.schedule.trim() ? { schedule: form.schedule.trim() } : {}),
        ...(form.mode.trim() ? { mode: form.mode.trim() } : {}),
        created: new Date().toISOString().slice(0, 10),
      };
      const request = await strongholdApi.createChangeRequest({
        kind: 'workcard.create',
        title: form.title.trim() || 'Untitled work card',
        rationale: form.rationale.trim() || 'Created from Stronghold UI',
        requestedBy: 'Chris',
        reviewers: ['Igris', 'Sentinel'],
        payload,
      });
      setStatus(`Created proposal ${request.id.slice(0, 8)} — awaiting approval`);
      setForm(DEFAULT_FORM);
      onCreated?.(request);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to create proposal');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="panel workCardEditor" aria-label="Work card proposal form">
      <h2>Work Card Proposal</h2>
      <p>Submit a new work card as a proposal — approval is required before the markdown is written to the work-cards directory.</p>
      <form className="controlForm" onSubmit={submit}>
        <label>Work card ID<input value={form.workCardId} onChange={event => update('workCardId', event.target.value)} placeholder="e.g. WC-44-3" required /></label>
        <label>Project<input value={form.project} onChange={event => update('project', event.target.value)} placeholder="e.g. japanese-tutor" required /></label>
        <label>Title<input value={form.title} onChange={event => update('title', event.target.value)} placeholder="e.g. Add telemetry wrapper" required /></label>
        <label>Owner<input value={form.owner} onChange={event => update('owner', event.target.value)} /></label>
        <label>QC<input value={form.qc} onChange={event => update('qc', event.target.value)} /></label>
        <label>Risk
          <select value={form.risk} onChange={event => update('risk', event.target.value as typeof DEFAULT_FORM.risk)}>
            <option value="GREEN">GREEN</option>
            <option value="YELLOW">YELLOW</option>
            <option value="RED">RED</option>
          </select>
        </label>
        <label>Status
          <select value={form.status} onChange={event => update('status', event.target.value as typeof DEFAULT_FORM.status)}>
            <option value="ready">ready</option>
            <option value="in_progress">in_progress</option>
            <option value="blocked">blocked</option>
            <option value="review">review</option>
            <option value="complete">complete</option>
          </select>
        </label>
        <label>Schedule (optional)<input value={form.schedule} onChange={event => update('schedule', event.target.value)} placeholder="e.g. Phase 45" /></label>
        <label>Mode (optional)<input value={form.mode} onChange={event => update('mode', event.target.value)} placeholder="e.g. tdd" /></label>
        <label>Rationale<textarea value={form.rationale} onChange={event => update('rationale', event.target.value)} placeholder="Why this card? Who owns it after approval?" /></label>
        <button type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Create work card proposal'}</button>
      </form>
      {status ? <p className="statusLine">{status}</p> : null}
    </section>
  );
}