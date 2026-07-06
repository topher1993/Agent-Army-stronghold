import { useState, type ReactNode } from 'react';
import * as React from 'react';
import type { StrongholdSnapshot } from '../types';
import { backendHealth } from '../api/strongholdApi';
import { orchestrationHealth } from '../api/agentApi';
import { SafetyBoundary } from './SafetyBoundary';
import { ApprovalQueue } from './ApprovalQueue';
import { AuditTrail } from './AuditTrail';
import { MissionEditor } from './MissionEditor';
import { TaskEditor } from './TaskEditor';
import { WorkCardEditor } from './WorkCardEditor';
import { AgentOrchestration } from './AgentOrchestration';
import { CronManager } from './CronManager';
import { Hero } from './Hero';
import { DashboardSubNav } from './DashboardSubNav';
import { AgenticOsDashboardPanel } from './AgenticOsDashboardPanel';
import { WorkCardBoard } from './WorkCardBoard';
import { MissionBoard } from './MissionBoard';

export type SurfaceDashboardProps = {
  snapshot: StrongholdSnapshot;
  onRefreshEverything: () => void;
  backendOk: boolean;
  killSwitch: string;
  onCreatedChangeRequest: () => void;
  onMobileNavigate?: () => void;
};

/**
 * Phase 47: Dashboard surface — Hero + sub-nav + Agentic OS + Memory + Coordination + Routing.
 * The Dashboard sub-nav stays for in-page jumps (different role from the
 * sidebar's between-pages nav).
 */
export function SurfaceDashboard({
  snapshot,
  onRefreshEverything,
  backendOk,
  killSwitch,
  onCreatedChangeRequest,
}: SurfaceDashboardProps) {
  const [refreshKey] = useState(0);

  return (
    <>
      <Hero id="section-hero" snapshot={snapshot} backendOk={backendOk} killSwitch={killSwitch} onRefresh={onRefreshEverything} />
      <DashboardSubNav />
      <section
        id="dashboard-section"
        className="surfaceContent"
        aria-label="Dashboard surface"
      >
        <AgenticOsDashboardPanel snapshot={snapshot} />
      </section>
    </>
  );
}

/**
 * Phase 47: Work surface — Work Card Board + footer + agentic context.
 */
export function SurfaceWork({ refreshMs = 60_000 }: { refreshMs?: number } = {}) {
  return (
    <section id="work-section" className="surfaceContent" aria-label="Work surface">
      <WorkCardBoard refreshMs={refreshMs} />
    </section>
  );
}

export function SurfaceMissions({ missions }: { missions: StrongholdSnapshot['missions'] }) {
  return (
    <section id="missions-section" className="surfaceContent" aria-label="Missions surface">
      <MissionBoard missions={missions} />
    </section>
  );
}

/**
 * Phase 47: Operations surface — Proposals + Audit + Orchestration + Safety + Operator Notes.
 * Approval Queue and Cron Manager are promoted to their own sidebar surfaces.
 */
export function SurfaceOperations({
  refreshKey,
  killSwitch,
  onCreatedChangeRequest,
}: {
  refreshKey: number;
  killSwitch: string;
  onCreatedChangeRequest: () => void;
}) {
  return (
    <section id="operations-section" className="surfaceContent" aria-label="Operations surface">
      <SafetyBoundaryWrapper />
      <Disclosure title="Mission Proposal"><MissionEditor onCreated={onCreatedChangeRequest} /></Disclosure>
      <Disclosure title="Task Proposal"><TaskEditor onCreated={onCreatedChangeRequest} /></Disclosure>
      <Disclosure title="Work Card Proposal"><WorkCardEditor onCreated={onCreatedChangeRequest} /></Disclosure>
      <Disclosure title="Audit Trail"><AuditTrail refreshKey={refreshKey} /></Disclosure>
      <Disclosure title="Phase 3 Agent Orchestration"><AgentOrchestration killSwitch={killSwitch} onCreatedChangeRequest={onCreatedChangeRequest} /></Disclosure>
      <Disclosure title="Safety & Readiness" defaultOpen><SafetyNote /></Disclosure>
      <Disclosure title="Operator Notes"><OperatorNotes /></Disclosure>
    </section>
  );
}

function SafetyBoundaryWrapper() {
  const [backendOk, setBackendOk] = useState(false);
  React.useEffect(() => {
    let cancelled = false;
    void backendHealth().then(r => { if (!cancelled) setBackendOk(r.ok); });
    void orchestrationHealth().then(r => { /* kill switch handled by parent */ });
    return () => { cancelled = true; };
  }, []);
  return <SafetyBoundary backendOk={backendOk} />;
}

function SafetyNote() {
  return (
    <section className="panel">
      <h2>Safety & Readiness</h2>
      <div className="lockbox"><strong>Phase 2/3 gate locked:</strong> profile edits, cron edits, real wrapper dispatch, and command execution controls are not exposed in Stronghold.</div>
    </section>
  );
}

function OperatorNotes() {
  return (
    <section className="panel">
      <h2>Operator Notes</h2>
      <ul className="notes">
        <li>The Dashboard is the default landing view — it surfaces live test/build/audit/cron numbers.</li>
        <li>Use the <strong>Work</strong> surface for the lane-grouped Work Card Board.</li>
        <li>Use <strong>Operations</strong> for guarded proposals, orchestration, audit, and safety state.</li>
        <li>Use <strong>Approvals</strong> to resolve pending change requests.</li>
        <li>Use <strong>Cron</strong> for scheduled-job management.</li>
        <li>Refresh data with the <strong>Refresh everything</strong> button in the header.</li>
      </ul>
    </section>
  );
}

export function SurfaceApprovals({ refreshKey }: { refreshKey: number }) {
  return (
    <section id="approvals-section" className="surfaceContent" aria-label="Approvals surface">
      <ApprovalQueue refreshKey={refreshKey} />
    </section>
  );
}

export function SurfaceCron({
  refreshKey,
  snapshotJobs,
}: {
  refreshKey: number;
  snapshotJobs: SurfaceDashboardProps['snapshot']['cronJobs'];
}) {
  return (
    <section id="cron-section" className="surfaceContent" aria-label="Cron surface">
      <CronManager snapshotJobs={snapshotJobs} refreshKey={refreshKey} />
    </section>
  );
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return <details className="uxDisclosure" open={defaultOpen}>
    <summary>{title}<span aria-hidden="true">▾</span></summary>
    <div className="uxDisclosureContent">{children}</div>
  </details>;
}