import { useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { ChangeRequest } from '../../shared/types';

export function MissionEditor({ onCreated }: { onCreated?: (request: ChangeRequest) => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [specialists, setSpecialists] = useState('Atlas, Clix, Pulse');
  const [status, setStatus] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const request = await strongholdApi.createChangeRequest({
      kind: 'mission.create',
      title: title || 'Untitled mission',
      rationale: summary || 'Created from Stronghold UI',
      requestedBy: 'Chris',
      reviewers: ['Igris'],
      payload: { title, summary, owner: 'Igris', priority: 'medium', specialists: specialists.split(',').map(item => item.trim()).filter(Boolean) },
    });
    setStatus(`Created proposal ${request.id.slice(0, 8)}`);
    setTitle(''); setSummary('');
    onCreated?.(request);
  }

  return <section className="panel"><h2>Mission Proposal</h2><p>Create mission changes as proposals first; approval is required before apply.</p><form className="controlForm" onSubmit={submit}><label>Mission title<input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Build Phase 4 wrapper dispatch" /></label><label>Mission summary<textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="What should Igris coordinate?" /></label><label>Specialists<input value={specialists} onChange={event => setSpecialists(event.target.value)} /></label><button type="submit">Create mission proposal</button></form>{status && <p className="statusLine">{status}</p>}</section>;
}
