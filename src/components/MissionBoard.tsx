import { useMemo, useState } from 'react';
import type { Mission } from '../types';
import { Panel } from './Cards/Panel';
import { StatusPill, type StatusPillTone } from './Feedback/StatusPill';
import { EmptyState } from './Feedback/EmptyState';

const LANES: Mission['status'][] = ['planned', 'active', 'blocked', 'review', 'complete'];
const toneByStatus: Record<Mission['status'], StatusPillTone> = { planned: 'neutral', active: 'info', blocked: 'warning', review: 'accent', complete: 'success' };

export type MissionBoardProps = { missions: Mission[] };

export function MissionBoard({ missions }: MissionBoardProps) {
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState('');
  const owners = useMemo(() => Array.from(new Set(missions.map(m => m.owner))).sort(), [missions]);
  const filtered = useMemo(() => missions.filter(m => (!owner || m.owner === owner) && (!priority || m.priority === priority)), [missions, owner, priority]);
  const grouped = useMemo(() => Object.fromEntries(LANES.map(lane => [lane, filtered.filter(m => m.status === lane)])) as Record<Mission['status'], Mission[]>, [filtered]);
  const clearFilters = () => { setOwner(''); setPriority(''); };
  return <Panel title="Mission Board" as="section">
    <div className="workCardBoardFilters" role="group" aria-label="Mission filters">
      <label className="workCardBoardFilter"><span>Owner</span><select value={owner} onChange={event => setOwner(event.target.value)}><option value="">All owners</option>{owners.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="workCardBoardFilter"><span>Priority</span><select value={priority} onChange={event => setPriority(event.target.value)}><option value="">All priorities</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
      {(owner || priority) ? <button type="button" className="btn-secondary" onClick={clearFilters}>Clear filters</button> : null}
    </div>
    {missions.length === 0 ? <EmptyState title="No missions yet" description="Create a mission to start tracking work" /> : filtered.length === 0 ? <EmptyState title="No missions match" description="Try clearing the filters" action={{ label: 'Clear filters', onClick: clearFilters }} /> : <div className="lanes missionLanes">
      {LANES.map(lane => <div className="lane" key={lane} data-lane={lane}><h3>{lane}</h3>{grouped[lane].length === 0 ? <EmptyState title="Lane is empty" /> : grouped[lane].map(m => <Panel as="article" key={m.id} title={m.title} eyebrow={m.owner} actions={<StatusPill tone={toneByStatus[m.status]} label={m.status} />}><p>{m.summary}</p><small>{m.priority} · {m.specialists.length} specialists</small></Panel>)}</div>)}
    </div>}
  </Panel>;
}
