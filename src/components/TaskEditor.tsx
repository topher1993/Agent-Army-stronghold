import { useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { ChangeRequest } from '../../shared/types';

export function TaskEditor({ onCreated }: { onCreated?: (request: ChangeRequest) => void }) {
  const [missionId, setMissionId] = useState('phase-3-5');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('Clix');
  const [status, setStatus] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const request = await strongholdApi.createChangeRequest({
      kind: 'task.create',
      title: title || 'Untitled task',
      rationale: description || 'Created from Stronghold UI',
      requestedBy: 'Chris',
      reviewers: ['Igris', 'Pulse'],
      payload: { missionId, title, description, owner, priority: 'medium', specialists: [owner] },
    });
    setStatus(`Created proposal ${request.id.slice(0, 8)}`);
    setTitle(''); setDescription('');
    onCreated?.(request);
  }

  return <section className="panel"><h2>Task Proposal</h2><p>Create task changes as proposals first; approval is required before apply.</p><form className="controlForm" onSubmit={submit}><label>Task title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Build approval table" /></label><label>Mission ID<input value={missionId} onChange={event => setMissionId(event.target.value)} /></label><label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} /></label><label>Owner<input value={owner} onChange={event => setOwner(event.target.value)} /></label><button type="submit">Create task proposal</button></form>{status && <p className="statusLine">{status}</p>}</section>;
}
