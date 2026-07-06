import { useEffect, useMemo, useState } from 'react';
import { strongholdApi, type CronJobDetail, type CronJobSummaryApi, type CronJobCreateInput } from '../api/strongholdApi';
import { StatusPill } from './Feedback/StatusPill';
import { EmptyState } from './Feedback/EmptyState';
import { cronPreviewLabels, validateCronExpression } from '../lib/cronPreview';
import { useToast } from './Controls/Toast';

// FEATURE 2 — Cron Manager (right rail)
//
// Live view + CRUD surface for `hermes cron` jobs. The earlier
// `CronMonitor` was a static read-out fed by the snapshot collector; this
// component fetches the live list from /api/cron on every refresh and lets
// the operator pause/resume/edit/delete/create jobs with the same
// optimistic-with-toast pattern as the approval queue.
//
// Live data is preferred; when the backend is unreachable we fall back to
// the snapshot's cronJobs array so the right rail never goes blank — same
// fallback contract the rest of the dashboard uses.

type JobRow = CronJobSummaryApi & {
  // Local UI-only fields
  busy?: boolean;
};

export function CronManager({ snapshotJobs = [] as CronJobSummaryApi[], refreshKey = 0 }: { snapshotJobs?: CronJobSummaryApi[]; refreshKey?: number }) {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [editing, setEditing] = useState<CronJobDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    setError(null);
    try {
      const fresh = await strongholdApi.listCronJobs();
      const list = Array.isArray(fresh) ? fresh : [];
      // Hydrate from snapshot when the live list is empty but snapshot has
      // jobs (e.g. backend is offline). Snapshot shape is the same fields.
      if (list.length === 0 && snapshotJobs.length > 0) {
        setJobs(snapshotJobs.map(j => ({ ...j })));
        return;
      }
      setJobs(list);
    } catch (err) {
      // Fall back to snapshot copy.
      if (snapshotJobs.length > 0) {
        setJobs(snapshotJobs.map(j => ({ ...j })));
        setError(err instanceof Error ? err.message : 'live list unavailable');
      } else {
        setJobs([]);
        setError(err instanceof Error ? err.message : 'failed to load cron jobs');
      }
    }
  }
  useEffect(() => { void load(); }, [refreshKey]);

  const sorted = useMemo(
    () => [...jobs].sort((a, b) => a.name.localeCompare(b.name)),
    [jobs]
  );

  async function withBusy<T>(id: string, action: string, fn: () => Promise<T>) {
    setBusyId(id);
    setBusyAction(action);
    setError(null);
    setBanner(null);
    try {
      const result = await fn();
      setBanner(`${action} ok`);
      showToast({ tone: 'success', title: `${action} ok` });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : `${action} failed`;
      setError(message);
      showToast({ tone: 'danger', title: `${action} failed`, description: message });
      throw err;
    } finally {
      setBusyId(null);
      setBusyAction(null);
    }
  }

  async function pause(id: string) {
    await withBusy(id, 'pause', () => strongholdApi.pauseCronJob(id));
    await load();
  }
  async function resume(id: string) {
    await withBusy(id, 'resume', () => strongholdApi.resumeCronJob(id));
    await load();
  }
  async function remove(id: string) {
    await withBusy(id, 'delete', () => strongholdApi.deleteCronJob(id));
    await load();
  }
  async function editSave(payload: CronJobCreateInput, id?: string) {
    if (id) {
      await withBusy(id, 'update', () => strongholdApi.updateCronJob(id, payload));
    } else {
      await withBusy('new', 'create', () => strongholdApi.createCronJob(payload));
    }
    setEditing(null);
    setCreating(false);
    await load();
  }

  return (
    <section className="panel" data-cron-manager>
      <header className="cronManagerHeader">
        <h2>Cron / Schedule Manager</h2>
        <button type="button" className="btn-primary" data-cron-new onClick={() => setCreating(true)}>+ New</button>
      </header>
      <p>Live view of <code>hermes cron</code> jobs. Pause/resume, edit, and delete with confirm.</p>
      {banner && <div className="visuallyInlineStatus" data-cron-banner>{banner}</div>}
      {error && <div className="visuallyInlineStatus danger" role="alert" data-cron-error>{error}</div>}
      {sorted.length === 0 ? (
        <EmptyState title="No cron jobs" description="Schedule recurring work" action={{ label: 'New cron job', onClick: () => setCreating(true) }} />
      ) : (
        <div className="list">
          {sorted.map(job => {
            const isBusy = busyId === job.id;
            const isDeleting = deletingId === job.id;
            return (
              <article className="row cronRow" key={job.id} data-cron-id={job.id} data-cron-enabled={String(job.enabled)}>
                <div className="cronRowBody">
                  <strong>{job.name}</strong>
                  <p className="muted">{job.schedule}{job.profile ? ` · ${job.profile}` : ''}{job.deliver ? ` · deliver:${job.deliver}` : ''}</p>
                  <div className="cronMetaGrid"><StatusPill tone={job.enabled ? 'success' : 'neutral'} label={job.enabled ? 'enabled' : 'paused'} /><StatusPill tone={job.lastStatus === 'ok' || job.lastStatus === 'success' ? 'success' : job.lastStatus === 'failed' || job.lastStatus === 'error' ? 'danger' : job.lastStatus ? 'warning' : 'neutral'} label={job.lastStatus || 'never run'} />{job.nextRun ? <span className="muted">Last fired: {new Date(job.nextRun).toLocaleString()}</span> : <span className="muted">Last fired: —</span>}</div>
                  {job.promptSnippet && <p className="cronPromptSnippet muted">“{job.promptSnippet}”</p>}
                </div>
                <div className="actions cronActions">
                  <button
                    type="button"
                    onClick={() => void (job.enabled ? pause(job.id) : resume(job.id))}
                    disabled={isBusy}
                    data-cron-toggle={job.id}
                  >
                    {isBusy && busyAction === (job.enabled ? 'pause' : 'resume') ? `${job.enabled ? 'Pausing' : 'Resuming'}…` : (job.enabled ? 'Pause' : 'Resume')}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      try {
                        const detail = await strongholdApi.getCronJob(job.id);
                        setEditing(detail);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'failed to load job detail');
                      }
                    }}
                    disabled={isBusy}
                    data-cron-edit={job.id}
                  >Edit</button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setDeletingId(job.id)}
                    disabled={isBusy}
                    data-cron-delete-trigger={job.id}
                  >Delete</button>
                </div>
                {isDeleting && (
                  <div className="cronConfirmRow" data-cron-confirm={job.id}>
                    <span>Delete <strong>{job.name}</strong>? This cannot be undone.</span>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={async () => { try { await remove(job.id); setDeletingId(null); } catch { /* error already surfaced */ } }}
                      disabled={isBusy}
                      data-cron-delete-confirm={job.id}
                    >{isBusy && busyAction === 'delete' ? 'Deleting…' : 'Confirm delete'}</button>
                    <button type="button" className="btn-secondary" onClick={() => setDeletingId(null)} disabled={isBusy}>Cancel</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {(creating || editing) && (
        <CronJobForm
          mode={editing ? 'edit' : 'create'}
          initial={editing || undefined}
          onCancel={() => { setEditing(null); setCreating(false); }}
          onSubmit={(payload) => editSave(payload, editing?.id)}
          busy={busyId !== null}
        />
      )}
    </section>
  );
}

function CronJobForm({ mode, initial, onCancel, onSubmit, busy }: { mode: 'create' | 'edit'; initial?: CronJobDetail; onCancel: () => void; onSubmit: (payload: CronJobCreateInput) => void | Promise<void>; busy: boolean }) {
  const [name, setName] = useState(initial?.name || '');
  const [schedule, setSchedule] = useState(initial?.schedule || '');
  const [prompt, setPrompt] = useState(initial?.prompt || '');
  const [skills, setSkills] = useState((initial?.skills || []).join(', '));
  const [deliver, setDeliver] = useState(initial?.deliver || 'origin');
  const [enabled, setEnabled] = useState(initial?.enabled !== false);
  const [provider, setProvider] = useState(initial?.raw?.modelProvider as string || '');
  const [model, setModel] = useState(initial?.raw?.model as string || '');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const preview = useMemo(() => { try { return schedule.trim() ? cronPreviewLabels(schedule.trim(), new Date(), 3) : []; } catch { return []; } }, [schedule]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    const scheduleError = validateCronExpression(schedule.trim());
    const skillsError = skills.split(',').map(s => s.trim()).filter(Boolean).some(s => /\s/.test(s)) ? 'Skills must be comma-separated identifiers without spaces' : null;
    const modelError = (provider.trim() && !model.trim()) || (!provider.trim() && model.trim()) ? 'Provider and model must be paired' : null;
    const validationError = scheduleError || skillsError || modelError;
    if (validationError) { setValidation(validationError); setSubmitting(false); return; }
    setValidation(null);
    const payload: CronJobCreateInput = {
      name: name.trim(),
      schedule: schedule.trim(),
      prompt: prompt,
      enabled,
      deliver,
    };
    if (skills.trim()) payload.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    if (provider.trim() && model.trim()) payload.model = { provider: provider.trim(), model: model.trim() };
    try {
      await onSubmit(payload);
    } catch (submitErr) {
      setErr(submitErr instanceof Error ? submitErr.message : 'submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="cronJobForm" data-cron-form={mode} onSubmit={handleSubmit}>
      <h3>{mode === 'create' ? 'New cron job' : `Edit: ${initial?.name || ''}`}</h3>
      <label>Name (1-80 chars)<input type="text" value={name} required minLength={1} maxLength={80} onChange={e => setName(e.target.value)} data-cron-field="name" /></label>
      <label>Schedule (5 or 6-field cron)<input type="text" value={schedule} required placeholder="*/15 * * * *" onBlur={() => setValidation(validateCronExpression(schedule.trim()))} onChange={e => setSchedule(e.target.value)} data-cron-field="schedule" /></label>
      <label>Prompt (1-10000 chars)<textarea value={prompt} required minLength={1} maxLength={10000} onChange={e => setPrompt(e.target.value)} data-cron-field="prompt" rows={4} /></label>
      <label>Skills (comma-separated, must be allowlisted)<input type="text" value={skills} placeholder="jisho-phrase-verification, github-code-review" onChange={e => setSkills(e.target.value)} data-cron-field="skills" /></label>
      <label>Deliver
        <select value={deliver} onChange={e => setDeliver(e.target.value)} data-cron-field="deliver">
          <option value="origin">origin</option>
          <option value="local">local</option>
          <option value="all">all</option>
          <option value="platform:chat:thread">platform:chat:thread</option>
        </select>
      </label>
      <label className="cronInline">Enabled <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} data-cron-field="enabled" /></label>
      <fieldset className="cronModelFieldset">
        <legend>Model (optional)</legend>
        <label>Provider<input type="text" value={provider} placeholder="custom:anthropic-claude or openai" onChange={e => setProvider(e.target.value)} data-cron-field="model.provider" /></label>
        <label>Model<input type="text" value={model} placeholder="claude-sonnet-4" onChange={e => setModel(e.target.value)} data-cron-field="model.model" /></label>
      </fieldset>
      {preview.length > 0 ? <ol className="cronPreviewList" aria-label="Next 3 firings">{preview.map(item => <li key={item}>{item}</li>)}</ol> : null}
      {(validation || err) && <p className="visuallyInlineStatus danger" role="alert" data-cron-form-error>{validation || err}</p>}
      <div className="cronFormActions">
        <button type="submit" className="btn-primary" disabled={busy || submitting} data-cron-submit={mode}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create job' : 'Save changes'}
        </button>
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy || submitting}>Cancel</button>
      </div>
    </form>
  );
}
