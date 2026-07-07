import { useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { ChangeRequest } from '../../shared/types';
import { Form } from './Forms/Form';
import { FormField } from './Forms/FormField';
import { FormActions } from './Forms/FormActions';
import { useAnnounce } from './Shell/LiveRegionProvider';

export function TaskEditor({ onCreated }: { onCreated?: (request: ChangeRequest) => void }) {
  const [missionId, setMissionId] = useState('phase-3-5');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('Clix');
  const [status, setStatus] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const announce = useAnnounce();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setTitleError('Title is required'); announce('Validation failed: title'); return; }
    setTitleError(null);
    const request = await strongholdApi.createChangeRequest({ kind: 'task.create', title, rationale: description || 'Created from Stronghold UI', requestedBy: 'Chris', reviewers: ['Igris', 'Pulse'], payload: { missionId, title, description, owner, priority: 'medium', specialists: [owner] } });
    setStatus(`Created proposal ${request.id.slice(0, 8)}`);
    setTitle(''); setDescription(''); announce('Saved'); onCreated?.(request);
  }

  return <section className="panel"><h2>Task Proposal</h2><p>Create task changes as proposals first; approval is required before apply.</p><Form onSubmit={submit}><FormField label="Task title" hint="Short, imperative" error={titleError}><input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Build approval table" aria-invalid={!!titleError} /></FormField><FormField label="Mission ID"><input value={missionId} onChange={event => setMissionId(event.target.value)} /></FormField><FormField label="Description"><textarea value={description} onChange={event => setDescription(event.target.value)} /></FormField><FormField label="Owner"><input value={owner} onChange={event => setOwner(event.target.value)} /></FormField><FormActions><button type="submit">Create task proposal</button></FormActions></Form>{status && <p className="statusLine">{status}</p>}</section>;
}
