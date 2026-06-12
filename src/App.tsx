import { useEffect, useMemo, useState } from 'react';
import { loadSnapshot } from './data';
import type { CronJobSummary, Mission, StrongholdSnapshot } from './types';
import { backendHealth } from './api/strongholdApi';
import { SafetyBoundary } from './components/SafetyBoundary';
import { ApprovalQueue } from './components/ApprovalQueue';
import { AuditTrail } from './components/AuditTrail';
import { MissionEditor } from './components/MissionEditor';
import { TaskEditor } from './components/TaskEditor';
import { AgentOrchestration } from './components/AgentOrchestration';
import { orchestrationHealth } from './api/agentApi';

const lanes: Mission['status'][] = ['planned', 'active', 'blocked', 'review', 'complete'];

export function App() {
  const [snapshot, setSnapshot] = useState<StrongholdSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState(false);
  const [killSwitch, setKillSwitch] = useState('unknown');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadSnapshot().then(setSnapshot).catch((err: Error) => setError(err.message));
    backendHealth().then(result => setBackendOk(result.ok));
    orchestrationHealth().then(result => setKillSwitch(result.killSwitch || 'unknown'));
  }, []);

  if (error) {
    return <main className="commandShell"><section className="panel danger"><h1>Stronghold snapshot unavailable</h1><p>{error}</p><p>Run <code>npm run snapshot</code> from the project root.</p></section></main>;
  }
  if (!snapshot) return <main className="commandShell"><p className="loading">Loading Stronghold...</p></main>;

  const refreshApprovals = () => setRefreshKey(value => value + 1);

  return (
    <main className="commandShell">
      <Hero snapshot={snapshot} backendOk={backendOk} killSwitch={killSwitch} />
      <div className="commandGrid">
        <aside className="sidePanel leftRail" aria-label="Stronghold context">
          <Overview snapshot={snapshot} />
          <Roster snapshot={snapshot} />
          <Inventory snapshot={snapshot} />
        </aside>
        <section className="centerDeck" aria-label="Primary command workflows">
          <SafetyBoundary backendOk={backendOk} />
          <AgentOrchestration killSwitch={killSwitch} onCreatedChangeRequest={refreshApprovals} />
          <section className="proposalGrid" aria-label="Mission and task proposal workspace">
            <MissionEditor onCreated={refreshApprovals} />
            <TaskEditor onCreated={refreshApprovals} />
          </section>
          <MissionBoard missions={snapshot.missions} />
        </section>
        <aside className="sidePanel rightRail" aria-label="Approvals, audit, and safety monitoring">
          <ApprovalQueue refreshKey={refreshKey} />
          <AuditTrail refreshKey={refreshKey} />
          <CronMonitor jobs={snapshot.cronJobs} />
          <Safety snapshot={snapshot} />
          <OperatorNotes snapshot={snapshot} />
        </aside>
      </div>
    </main>
  );
}

function Hero({ snapshot, backendOk, killSwitch }: { snapshot: StrongholdSnapshot; backendOk: boolean; killSwitch: string }) {
  return <header className="hero commandHeader">
    <div>
      <p className="eyebrow">Engineering Division Stronghold</p>
      <h1>Agent-Army Mission Control</h1>
      <p className="subtitle">Igris-owned Stronghold cockpit for visibility, guarded proposals, approval workflows, and safe mock agent orchestration.</p>
    </div>
    <div className="readOnlyBadge">GUARDED<br /><span>Approvals · Artifacts · No shell</span></div>
    <dl className="meta">
      <div><dt>Owner</dt><dd>{snapshot.owner}</dd></div>
      <div><dt>Coordinator</dt><dd>{snapshot.coordinator}</dd></div>
      <div><dt>Backend</dt><dd>{backendOk ? 'connected' : 'offline fallback'}</dd></div>
      <div><dt>Kill Switch</dt><dd>{killSwitch}</dd></div>
      <div><dt>Generated</dt><dd>{new Date(snapshot.generatedAt).toLocaleString()}</dd></div>
    </dl>
  </header>;
}

function Overview({ snapshot }: { snapshot: StrongholdSnapshot }) {
  const cards = [
    ['Agents', snapshot.counts.agents],
    ['Profiles', snapshot.counts.profiles],
    ['Wrappers Ready', snapshot.counts.wrappersAvailable],
    ['Skills Indexed', snapshot.counts.skills],
    ['Cron Jobs', snapshot.counts.cronJobs],
    ['Missions', snapshot.counts.missions],
  ];
  return <section className="panel telemetryPanel"><h2>Stronghold Telemetry</h2><div className="stats">{cards.map(([label, value]) => <article className="stat" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div></section>;
}

function Roster({ snapshot }: { snapshot: StrongholdSnapshot }) {
  return <section className="panel"><h2>Engineering Division Roster</h2><div className="cards rosterCards">{snapshot.roster.map(agent => <article className="agent" key={agent.name}>
    <div className="agentTop"><h3>{agent.name}</h3><Status ok={agent.wrapperStatus.available} label={agent.wrapperStatus.available ? 'wrapper ready' : 'wrapper missing'} /></div>
    <p className="role">{agent.role}</p>
    <p className="reports">Reports to {agent.reportsTo} · <code>{agent.wrapper}</code></p>
    <ul>{agent.responsibilities.map(item => <li key={item}>{item}</li>)}</ul>
  </article>)}</div></section>;
}

function Safety({ snapshot }: { snapshot: StrongholdSnapshot }) {
  return <section className="panel"><h2>Safety & Readiness</h2>{snapshot.safetyFindings.map(finding => <article className={`finding ${finding.level}`} key={finding.id}>
    <h3>{finding.title}</h3><p>{finding.detail}</p>
  </article>)}<div className="lockbox"><strong>Phase 2/3 gate locked:</strong> profile edits, cron edits, real wrapper dispatch, and command execution controls are not exposed in Stronghold.</div></section>;
}

function MissionBoard({ missions }: { missions: Mission[] }) {
  const grouped = useMemo(() => Object.fromEntries(lanes.map(lane => [lane, missions.filter(m => m.status === lane)])) as Record<Mission['status'], Mission[]>, [missions]);
  return <section className="panel wide"><h2>Mission Board</h2><div className="lanes">{lanes.map(lane => <div className="lane" key={lane}><h3>{lane}</h3>{grouped[lane].map(m => <article className="mission" key={m.id}>
    <strong>{m.title}</strong><p>{m.summary}</p><small>{m.owner} · {m.priority} · {m.specialists.join(', ')}</small>
  </article>)}</div>)}</div></section>;
}

function CronMonitor({ jobs }: { jobs: CronJobSummary[] }) {
  return <section className="panel"><h2>Cron / Schedule Monitor</h2><div className="list">{jobs.slice(0, 12).map(job => <article className="row" key={job.id}>
    <div><strong>{job.name}</strong><p>{job.profile} · {job.schedule}</p><small>{job.safety}</small></div><Status ok={job.enabled} label={job.enabled ? 'enabled' : 'paused'} />
  </article>)}</div>{jobs.length > 12 && <p className="muted">Showing 12 of {jobs.length} jobs.</p>}</section>;
}

function Inventory({ snapshot }: { snapshot: StrongholdSnapshot }) {
  return <section className="panel inventoryPanel"><h2>Agent Army Inventory</h2><div className="profileGrid">{snapshot.profiles.map(profile => <article className="profile" key={profile.name}>
    <h3>{profile.name}</h3><p><code>{profile.pathLabel}</code></p><p>{profile.skillCount} skills indexed · cron dir {profile.hasCronDir ? 'present' : 'not present'}</p>
    <div className="chips">{profile.skills.slice(0, 5).map(skill => <span title={skill.description} key={skill.name}>{skill.name}</span>)}</div>
  </article>)}</div></section>;
}

function OperatorNotes({ snapshot }: { snapshot: StrongholdSnapshot }) {
  return <section className="panel"><h2>Operator Notes</h2><ul className="notes">
    <li>Use the center deck for guarded proposals and mock orchestration.</li>
    <li>Use the right panel for approvals, audit, cron monitoring, and safety state.</li>
    <li>Refresh data with <code>npm run snapshot</code>.</li>
    <li>Data source labels are sanitized: {Object.values(snapshot.dataSources).join(' · ')}</li>
  </ul></section>;
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'status ok' : 'status warn'}>{label}</span>;
}
