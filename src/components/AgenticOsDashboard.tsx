import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ActivityEntry, QcRound, StrongholdSnapshot, WorkItem } from '../types';
import { ActivityGraphPanel } from './ActivityGraphPanel';
import { MemoryStatusPanel } from './MemoryStatusPanel';
import { DiscordCoordinationPanel } from './DiscordCoordinationPanel';
import { StatusBanner, type SystemHealth, type AlertCounts } from './StatusBanner';
import { AgentHierarchy, type AgentNodeData } from './AgentHierarchy';
import { ActiveMissions, type Mission } from './ActiveMissions';

export type AgenticOsCardStatus = 'placeholder' | 'live' | 'stale' | 'empty';

export type AgenticOsCard = {
  id: string;
  title: string;
  description: string;
  status: AgenticOsCardStatus;
  primary?: string;
  secondary?: string;
  bullets?: string[];
};

export type AgenticOsSection = {
  id: string;
  title: string;
  description: string;
  cards: AgenticOsCard[];
};

export type AgenticOsData = {
  generatedAt: string;
  source: 'live' | 'placeholder';
  sections: AgenticOsSection[];
};

export const AGENTIC_OS_PLACEHOLDER: AgenticOsData = {
  generatedAt: '',
  source: 'placeholder',
  sections: [
    {
      id: 'qc',
      title: 'QC Score History',
      description: 'Sentinel + Tusk verdicts over time.',
      cards: [
        { id: 'qc.recent', title: 'Recent QC rounds', description: 'Latest GPT-5.5 ratings and verdicts.', status: 'placeholder', primary: 'awaiting live wiring', bullets: ['round', 'score', 'verdict', 'reviewer'] },
        { id: 'qc.trend', title: 'Score trend', description: 'Sparkline of the last 7 days.', status: 'placeholder', primary: 'awaiting live wiring' },
      ],
    },
    {
      id: 'work',
      title: 'Open Work Items',
      description: 'Work card kanban for active P2/P3 follow-ups.',
      cards: [
        { id: 'work.items', title: 'Work card kanban', description: 'Open / in-progress / done columns.', status: 'placeholder', primary: 'awaiting live wiring', bullets: ['open', 'in progress', 'done'] },
      ],
    },
  ],
};

function fmtTimestamp(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

function shortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // 2026-06-27
  return d.toISOString().slice(0, 10);
}

export function buildAgenticOsData(snapshot: StrongholdSnapshot): AgenticOsData {
  const qcHistory = snapshot.qcHistory;
  const workItems = snapshot.workItems;
  const activity = snapshot.activity;

  const sections: AgenticOsSection[] = [
    {
      id: 'qc',
      title: 'QC Score History',
      description: 'Sentinel + Tusk verdicts over time.',
      cards: [
        {
          id: 'qc.recent',
          title: 'Recent QC rounds',
          description: 'Latest GPT-5.5 ratings and verdicts.',
          status: qcHistory.length === 0 ? 'placeholder' : 'live',
          primary: qcHistory.length === 0
            ? 'no QC rounds captured yet'
            : `latest ${qcHistory[0].subject} — ${qcHistory[0].score}/100 (${qcHistory[0].verdict})`,
          secondary: qcHistory.length === 0 ? 'awaiting live wiring' : `${qcHistory.length} rounds on file`,
          bullets: ['round', 'score', 'verdict', 'reviewer'],
        },
        {
          id: 'qc.trend',
          title: 'Score trend',
          description: 'Last 7 QC rounds, newest first.',
          status: qcHistory.length === 0 ? 'placeholder' : 'live',
          primary: qcHistory.length === 0
            ? 'awaiting live wiring'
            : qcHistory.map(r => `${r.score}`).slice(0, 7).join(' · '),
          secondary: qcHistory.length === 0 ? '' : `avg ${Math.round(qcHistory.reduce((s, r) => s + r.score, 0) / qcHistory.length)}/100`,
        },
      ],
    },
    {
      id: 'work',
      title: 'Open Work Items',
      description: 'Work card kanban for active P2/P3 follow-ups.',
      cards: [
        {
          id: 'work.items',
          title: 'Work card kanban',
          description: 'Open / in-progress / done columns.',
          status: workItems.length === 0 ? 'placeholder' : 'live',
          primary: workItems.length === 0
            ? 'awaiting live wiring'
            : `${workItems.length} items tracked`,
          secondary: workItems.length === 0 ? '' : workItems.slice(0, 3).map(w => w.title).join(' · '),
          bullets: ['open', 'in progress', 'done'],
        },
      ],
    },
    {
      id: 'activity',
      title: 'Activity',
      description: 'Latest specialist dispatches and outcomes.',
      cards: [
        {
          id: 'activity.feed',
          title: 'Activity feed',
          description: 'Latest specialist dispatches and outcomes.',
          status: activity.length === 0 ? 'placeholder' : 'live',
          primary: activity.length === 0
            ? 'awaiting live wiring'
            : `${activity.length} most-recent entries`,
          secondary: activity.length === 0
            ? ''
            : `${activity[0].actor} · ${activity[0].action} · ${fmtTimestamp(activity[0].timestamp)}${activity[0].reason ? ' · ' + activity[0].reason : ''}`,
          bullets: ['actor', 'action', 'target', 'timestamp'],
        },
      ],
    },
  ];

  return { generatedAt: snapshot.generatedAt, source: 'live', sections };
}

/**
 * Build the small set of "hero stats" that always appear at the top of the
 * dashboard regardless of whether the dashboard is rendered full-width or
 * squished inside the right rail. These are the four most important numbers
 * for an Engineering Division audience.
 */
export type AgenticOsHeroStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: AgenticOsCardStatus;
};

export function buildHeroStats(snapshot: StrongholdSnapshot): AgenticOsHeroStat[] {
  const tests = snapshot.health.tests;
  const build = snapshot.health.build;
  const qcHistory = snapshot.qcHistory;
  const auditEntries = snapshot.health.auditEntries;
  const cronJobs = snapshot.health.cronJobs;
  const latestQc = qcHistory[0];

  return [
    {
      id: 'hero.tests',
      label: 'TESTS',
      value: tests.tests > 0 ? String(tests.tests) : '—',
      detail: tests.tests > 0
        ? `${tests.failedTests ?? 0} failed · ${Math.round((tests.durationMs || 0) / 1000)}s · ${tests.files} files`
        : 'awaiting live wiring',
      status: tests.status === 'passed' ? 'live' : 'placeholder',
    },
    {
      id: 'hero.build',
      label: 'BUILD',
      value: build.bundleKb > 0 ? `${build.bundleKb} KB` : '—',
      detail: build.bundleKb > 0
        ? `${build.modules} modules · ${build.cssKb} KB CSS · ${build.durationMs ?? 0}ms`
        : 'awaiting live wiring',
      status: build.status === 'clean' ? 'live' : 'placeholder',
    },
    {
      id: 'hero.audit',
      label: 'AUDIT',
      value: String(auditEntries),
      detail: latestQc
        ? `${latestQc.subject} — ${latestQc.score}/100 (${latestQc.verdict})`
        : 'no QC rounds captured yet',
      status: latestQc ? 'live' : 'placeholder',
    },
    {
      id: 'hero.cron',
      label: 'CRON',
      value: String(cronJobs),
      detail: cronJobs > 0 ? `${cronJobs} jobs active` : 'no jobs',
      status: cronJobs > 0 ? 'live' : 'empty',
    },
  ];
}

/**
 * The sparkline derives its 7 points from the most recent QC history (newest
 * first per the brief). If there are fewer than 7 rounds, the array is padded
 * with the earliest known score so the polyline still has 7 visible points.
 */
export function buildSparklinePoints(qcHistory: QcRound[]): number[] {
  const scores = qcHistory.slice(0, 7).map(r => r.score);
  if (scores.length === 0) return [];
  while (scores.length < 7) scores.push(scores[scores.length - 1]);
  return scores.reverse(); // render oldest -> newest left-to-right
}

function renderSparkline(qcHistory: QcRound[]) {
  const scores = buildSparklinePoints(qcHistory);
  if (scores.length === 0) {
    return <p className="muted">awaiting live wiring</p>;
  }
  // Compact per the igris-compact-dashboard-brief: 240x40 instead of 280x60.
  const W = 240;
  const H = 40;
  const PAD = 4;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = Math.max(1, max - min);
  const step = scores.length > 1 ? (W - PAD * 2) / (scores.length - 1) : 0;
  const points = scores.map((s, i) => {
    const x = PAD + i * step;
    const y = H - PAD - ((s - min) / range) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const avg = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  return (
    <div className="agenticOsSparklineBlock" data-sparkline-points={scores.join(',')}>
      <svg
        className="agenticOsSparkline"
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`QC score sparkline, last 7 rounds: ${scores.join(', ')}`}
        data-sparkline="qc"
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <p className="agenticOsSparklineCaption">
        avg <strong>{avg}</strong>/100
      </p>
    </div>
  );
}

function statusPillFor(status: AgenticOsCardStatus | 'planned' | 'active' | 'blocked' | 'review' | 'complete', label?: string) {
  const text = label ?? status;
  return <span className={`status ${status}`}>{text}</span>;
}

function workItemCard(w: WorkItem, index: number) {
  const statusClass = (['active', 'review', 'planned', 'blocked', 'complete'].includes(w.status) ? w.status : 'placeholder') as
    | 'active' | 'review' | 'planned' | 'blocked' | 'complete' | 'placeholder';
  return (
    <article
      key={w.id || `wi-${index}`}
      className="agenticOsWorkCard"
      data-status={statusClass}
      data-work-id={w.id}
    >
      <div className="agenticOsWorkTop">
        <span className="agenticOsWorkBadge">{w.id}</span>
        {statusPillFor(statusClass, w.status)}
      </div>
      <h4 className="agenticOsWorkTitle">{w.title || 'untitled work item'}</h4>
      <div className="agenticOsWorkMeta">
        <span className="muted">{w.owner || 'unassigned'}</span>
        <time className="agenticOsMono" dateTime={w.modifiedAt || undefined}>{shortDate(w.modifiedAt)}</time>
      </div>
      {w.priority ? <p className="agenticOsWorkPriority">{w.priority}</p> : null}
    </article>
  );
}

function activityRow(a: ActivityEntry, index: number) {
  return (
    <tr key={`${a.timestamp}-${a.targetId}-${index}`} data-activity-row="true">
      <td className="agenticOsMono">{fmtTimestamp(a.timestamp)}</td>
      <td>{a.actor}</td>
      <td>{a.action}</td>
      <td className="agenticOsMono">{a.targetId}</td>
    </tr>
  );
}

export function AgenticOsDashboardPanel({ snapshot }: { snapshot?: StrongholdSnapshot | null } = {}): ReactNode {
  const hasLive = Boolean(
    snapshot
    && snapshot.health
    && snapshot.qcHistory
    && snapshot.workItems
    && snapshot.memory
    && snapshot.activity
  );

  const [data, setData] = useState<AgenticOsData>(
    hasLive ? buildAgenticOsData(snapshot as StrongholdSnapshot) : AGENTIC_OS_PLACEHOLDER
  );
  const [fetchedSnapshot, setFetchedSnapshot] = useState<StrongholdSnapshot | null>(
    hasLive ? (snapshot as StrongholdSnapshot) : null
  );

  useEffect(() => {
    if (hasLive) {
      setData(buildAgenticOsData(snapshot as StrongholdSnapshot));
      setFetchedSnapshot(snapshot as StrongholdSnapshot);
      return;
    }
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/stronghold-snapshot.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() as Promise<StrongholdSnapshot> : Promise.reject(new Error(`Snapshot unavailable: ${r.status}`)))
      .then((json) => {
        if (cancelled) return;
        setFetchedSnapshot(json);
        setData(buildAgenticOsData(json));
      })
      .catch(() => { if (!cancelled) setData(AGENTIC_OS_PLACEHOLDER); });
    return () => { cancelled = true; };
    // Re-run only when a snapshot is provided or its generatedAt changes.
    // This avoids object-identity churn from React's referential equality.
  }, [hasLive, snapshot?.generatedAt]);

  const live = fetchedSnapshot;

  const heroStats = useMemo<AgenticOsHeroStat[]>(
    () => live ? buildHeroStats(live) : buildHeroStats(emptySnapshotForHero()),
    [live]
  );

  // Per the igris-compact-dashboard-brief: 3 work cards, 5 activity rows max.
  const workItemsForCards = useMemo(() => (live?.workItems ?? []).slice(0, 3), [live]);
  const activityForTable = useMemo(() => (live?.activity ?? []).slice(0, 5), [live]);
  const qcForSparkline = useMemo(() => live?.qcHistory ?? [], [live]);

  const qcLatest = qcForSparkline[0];

  // Phase E2 — agent roster wired from snapshot (falls back to defaults).
  // Filter out the root (Belion) since it's already shown as the hierarchy root.
  const agentsForHierarchy: AgentNodeData[] = useMemo(() => {
    const rootId = 'belion';
    const roster = (live?.roster ?? []).filter((r) => {
      const id = r.name?.toLowerCase().replace(/\s+/g, '-');
      return id !== rootId;
    });
    const liveAgents = roster.slice(0, 6).map((r) => ({
      id: r.name?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
      name: r.name,
      role: r.role,
      status: (r.wrapperStatus?.available === false ? 'idle' : 'healthy') as AgentNodeData['status'],
    }));
    if (liveAgents.length >= 6) return liveAgents;
    // Fallback to the canonical 6-agent roster (Belion excluded since it's the root).
    return [
      { id: 'igris', name: 'Igris', role: 'Engineering', status: 'healthy' },
      { id: 'beru', name: 'Beru', role: 'Learning', status: 'healthy' },
      { id: 'greed', name: 'GREED', role: 'Financial', status: 'idle' },
      { id: 'kaisel', name: 'Kaisel', role: 'Tool Division', status: 'healthy' },
      { id: 'tusk', name: 'Tusk', role: 'QC', status: 'warning', busyLabel: '1 QC in flight' },
      { id: 'sensei', name: 'Sensei', role: 'Japanese Tutor', status: 'ai' },
    ];
  }, [live]);

  // Phase E2 — derive banner state from snapshot (defensive against partial data).
  const e2Health: SystemHealth = live
    && live.health?.tests?.status === 'pass'
    && live.health?.build?.status === 'pass'
    ? 'healthy' : 'warning';
  const e2Alerts: AlertCounts = useMemo(() => {
    const critical = qcForSparkline[0] && qcForSparkline[0].verdict?.toLowerCase().includes('fail') ? 1 : 0;
    const failed = live?.health?.tests?.failedTests ?? 0;
    const warning = failed > 0 ? failed : 0;
    const info = Math.min(99, activityForTable.length);
    return { critical, warning, info };
  }, [qcForSparkline, live?.health?.tests?.failedTests, activityForTable.length]);
  const e2AiOpsActive = agentsForHierarchy.filter(a => a.status !== 'idle').length;

  // Phase E2 — active missions derived from work items (open = active).
  const missionsForList: Mission[] = useMemo(() => {
    if (!workItemsForCards || workItemsForCards.length === 0) return [];
    return workItemsForCards.map((w, i) => ({
      id: w?.id || `mission-${i}`,
      name: w?.title || w?.id || `mission-${i}`,
      priority: w?.priority === 'P0' ? 'P0' : w?.priority === 'P1' ? 'P1' : w?.priority === 'P2' ? 'P2' : 'P3',
      assignedAgent: w?.owner,
      eta: w?.modifiedAt ? shortDate(w.modifiedAt) : undefined,
    }));
  }, [workItemsForCards]);

  return (
    <section className="panel wide agenticOsPanel" aria-label="Agentic OS dashboard" data-agentic-os-panel>
      {/* Phase E2 — Layer 0: Status Banner (always visible, full-width) */}
      <StatusBanner
        health={e2Health}
        alerts={e2Alerts}
        aiOpsActive={e2AiOpsActive}
        onOpenAlertCenter={() => { /* wired in sub-PR 2 */ }}
        onActivateKillSwitch={() => { /* wired in sub-PR 2 */ }}
      />

      {/* Phase E2 — Layer 1: Agent Hierarchy + Active Missions side by side */}
      <div className="layer1Grid" data-section="layer1">
        <AgentHierarchy agents={agentsForHierarchy} />
        <ActiveMissions missions={missionsForList} />
      </div>

      <header className="agenticOsHeader">
        <div className="agenticOsHeaderTitle">
          <h2>Agentic OS Dashboard</h2>
          <p className="subtitle">
            {data.source === 'live'
              ? `Live · generated ${fmtTimestamp(data.generatedAt)}`
              : 'Live data wiring deferred · static placeholder'}
          </p>
        </div>
        <div className="agenticOsHeaderActions">
          {data.source === 'live'
            ? <span className="status live">LIVE</span>
            : <span className="status placeholder">PLACEHOLDER</span>}
          <button type="button" className="agenticOsRecheck" onClick={() => { window.location.reload(); }}>Recheck</button>
        </div>
      </header>

      {/* Hero stats row: 4 equal cards across the full width */}
      <section className="agenticOsHeroRow" aria-label="Hero stats">
        {heroStats.map(stat => (
          <article
            key={stat.id}
            className="agenticOsHeroStat"
            data-status={stat.status}
            data-hero-id={stat.id}
          >
            <span className="agenticOsHeroLabel">{stat.label}</span>
            <strong className="agenticOsHeroValue">{stat.value}</strong>
            <p className="agenticOsHeroDetail">{stat.detail}</p>
          </article>
        ))}
      </section>

      {/* QC Score History: full width with compact sparkline */}
      <section className="agenticOsSection agenticOsQcSection" aria-label="QC score history" data-section="qc-history">
        <header className="agenticOsSectionHeader">
          <h3>QC Score History</h3>
        </header>
        <div className="agenticOsQcPanel">
          <div className="agenticOsQcRecent">
            {qcLatest
              ? <p className="agenticOsQcRecentLine">
                  {qcLatest.subject} — <span className="agenticOsHeroValueInline">{qcLatest.score}/100</span>
                  {' '}<span className="status live" data-qc-verdict>{qcLatest.verdict}</span>
                </p>
              : <p className="muted">no QC rounds captured yet</p>}
          </div>
          <div className="agenticOsQcSparklineWrap">
            {renderSparkline(qcForSparkline)}
          </div>
        </div>
      </section>

      {/* Work Items (3 cards) + Activity (5 rows) side-by-side */}
      <div className="agenticOsTwoCol">
        {/* Open Work Items: 3 separate cards */}
        <section className="agenticOsSection" aria-label="Open work items" data-section="work-items">
          <header className="agenticOsSectionHeader">
            <h3>Open Work Items</h3>
          </header>
          <div className="agenticOsWorkGrid">
            {workItemsForCards.length > 0
              ? workItemsForCards.map((w, i) => workItemCard(w, i))
              : (
                <>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <article key={`placeholder-wi-${i}`} className="agenticOsWorkCard" data-status="placeholder">
                      <div className="agenticOsWorkTop">
                        <span className="agenticOsWorkBadge">WI-00{i + 1}</span>
                        <span className="status placeholder">placeholder</span>
                      </div>
                      <h4 className="agenticOsWorkTitle">awaiting live wiring</h4>
                      <div className="agenticOsWorkMeta">
                        <span className="muted">—</span>
                        <time className="agenticOsMono">—</time>
                      </div>
                    </article>
                  ))}
                </>
              )}
          </div>
        </section>

        {/* Activity table: When / Actor / Action / Target (4 columns, 5 rows max) */}
        <section className="agenticOsSection" aria-label="Recent activity" data-section="activity">
          <header className="agenticOsSectionHeader">
            <h3>Activity</h3>
          </header>
          <div className="agenticOsTableWrap">
            <table className="agenticOsTable" data-activity-table="true">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Actor</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                </tr>
              </thead>
              <tbody>
                {activityForTable.length > 0
                  ? activityForTable.map((a, i) => activityRow(a, i))
                  : (
                    <tr data-activity-placeholder="true">
                      <td colSpan={4} className="muted">no recent activity</td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Discord #agent-army coordination panel (Phase D1).
          Self-contained read-only feed; polls every 60s, pausable. */}
      <DiscordCoordinationPanel />

      {/* Routing Flow — Phase D4 activity graph (read-only).
          Polls /api/activity-graph every 60s and renders the hand-off graph
          as a pure SVG with three rows of nodes (Belion top, Igris middle,
          specialists bottom) and pulse-animated edges for active routes. */}
      <ActivityGraphPanel />
      <MemoryStatusPanel />
    </section>
  );
}

function emptySnapshotForHero(): StrongholdSnapshot {
  return {
    generatedAt: '',
    phase: '',
    readOnly: true,
    owner: '',
    coordinator: '',
    dataSources: {},
    counts: { agents: 0, profiles: 0, wrappersAvailable: 0, skills: 0, cronJobs: 0, missions: 0, blockedMissions: 0 },
    roster: [],
    profiles: [],
    wrappers: [],
    cronJobs: [],
    missions: [],
    safetyFindings: [],
    health: {
      tests: { status: 'unknown', files: 0, tests: 0, durationMs: 0, note: '' },
      build: { status: 'unknown', bundleKb: 0, cssKb: 0, modules: 0, note: '' },
      auditEntries: 0,
      cronJobs: 0,
      tunnel: { publicHost: '127.0.0.1:5174', note: '' },
    },
    qcHistory: [],
    workItems: [],
    memory: { files: [], skills: [], totalSkills: 0 },
    activity: [],
  };
}
