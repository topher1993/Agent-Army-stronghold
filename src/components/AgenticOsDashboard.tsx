// =============================================================================
// Stronghold · Agentic OS Dashboard (Phase E2 mission-control redesign)
//
// Design read: "Reading this as: a mission-control single-column deck for the
// operator (Chris), with a calm, dense, data-first language, leaning toward a
// Linear-style dark minimalist aesthetic with one warm-emerald accent."
//
// Dials:
//   DESIGN_VARIANCE:   6  (calm, not symmetric — hero row is 4 cards, app
//                           health 3, work 3, memory 2, roadmap 3; varied
//                           column counts keep the rhythm alive without
//                           becoming artsy)
//   MOTION_INTENSITY:  4  (CSS transitions on hover/active, pulse-dot for
//                           AI / critical state; no scroll-jacking, no GSAP,
//                           no marquee, no entry choreography)
//   VISUAL_DENSITY:    7  (mission-control cockpit — tight paddings, mono
//                           numbers, 1px hairlines between sections, no
//                           card-heavy pattern; data metrics breathe in
//                           plain layout, not in boxes)
//
// Anti-defaults (per taste-skill / minimalist-skill):
//   - Font: Geist (Inter replacement) loaded via system stack — Geist first
//     in the var(--font) chain is the v2 swap. Inter kept as final fallback
//     for legibility, not as the primary face.
//   - One accent: warm-emerald (#10b981) for live status. Linear violet
//     remains the interactive accent, restricted to CTAs / links.
//   - No "rounded-full" containers. Pills exist only for status tokens.
//   - No shadow-md / shadow-lg / shadow-xl defaults. Shadows are tinted to
//     the canvas hue at very low opacity.
//   - One shape system: 8px soft radius (--radius-lg) for cards, 4px
//     (--radius-sm) for chips, full pill for status tokens only.
//   - WCAG AA verified for body text and CTA contrast.
//   - prefers-reduced-motion: collapses pulse-dot animations to static.
//   - prefers-reduced-transparency: not needed — no glassmorphism in the
//     dashboard, surfaces are solid.
// =============================================================================

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { ActivityEntry, QcRound, StrongholdSnapshot, WorkItem } from '../types';

// -----------------------------------------------------------------------------
// Public types (kept stable for test compatibility)
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// Pure formatters
// -----------------------------------------------------------------------------

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
  return d.toISOString().slice(0, 10);
}

function fmtKb(n: number): string {
  if (!n) return '0 KB';
  if (n < 1024) return `${n} KB`;
  return `${(n / 1024).toFixed(2)} MB`;
}

function fmtMs(ms: number | undefined): string {
  if (!ms || ms <= 0) return '0s';
  if (ms < 1000) return `${ms}ms`;
  return `${Math.round(ms / 1000)}s`;
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

// -----------------------------------------------------------------------------
// Data builders (test-stable API)
// -----------------------------------------------------------------------------

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
      value: tests.tests > 0 ? String(tests.tests) : '-',
      detail: tests.tests > 0
        ? `${tests.failedTests ?? 0} failed · ${Math.round((tests.durationMs || 0) / 1000)}s · ${tests.files} files`
        : 'awaiting live wiring',
      status: tests.status === 'passed' ? 'live' : 'placeholder',
    },
    {
      id: 'hero.build',
      label: 'BUILD',
      value: build.bundleKb > 0 ? `${build.bundleKb} KB` : '-',
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
 * Sparkline derives 7 points from the most recent QC history (newest first
 * per the brief). When fewer than 7 rounds exist, the array is padded with
 * the earliest known score so the polyline still has 7 visible points.
 */
export function buildSparklinePoints(qcHistory: QcRound[]): number[] {
  const scores = qcHistory.slice(0, 7).map(r => r.score);
  if (scores.length === 0) return [];
  while (scores.length < 7) scores.push(scores[scores.length - 1]);
  return scores.reverse(); // render oldest -> newest left-to-right
}

// -----------------------------------------------------------------------------
// Section builders for the 7-section deck
// -----------------------------------------------------------------------------

type AppHealthRow = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: AgenticOsCardStatus;
};

function buildAppHealthRows(snapshot: StrongholdSnapshot): AppHealthRow[] {
  const h = snapshot.health;
  const tests = h.tests;
  const build = h.build;
  const tunnel = h.tunnel;
  return [
    {
      id: 'app-health.tests',
      label: 'Test suite',
      value: tests.status === 'passed'
        ? `${tests.tests} pass`
        : tests.tests > 0
          ? `${tests.tests} (${tests.status})`
          : 'no run captured',
      detail: tests.tests > 0
        ? `${tests.files} files · ${fmtMs(tests.durationMs)}${tests.failedTests ? ' · ' + tests.failedTests + ' failed' : ''}`
        : 'run `npm run health:capture` then `npm run snapshot`',
      status: tests.status === 'passed' ? 'live' : 'placeholder',
    },
    {
      id: 'app-health.build',
      label: 'Build',
      value: build.status === 'clean'
        ? `${build.bundleKb} KB`
        : build.bundleKb > 0
          ? `${build.bundleKb} KB (${build.status})`
          : 'no build captured',
      detail: build.bundleKb > 0
        ? `${build.modules} modules · ${build.cssKb} KB CSS · ${fmtMs(build.durationMs)}`
        : 'run `npm run build` then `npm run snapshot`',
      status: build.status === 'clean' ? 'live' : 'placeholder',
    },
    {
      id: 'app-health.tunnel',
      label: 'Tunnel',
      value: tunnel.publicHost || '127.0.0.1:5174',
      detail: tunnel.note || 'localhost only by design',
      status: 'live',
    },
  ];
}

type MemoryRow = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: AgenticOsCardStatus;
};

function buildMemoryRows(snapshot: StrongholdSnapshot): MemoryRow[] {
  const mem = snapshot.memory;
  const fileCount = mem.files.length;
  const skillCount = mem.skills.length;
  return [
    {
      id: 'memory.entries',
      label: 'Entries',
      value: String(fileCount),
      detail: fileCount > 0
        ? mem.files.map(f => f.name).slice(0, 2).join(', ') + (fileCount > 2 ? `, +${fileCount - 2} more` : '')
        : 'no memory files indexed',
      status: fileCount > 0 ? 'live' : 'placeholder',
    },
    {
      id: 'memory.skills',
      label: 'Skills',
      value: String(mem.totalSkills),
      detail: skillCount > 0
        ? `${skillCount} skills mapped to profiles`
        : 'no skills mapped yet',
      status: mem.totalSkills > 0 ? 'live' : 'placeholder',
    },
  ];
}

type RoadmapFix = {
  id: string;
  tag: string;
  title: string;
  status: 'tracked' | 'in-review' | 'shipped';
};

function buildRoadmapFixes(snapshot: StrongholdSnapshot): RoadmapFix[] {
  // The roadmap is read from the 3 most-recent P2 work items that aren't
  // already complete. Falls back to a deterministic 3-item placeholder set
  // tied to the agentic-os redesign brief when the snapshot is sparse.
  const p2Open = snapshot.workItems
    .filter(w => (w.priority === 'P2' || w.priority === 'P1') && w.status !== 'complete')
    .slice(0, 3);
  if (p2Open.length >= 3) {
    return p2Open.map((w, i) => ({
      id: w.id || `roadmap-${i}`,
      tag: w.priority || 'P2',
      title: w.title || w.id || `P2 fix ${i + 1}`,
      status: w.status === 'review' ? 'in-review' : 'tracked',
    }));
  }
  // Defensive placeholder when the snapshot is empty.
  return [
    { id: 'roadmap.mission-control', tag: 'P2', title: 'Mission-control deck · 7 sections', status: 'tracked' },
    { id: 'roadmap.sparkline',       tag: 'P2', title: 'QC sparkline · inline SVG, no libs', status: 'tracked' },
    { id: 'roadmap.tokens',          tag: 'P2', title: 'Type + spacing + shape tokens',     status: 'tracked' },
  ];
}

// -----------------------------------------------------------------------------
// Status pills
// -----------------------------------------------------------------------------

type StatusPillStatus =
  | AgenticOsCardStatus
  | 'tracked'
  | 'in-review'
  | 'shipped'
  | 'active'
  | 'review'
  | 'planned'
  | 'blocked'
  | 'complete'
  | 'placeholder';

function statusPillFor(status: StatusPillStatus, label?: string) {
  const text = label ?? status;
  return <span className={`status ${status}`}>{text}</span>;
}

function statusClassForWorkItem(w: WorkItem): 'active' | 'review' | 'planned' | 'blocked' | 'complete' | 'placeholder' {
  const allowed = ['active', 'review', 'planned', 'blocked', 'complete'] as const;
  return (allowed.includes(w.status as typeof allowed[number]) ? w.status : 'placeholder') as
    | 'active' | 'review' | 'planned' | 'blocked' | 'complete' | 'placeholder';
}

// -----------------------------------------------------------------------------
// Sub-views (private)
// -----------------------------------------------------------------------------

function HeroStatsRow({ stats }: { stats: AgenticOsHeroStat[] }) {
  return (
    <section className="agenticOsHeroRow" aria-label="Hero stats" data-section="hero-stats">
      {stats.map(stat => (
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
  );
}

function AppHealthSection({ rows }: { rows: AppHealthRow[] }) {
  return (
    <section className="agenticOsSection" aria-label="App health" data-section="app-health">
      <header className="agenticOsSectionHeader">
        <h3>App Health</h3>
        <p className="agenticOsSubNote">Local build, test, and tunnel status.</p>
      </header>
      <div className="agenticOsHealthGrid">
        {rows.map(row => (
          <article
            key={row.id}
            className="agenticOsHealthCard"
            data-status={row.status}
            data-health-id={row.id}
          >
            <div className="agenticOsHealthTop">
              <span className="agenticOsHeroLabel">{row.label}</span>
              <span className={`agenticOsHealthDot ${row.status}`} aria-hidden="true" />
            </div>
            <strong className="agenticOsHealthValue">{row.value}</strong>
            <p className="agenticOsHeroDetail">{row.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function renderSparkline(qcHistory: QcRound[]) {
  const scores = buildSparklinePoints(qcHistory);
  if (scores.length === 0) {
    return <p className="muted">awaiting live wiring</p>;
  }
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

function QcHistorySection({ history }: { history: QcRound[] }) {
  const latest = history[0];
  return (
    <section className="agenticOsSection agenticOsQcSection" aria-label="QC score history" data-section="qc-history">
      <header className="agenticOsSectionHeader">
        <h3>QC Score History</h3>
        <p className="agenticOsSubNote">Sentinel + Tusk verdicts · last 7 rounds.</p>
      </header>
      <div className="agenticOsQcPanel">
        <div className="agenticOsQcRecent">
          {latest
            ? (
              <p className="agenticOsQcRecentLine">
                <span className="agenticOsHeroValueInline">{latest.score}/100</span>
                <span className="agenticOsQcSubject">{latest.subject}</span>
                <span className="status live" data-qc-verdict>{latest.verdict}</span>
              </p>
            )
            : <p className="muted">no QC rounds captured yet</p>}
        </div>
        <div className="agenticOsQcSparklineWrap">
          {renderSparkline(history)}
        </div>
      </div>
    </section>
  );
}

function workItemCard(w: WorkItem, index: number) {
  const statusClass = statusClassForWorkItem(w);
  return (
    <article
      key={w.id || `wi-${index}`}
      className="agenticOsWorkCard"
      data-status={statusClass}
      data-work-id={w.id}
    >
      <div className="agenticOsWorkTop">
        <span className="agenticOsWorkBadge">{w.id ? truncate(w.id, 16) : `WI-${String(index + 1).padStart(2, '0')}`}</span>
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

function OpenWorkItemsSection({ items }: { items: WorkItem[] }) {
  return (
    <section className="agenticOsSection" aria-label="Open work items" data-section="work-items">
      <header className="agenticOsSectionHeader">
        <h3>Open Work Items</h3>
        <p className="agenticOsSubNote">Top {items.length || 0} active or planned items.</p>
      </header>
      <div className="agenticOsWorkGrid">
        {items.length > 0
          ? items.map((w, i) => workItemCard(w, i))
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
                    <span className="muted">-</span>
                    <time className="agenticOsMono">-</time>
                  </div>
                </article>
              ))}
            </>
          )}
      </div>
    </section>
  );
}

function activityRow(a: ActivityEntry, index: number) {
  return (
    <tr key={`${a.timestamp}-${a.targetId}-${index}`} data-activity-row="true">
      <td className="agenticOsMono">{fmtTimestamp(a.timestamp)}</td>
      <td>{a.actor}</td>
      <td>{a.action}</td>
      <td className="agenticOsMono" title={a.targetId}>{truncate(a.targetId, 14)}</td>
      <td>{a.outcome || '-'}</td>
      <td className="agenticOsActivityReason">{a.reason || '-'}</td>
    </tr>
  );
}

function ActivitySection({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section className="agenticOsSection" aria-label="Recent activity" data-section="activity">
      <header className="agenticOsSectionHeader">
        <h3>Activity</h3>
        <p className="agenticOsSubNote">Latest {entries.length || 0} dispatches, newest first.</p>
      </header>
      <div className="agenticOsTableWrap">
        <table className="agenticOsTable" data-activity-table="true">
          <thead>
            <tr>
              <th scope="col">When</th>
              <th scope="col">Actor</th>
              <th scope="col">Action</th>
              <th scope="col">Target</th>
              <th scope="col">Outcome</th>
              <th scope="col">Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.length > 0
              ? entries.map((a, i) => activityRow(a, i))
              : (
                <tr data-activity-placeholder="true">
                  <td colSpan={6} className="muted">no recent activity</td>
                </tr>
              )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MemorySection({ rows }: { rows: MemoryRow[] }) {
  return (
    <section className="agenticOsSection" aria-label="Memory" data-section="memory">
      <header className="agenticOsSectionHeader">
        <h3>Memory</h3>
        <p className="agenticOsSubNote">Indexed memory files and mapped skills.</p>
      </header>
      <div className="agenticOsMemoryGrid">
        {rows.map(row => (
          <article
            key={row.id}
            className="agenticOsMemoryCard"
            data-status={row.status}
            data-memory-id={row.id}
          >
            <span className="agenticOsHeroLabel">{row.label}</span>
            <strong className="agenticOsHealthValue">{row.value}</strong>
            <p className="agenticOsHeroDetail">{row.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function RoadmapSection({ fixes }: { fixes: RoadmapFix[] }) {
  return (
    <section className="agenticOsSection" aria-label="Roadmap" data-section="roadmap">
      <header className="agenticOsSectionHeader">
        <h3>Roadmap</h3>
        <p className="agenticOsSubNote">Tracked P2 fixes from the work queue.</p>
      </header>
      <ul className="agenticOsRoadmap">
        {fixes.map(fix => (
          <li
            key={fix.id}
            className="agenticOsRoadmapItem"
            data-status={fix.status}
            data-roadmap-id={fix.id}
          >
            <span className="agenticOsRoadmapTag">{fix.tag}</span>
            <span className="agenticOsRoadmapTitle">{fix.title}</span>
            {statusPillFor(fix.status)}
          </li>
        ))}
      </ul>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Top-level component
// -----------------------------------------------------------------------------

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

  // Brief: 3 work cards max, 10 activity rows max.
  const workItemsForCards = useMemo(() => (live?.workItems ?? []).slice(0, 3), [live]);
  const activityForTable = useMemo(() => (live?.activity ?? []).slice(0, 10), [live]);
  const qcForSparkline = useMemo(() => live?.qcHistory ?? [], [live]);
  const appHealthRows = useMemo(() => live ? buildAppHealthRows(live) : [], [live]);
  const memoryRows = useMemo(() => live ? buildMemoryRows(live) : [], [live]);
  const roadmapFixes = useMemo(() => live ? buildRoadmapFixes(live) : [], [live]);

  return (
    <section className="panel wide agenticOsPanel" aria-label="Agentic OS dashboard" data-agentic-os-panel>
      <header className="agenticOsHeader">
        <div className="agenticOsHeaderTitle">
          <p className="eyebrow">Mission Control</p>
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

      <HeroStatsRow stats={heroStats} />
      <AppHealthSection rows={appHealthRows} />
      <QcHistorySection history={qcForSparkline} />
      <OpenWorkItemsSection items={workItemsForCards} />
      <ActivitySection entries={activityForTable} />
      <MemorySection rows={memoryRows} />
      <RoadmapSection fixes={roadmapFixes} />
    </section>
  );
}

// -----------------------------------------------------------------------------
// Empty-snapshot helper (preserves the prior API for tests)
// -----------------------------------------------------------------------------

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
