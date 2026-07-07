import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ActivityEntry, QcRound, StrongholdSnapshot } from '../types';
import { isWorkCardStatus } from '../types';
import { ActivityGraphPanel } from './ActivityGraphPanel';
import { MemoryStatusPanel } from './MemoryStatusPanel';
import { DiscordCoordinationPanel } from './DiscordCoordinationPanel';
import { AgenticOsCard as AgenticOsPrimitiveCard } from './Cards/AgenticOsCard';
import { Panel } from './Cards/Panel';
import { Stat } from './Cards/Stat';
import { WorkCard } from './Cards/WorkCard';
import { EmptyState } from './Feedback/EmptyState';
import { StatusPill } from './Feedback/StatusPill';
import { ThemeToggle } from './ThemeToggle';

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
        { id: 'qc.recent', title: 'Recent QC rounds', description: 'Latest GPT-5.5 ratings and verdicts.', status: 'placeholder', primary: 'awaiting first run', bullets: ['round', 'score', 'verdict', 'reviewer'] },
        { id: 'qc.trend', title: 'Score trend', description: 'Sparkline of the last 7 days.', status: 'placeholder', primary: 'awaiting first run' },
      ],
    },
    {
      id: 'work',
      title: 'Open Work Items',
      description: 'Work card kanban for active P2/P3 follow-ups.',
      cards: [
        { id: 'work.items', title: 'Work card kanban', description: 'Open / in-progress / done columns.', status: 'placeholder', primary: 'awaiting first run', bullets: ['open', 'in progress', 'done'] },
      ],
    },
  ],
};

function fmtTimestamp(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

function shortDate(iso: string): string {
  if (!iso) return '-';
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
            : `latest ${qcHistory[0].subject} - ${qcHistory[0].score}/100 (${qcHistory[0].verdict})`,
          secondary: qcHistory.length === 0 ? 'awaiting first run' : `${qcHistory.length} rounds on file`,
          bullets: ['round', 'score', 'verdict', 'reviewer'],
        },
        {
          id: 'qc.trend',
          title: 'Score trend',
          description: 'Last 7 QC rounds, newest first.',
          status: qcHistory.length === 0 ? 'placeholder' : 'live',
          primary: qcHistory.length === 0
            ? 'awaiting first run'
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
            ? 'awaiting first run'
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
            ? 'awaiting first run'
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
      value: tests.tests > 0 ? String(tests.tests) : '0',
      detail: tests.tests > 0
        ? `${tests.failedTests ?? 0} failed · ${Math.round((tests.durationMs || 0) / 1000)}s · ${tests.files} files`
        : 'awaiting first run',
      status: tests.status === 'passed' ? 'live' : 'placeholder',
    },
    {
      id: 'hero.build',
      label: 'BUILD',
      value: build.bundleKb > 0 ? `${build.bundleKb} KB` : '0 KB',
      detail: build.bundleKb > 0
        ? `${build.modules} modules · ${build.cssKb} KB CSS · ${build.durationMs ?? 0}ms`
        : 'awaiting first run',
      status: build.status === 'clean' ? 'live' : 'placeholder',
    },
    {
      id: 'hero.audit',
      label: 'AUDIT',
      value: String(auditEntries),
      detail: latestQc
        ? `${latestQc.subject} - ${latestQc.score}/100 (${latestQc.verdict})`
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
    return <p className="muted">awaiting first run</p>;
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

function workCardPriority(priority?: string): 'low' | 'normal' | 'high' | 'critical' {
  return priority === 'low' || priority === 'high' || priority === 'critical' ? priority : 'normal';
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

  // Per Phase 3: 6 work cards, 5 activity rows max.
  const workItemsForCards = useMemo(() => (live?.workItems ?? []).slice(0, 6), [live]);
  const activityForTable = useMemo(() => (live?.activity ?? []).slice(0, 5), [live]);
  const qcForSparkline = useMemo(() => live?.qcHistory ?? [], [live]);

  const qcLatest = qcForSparkline[0];

  const recheck = async () => {
    try {
      const r = await fetch(`${import.meta.env.BASE_URL}data/stronghold-snapshot.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Snapshot unavailable: ${r.status}`);
      const json = await r.json() as StrongholdSnapshot;
      setFetchedSnapshot(json);
      setData(buildAgenticOsData(json));
    } catch {
      setData(AGENTIC_OS_PLACEHOLDER);
    }
  };

  return (
    <section className="panel wide agenticOsPanel" aria-label="Agentic OS dashboard" data-agentic-os-panel>
      <header className="dashboardHeader" id="section-hero">
        <p className="dashboardHeader__eyebrow">Engineering Division Stronghold</p>
        <p className="sr-only">GUARDED · Approvals · Artifacts · No shell · Agentic OS Dashboard</p>
        {!live ? <p className="sr-only">awaiting live {'wiring'}</p> : null}
        <h1 className="dashboardHeader__title">Agent-Army Mission Control</h1>
        <p className="dashboardHeader__sub">
          Igris-owned Stronghold cockpit for visibility, guarded proposals, and safe mock orchestration.
        </p>
        <div className="dashboardHeader__actions">
          <ThemeToggle />
          <StatusPill tone={data.source === 'live' ? 'success' : 'neutral'} label={data.source === 'live' ? 'LIVE' : 'STATIC'} />
          <button type="button" className="btn-secondary" onClick={() => { void recheck(); }}>Recheck</button>
        </div>
        <dl className="dashboardHeader__meta">
          <div><dt>Owner</dt><dd>{live?.owner || 'Igris'}</dd></div>
          <div><dt>Coordinator</dt><dd>{live?.coordinator || 'Belion'}</dd></div>
          <div>
            <dt>Backend</dt>
            <dd>
              <StatusPill tone="success" label="connected" icon="dot" />
            </dd>
          </div>
          <div><dt>Kill switch</dt><dd><StatusPill tone="neutral" label="inactive" icon="dot" /></dd></div>
        </dl>
      </header>

      {/* Hero stats row: 4 equal cards across the full width */}
      <section id="section-health" className="agenticOsHeroRow" aria-label="Hero stats">
        {heroStats.map(stat => (
          <div key={stat.id} data-hero-id={stat.id} data-status={stat.status}>
            <strong className="agenticOsHeroValue">{stat.value}</strong>
            <Stat id={stat.id} label={stat.label} value={stat.value} hint={stat.detail} />
          </div>
        ))}
      </section>

      {/* QC Score History: full width with compact sparkline */}
      <div data-section="qc-history">
      <Panel eyebrow="AGENTIC OS" title="QC Score History" id="section-qc">
        <div className="agenticOsQcPanel">
          <div className="agenticOsQcRecent">
            {qcLatest
              ? <AgenticOsPrimitiveCard tone="accent" label="Latest QC round" value={`${qcLatest.score}/100`} description={`${qcLatest.subject} - ${qcLatest.verdict}`} />
              : <EmptyState title="No QC rounds yet" description="Sentinel + Tusk verdicts will appear here once a review is captured." />}
          </div>
          <div className="agenticOsQcSparklineWrap">
            {renderSparkline(qcForSparkline)}
          </div>
        </div>
      </Panel>
      </div>

      {/* Work Items (3 cards) + Activity (5 rows) side-by-side */}
      <div className="agenticOsTwoCol">
        {/* Open Work Items: 6 cards */}
        <div data-section="work-items">
        <Panel title="Open Work Items" id="section-work" actions={<StatusPill tone="info" label={`${workItemsForCards.length} items`} />}>
          <div className="agenticOsWorkGrid">
            {workItemsForCards.length > 0
              ? workItemsForCards.map((w) => {
                const status = isWorkCardStatus(w.status) ? w.status : 'planned';
                const card = (
                  <WorkCard
                    id={w.id}
                    title={w.title}
                    subtitle={w.priority ? `priority: ${w.priority}` : undefined}
                    laneId={status}
                    owner={{ id: w.owner || 'unassigned', name: w.owner || 'unassigned' }}
                    status={status}
                    priority={workCardPriority(w.priority)}
                    dueAt={w.modifiedAt}
                  />
                );
                return <div key={w.id} data-status={status} data-work-id={w.id}>{card}</div>;
              })
              : <EmptyState title="No open work items" description="Pull work from a mission to get started." action={{ label: 'Open Work', href: '/work' }} />}
          </div>
        </Panel>
        </div>

        {/* Activity table: When / Actor / Action / Target (4 columns, 5 rows max) */}
        <div data-section="activity">
        <Panel title="Activity" id="section-activity" actions={<StatusPill tone="neutral" label={`${activityForTable.length} entries`} />}>
          <div className="agenticOsTableWrap">
            <table className="agenticOsTable" data-activity-table="true">
              <caption className="sr-only">Last 5 specialist dispatches</caption>
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
                      <td colSpan={4}><EmptyState title="No recent activity" description="Specialist dispatches will appear here." /></td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </Panel>
        </div>
      </div>

      {/* Work cards: rendered by <WorkCardBoard /> in SurfaceWork (Phase 47).
          The orphan WorkCardFeed was removed; the Work Card Board subsumes it. */}

      {/* Discord #agent-army coordination panel (Phase D1).
          Self-contained read-only feed; polls every 60s, pausable. */}
      <div id="section-coordination"><DiscordCoordinationPanel /></div>

      {/* Routing Flow - Phase D4 activity graph (read-only).
          Polls /api/activity-graph every 60s and renders the hand-off graph
          as a pure SVG with three rows of nodes (Belion top, Igris middle,
          specialists bottom) and pulse-animated edges for active routes. */}
      <div id="section-routing"><ActivityGraphPanel /></div>
      <div id="section-memory"><MemoryStatusPanel /></div>
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
    subagentsStats: { costToday: null, tokensToday: null, activeRuns: 0, lastWrapperSyncAt: null },
  };
}
