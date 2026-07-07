import { useState } from 'react';
import { strongholdApi } from '../api/strongholdApi';
import type { ChangeRequest } from '../../shared/types';
import { Form } from './Forms/Form';
import { FormField } from './Forms/FormField';
import { FormActions } from './Forms/FormActions';
import { useAnnounce } from './Shell/LiveRegionProvider';

export function MissionEditor({ onCreated }: { onCreated?: (request: ChangeRequest) => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [specialists, setSpecialists] = useState('Atlas, Clix, Pulse');
  const [status, setStatus] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const announce = useAnnounce();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setTitleError('Title is required'); announce('Validation failed: title'); return; }
    setTitleError(null);
    const request = await strongholdApi.createChangeRequest({
      kind: 'mission.create', title, rationale: summary || 'Created from Stronghold UI', requestedBy: 'Chris', reviewers: ['Igris'],
      payload: { title, summary, owner: 'Igris', priority: 'medium', specialists: specialists.split(',').map(item => item.trim()).filter(Boolean) },
    });
    setStatus(`Created proposal ${request.id.slice(0, 8)}`);
    setTitle(''); setSummary(''); announce('Saved'); onCreated?.(request);
  }

  return <section className="panel"><h2>Mission Proposal</h2><p>Create mission changes as proposals first; approval is required before apply.</p><Form onSubmit={submit}><FormField label="Mission title" hint="Short, imperative" error={titleError}><input value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Build Phase 4 wrapper dispatch" aria-invalid={!!titleError} /></FormField><FormField label="Mission summary"><textarea value={summary} onChange={event => setSummary(event.target.value)} placeholder="What should Igris coordinate?" /></FormField><FormField label="Specialists"><input value={specialists} onChange={event => setSpecialists(event.target.value)} /></FormField><FormActions><button type="submit">Create mission proposal</button></FormActions></Form>{status && <p className="statusLine">{status}</p>}</section>;
}
