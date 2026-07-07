import { useEffect, useState } from 'react';
import type { AgentArtifact, AgentRequest, AgentRun } from '../../shared/agentTypes';
import { ENGINEERING_DIVISION_ROSTER, PHASE3_DIVISION_EXECUTION_MODE } from '../../shared/divisions';
import { strongholdApi } from '../api/strongholdApi';
import { Form } from './Forms/Form';
import { FormField } from './Forms/FormField';
import { FormActions } from './Forms/FormActions';
import { useAnnounce } from './Shell/LiveRegionProvider';

export function AgentOrchestration({ killSwitch = 'inactive', onCreatedChangeRequest }: { killSwitch?: string; onCreatedChangeRequest?: () => void }) {
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [targetAgent, setTargetAgent] = useState('igris');
  const [kind, setKind] = useState('mission.plan');
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [artifacts, setArtifacts] = useState<AgentArtifact[]>([]);
  const [message, setMessage] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const announce = useAnnounce();

  async function load() {
    const [nextRequests, nextRuns, nextArtifacts] = await Promise.all([
      strongholdApi.listAgentRequests().catch(() => []),
      strongholdApi.listAgentRuns().catch(() => []),
      strongholdApi.listAgentArtifacts().catch(() => []),
    ]);
    setRequests(Array.isArray(nextRequests) ? nextRequests : []); setRuns(Array.isArray(nextRuns) ? nextRuns : []); setArtifacts(Array.isArray(nextArtifacts) ? nextArtifacts : []);
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) { setTitleError('Title is required'); announce('Validation failed: title'); return; }
    setTitleError(null);
    try {
      const request = await strongholdApi.createAgentRequest({ kind, title: title.trim() || 'Untitled agent request', prompt: prompt.trim() || 'Review current Stronghold state', requestedBy: 'Chris', targetAgent });
      setMessage(`Created agent request ${request.id.slice(0, 8)}`);
      setTitle(''); setPrompt(''); announce('Saved'); await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create agent request');
      announce('Action failed');
    }
  }

  async function requestAction(id: string, action: 'approve' | 'reject' | 'enqueue' | 'dispatch-mock' | 'cancel') {
    await strongholdApi.decideAgentRequest(id, action);
    setMessage(`${action} complete`);
    await load();
  }

  async function promote(id: string) {
    await strongholdApi.promoteArtifact(id);
    setMessage('Artifact promoted to approval queue');
    onCreatedChangeRequest?.();
    await load();
  }

  return <section className="panel guard"><p>Controlled agent requests create redacted artifacts only. Division targets are roster labels in <code>{PHASE3_DIVISION_EXECUTION_MODE}</code> mode; all dispatch remains mock-only and artifacts must become Phase 2 change requests before anything is applied.</p><Form onSubmit={submit}><FormField label="Agent request title" hint="What should the agent plan or review?" error={titleError}><input value={title} onChange={event => { setTitle(event.target.value); if (titleError) setTitleError(null); }} placeholder="Ask Igris to plan Phase 4" aria-invalid={!!titleError} /></FormField><FormField label="Target agent / division"><select value={targetAgent} onChange={event => setTargetAgent(event.target.value)}>{ENGINEERING_DIVISION_ROSTER.map(entry => <option value={entry.target} key={entry.target}>{entry.name} — {entry.role}</option>)}</select></FormField><FormField label="Request kind"><select value={kind} onChange={event => setKind(event.target.value)}><option value="mission.plan">mission.plan</option><option value="task.breakdown">task.breakdown</option><option value="code.review">code.review</option><option value="security.review">security.review</option><option value="architecture.proposal">architecture.proposal</option><option value="status.summary">status.summary</option></select></FormField><FormField label="Prompt" hint="Keep it bounded — planning/review only"><textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Bounded planning/review prompt" /></FormField><FormActions><button type="submit">Create agent request</button></FormActions></Form>{message && <p className="statusLine">{message}</p>}<div className="cards"><article className="agent"><h3>Agent Request Queue</h3>{requests.length === 0 ? <p className="muted">No agent requests yet</p> : <div className="list">{requests.map(request => <div key={request.id} className="mini"><strong>{request.title}</strong><p className="muted">{request.targetAgent} · {request.status}</p><div className="actions">{request.status === 'pending_review' && <button onClick={() => void requestAction(request.id, 'approve')}>Approve</button>}{request.status === 'approved' && <button onClick={() => void requestAction(request.id, 'enqueue')}>Enqueue</button>}{request.status === 'queued' && killSwitch === 'inactive' && <button onClick={() => void requestAction(request.id, 'dispatch-mock')}>Mock dispatch</button>}{request.status === 'queued' && killSwitch !== 'inactive' && <span className="muted">Kill switch active</span>}</div></div>)}</div>}</article><article className="agent"><h3>Agent Run Monitor</h3>{runs.length === 0 ? <p className="muted">No agent runs yet</p> : runs.slice(-5).map(run => <p key={run.id}>{run.targetAgent} · {run.wrapper} · {run.status}</p>)}</article><article className="agent"><h3>Artifact Review</h3>{artifacts.length === 0 ? <p className="muted">No artifacts yet</p> : artifacts.slice(-5).map(artifact => <div key={artifact.id} className="mini"><p>{artifact.kind} · {artifact.requiresHumanApply ? 'human apply required' : 'direct apply disabled'}</p><button onClick={() => void promote(artifact.id)}>Promote to change request</button></div>)}</article><article className="agent"><h3>Kill switch</h3><p>Status: {killSwitch}. Dispatch remains approval-gated and mock-only.</p></article></div></section>;
}
