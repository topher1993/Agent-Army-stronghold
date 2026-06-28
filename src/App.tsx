import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadSnapshot } from './data';
import type { Mission, StrongholdSnapshot } from './types';
import { backendHealth } from './api/strongholdApi';
import { SafetyBoundary } from './components/SafetyBoundary';
import { ApprovalQueue } from './components/ApprovalQueue';
import { AuditTrail } from './components/AuditTrail';
import { MissionEditor } from './components/MissionEditor';
import { TaskEditor } from './components/TaskEditor';
import { AgentOrchestration } from './components/AgentOrchestration';
import { AgenticOsDashboardPanel } from './components/AgenticOsDashboard';
import { orchestrationHealth } from './api/agentApi';
import { CronManager } from './components/CronManager';

const lanes: Mission['status'][] = ['planned', 'active', 'blocked', 'review', 'complete'];

/**
 * Two top-level tabs for Stronghold:
 *  - `dashboard` (default) — Agentic OS Dashboard rendered full width.
 *  - `operations`          — proposals, orchestration, mission board, safety.
 */
type TabId = 'dashboard' | 'operations';
const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'operations', label: 'Operations' },
];

export function App() {
  const [snapshot, setSnapshot] = useState<StrongholdSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState(false);
  const [killSwitch, setKillSwitch] = useState('unknown');
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

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
  const operationsActive = activeTab === 'operations';

  return (
    <main className="commandShell">
      <Hero snapshot={snapshot} backendOk={backendOk} killSwitch={killSwitch} />
      <nav className="mobileTabNav" aria-label="Stronghold sections">
        {tabs.map(tab => <button
          type="button"
          key={tab.id}
          className={activeTab === tab.id ? 'active' : ''}
          aria-selected={activeTab === tab.id}
          aria-controls={`${tab.id}-section`}
          onClick={() => setActiveTab(tab.id)}
        >{tab.label}</button>)}
      </nav>
      {/*
        The Agentic OS Dashboard is the default main view. The commandGrid
        is now a 2-column layout on desktop: [main | right rail]. On mobile
        we render Dashboard or Operations as the active section and hide
        the rest.
      */}
      <div className={`commandGrid active-${activeTab}`}>
        <section
          id="dashboard-section"
          className="mobileSection mobileDashboard"
          aria-label="Agentic OS dashboard"
          aria-hidden={operationsActive}
        >
          <AgenticOsDashboardPanel snapshot={snapshot} />
        </section>

        <aside
          className="sidePanel rightRail"
          aria-label="Approvals, audit, and operations monitoring"
          aria-hidden={operationsActive}
        >
          <Disclosure title="Approval Queue" defaultOpen><ApprovalQueue refreshKey={refreshKey} /></Disclosure>
          <Disclosure title="Audit Trail"><AuditTrail refreshKey={refreshKey} /></Disclosure>
          <Disclosure title="Cron / Schedule Manager" defaultOpen><CronManager snapshotJobs={snapshot.cronJobs} refreshKey={refreshKey} /></Disclosure>
        </aside>

        <section
                  id="operations-section"
                  className="mobileSection mobileOperations"
                  aria-label="Operations: proposals, orchestration, mission board, and safety"
                  aria-hidden={!operationsActive}
                >
                  <SafetyBoundary backendOk={backendOk} />
                  <Disclosure title="Mission Proposal"><MissionEditor onCreated={refreshApprovals} /></Disclosure>
                  <Disclosure title="Task Proposal"><TaskEditor onCreated={refreshApprovals} /></Disclosure>
                  <Disclosure title="Phase 3 Agent Orchestration"><AgentOrchestration killSwitch={killSwitch} onCreatedChangeRequest={refreshApprovals} /></Disclosure>
                  <MissionBoard missions={snapshot.missions} />
                  <Disclosure title="Safety & Readiness" defaultOpen><Safety snapshot={snapshot} /></Disclosure>
                  <Disclosure title="Operator Notes"><OperatorNotes snapshot={snapshot} /></Disclosure>
                </section>
      </div>
    </main>
  );
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="uxDisclosure" open={defaultOpen}>
    <summary>{title}<span aria-hidden="true">▾</span></summary>
    <div className="uxDisclosureContent">{children}</div>
  </details>;
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

function Safety({ snapshot }: { snapshot: StrongholdSnapshot }) {
  return <section className="panel"><h2>Safety & Readiness</h2>{snapshot.safetyFindings.map(finding => <article className={`finding ${finding.level}`} key={finding.id}>
    <h3>{finding.title}</h3><p>{finding.detail}</p>
  </article>)}<div className="lockbox"><strong>Phase 2/3 gate locked:</strong> profile edits, cron edits, real wrapper dispatch, and command execution controls are not exposed in Stronghold.</div></section>;
}

function MissionBoard({ missions }: { missions: Mission[] }) {
  const grouped = useMemo(() => Object.fromEntries(lanes.map(lane => [lane, missions.filter(m => m.status === lane)])) as Record<Mission['status'], Mission[]>, [missions]);
  return <section className="panel wide"><h2>Mission Board</h2><div className="lanes">{lanes.map(lane => <div className="lane" key={lane}><h3>{lane}</h3>{grouped[lane].map(m => <details className="mission missionDisclosure" key={m.id}>
    <summary><strong>{m.title}</strong><span aria-hidden="true">▾</span></summary><p>{m.summary}</p><small>{m.owner} · {m.priority} · {m.specialists.join(', ')}</small>
  </details>)}</div>)}</div></section>;
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'status ok' : 'status warn'}>{label}</span>;
}

function OperatorNotes({ snapshot }: { snapshot: StrongholdSnapshot }) {
  return <section className="panel"><h2>Operator Notes</h2><ul className="notes">
    <li>The Agentic OS Dashboard is the default landing view — it surfaces live test/build/audit/cron numbers.</li>
    <li>Use the <strong>Operations</strong> tab for guarded proposals, mock orchestration, mission board, and safety state.</li>
    <li>Refresh data with <code>npm run snapshot</code>.</li>
    <li>Data source labels are sanitized: {Object.values(snapshot.dataSources).join(' · ')}</li>
  </ul></section>;
}