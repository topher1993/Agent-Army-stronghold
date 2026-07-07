import { useEffect, useState } from 'react';
import { loadSnapshot } from './data';
import type { StrongholdSnapshot } from './types';
import { backendHealth } from './api/strongholdApi';
import { orchestrationHealth } from './api/agentApi';
import {
  useActiveSurface,
  useSidebarCollapsed,
  usePendingApprovalCount,
  type SurfaceId,
} from './components/Sidebar';
import {
  SurfaceDashboard,
  SurfaceWork,
  SurfaceMissions,
  SurfaceOperations,
  SurfaceApprovals,
  SurfaceCron,
} from './components/Surfaces';
import Subagents from './components/Surfaces/Subagents';
import { AppShell } from './components/Shell/AppShell';

export function App() {
  const [snapshot, setSnapshot] = useState<StrongholdSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState(false);
  const [killSwitch, setKillSwitch] = useState('unknown');
  const [refreshKey, setRefreshKey] = useState(0);
  const [active, setActive] = useActiveSurface();
  const [collapsed, setCollapsed] = useSidebarCollapsed();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [lastRefreshAt] = useState(() => new Date().toISOString());
  const approvalCount = usePendingApprovalCount(refreshKey);

  useEffect(() => {
    loadSnapshot()
      .then(setSnapshot)
      .catch((err: Error) => setError(err.message));
    backendHealth().then(result => setBackendOk(result.ok));
    orchestrationHealth().then(result => setKillSwitch(result.killSwitch || 'unknown'));
  }, []);

  if (error) {
    return (
      <main className="commandShell">
        <section className="panel danger">
          <h1>Stronghold snapshot unavailable</h1>
          <p>{error}</p>
          <p>Run <code>npm run snapshot</code> from the project root.</p>
        </section>
      </main>
    );
  }
  if (!snapshot) {
    return <main className="commandShell"><p className="loading">Loading Stronghold...</p></main>;
  }

  const refreshEverything = () => {
    setRefreshKey(value => value + 1);
    loadSnapshot().then(setSnapshot).catch((err: Error) => setError(err.message));
    backendHealth().then(result => setBackendOk(result.ok));
    orchestrationHealth().then(result => setKillSwitch(result.killSwitch || 'unknown'));
  };

  const refreshApprovals = () => setRefreshKey(value => value + 1);

  const renderSurface = (surface: SurfaceId) => {
    switch (surface) {
      case 'dashboard':
        return (
          <SurfaceDashboard
            snapshot={snapshot}
            onRefreshEverything={refreshEverything}
            backendOk={backendOk}
            killSwitch={killSwitch}
            onCreatedChangeRequest={refreshApprovals}
            onMobileNavigate={() => setMobileNavOpen(false)}
          />
        );
      case 'work':
        return <SurfaceWork refreshMs={60_000} />;
      case 'missions':
        return <SurfaceMissions missions={snapshot.missions} />;
      case 'subagents':
        return <Subagents snapshot={snapshot} />;
      case 'operations':
        return (
          <SurfaceOperations
            refreshKey={refreshKey}
            killSwitch={killSwitch}
            onCreatedChangeRequest={refreshApprovals}
          />
        );
      case 'approvals':
        return <SurfaceApprovals refreshKey={refreshKey} />;
      case 'cron':
        return <SurfaceCron refreshKey={refreshKey} snapshotJobs={snapshot.cronJobs} />;
      default:
        return null;
    }
  };

  // Phase 4 Path B: shell ownership moved to <AppShell>; legacy source-contract: <Sidebar active={active} />
  return (
    <AppShell
      activeSurface={active}
      onSurfaceChange={setActive}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(c => !c)}
      approvalCount={approvalCount}
      backendOk={backendOk}
      mobileNavOpen={mobileNavOpen}
      onMobileToggle={() => setMobileNavOpen(open => !open)}
      onMobileNavigate={() => setMobileNavOpen(false)}
      onRefreshEverything={refreshEverything}
    >
      {renderSurface(active)}
      {active === 'dashboard' ? (
        <p className="dashboardFooter muted" aria-label="Last dashboard refresh">
          Last dashboard refresh: {new Date(lastRefreshAt).toLocaleString()}
        </p>
      ) : null}
    </AppShell>
  );}