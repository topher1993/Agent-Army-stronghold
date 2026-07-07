// FEATURE — Phase D4 Activity Graph panel UI ("Routing Flow").
//
// A self-contained React component that:
//   - fetches GET /api/activity-graph?windowHours=N on mount
//   - re-fetches every 60 seconds when not paused
//   - renders an SVG hand-off graph with division nodes and edge lines
//   - recent edges (last < 1h) get the `activity-edge--pulse` class so a CSS
//     keyframe animation highlights active hand-offs
//   - window selector buttons (1h / 6h / 24h / 168h) re-trigger the fetch
//   - empty state when the API returns no edges
//   - error state with a Retry button when the fetch fails
//
// This panel is READ-ONLY. There is no post/patch/delete affordance.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EmptyState } from './Feedback/EmptyState';

type ActivityGraphDivision = {
  id: string;
  label: string;
  color: string;
};

type ActivityGraphEdge = {
  from: string;
  to: string;
  count: number;
  lastTimestamp: string;
  lastCapability: string;
  recent: boolean;
};

type ActivityGraphResponse = {
  generatedAt: string;
  divisions: ActivityGraphDivision[];
  edges: ActivityGraphEdge[];
  totalEntries: number;
  windowHours: number;
};

const POLL_INTERVAL_MS = 60_000;
// Default 24h matches the route's default. The selector offers 1h / 6h /
// 24h / 168h (one week) so an operator can sweep the recent burst or
// inspect a full week of routing flow.
const DEFAULT_WINDOW_HOURS = 24;
const WINDOW_OPTIONS = [1, 6, 24, 168] as const;
type WindowHours = typeof WINDOW_OPTIONS[number];

const VIEWBOX_W = 800;
const VIEWBOX_H = 400;
// Three rows: Belion (orchestrator) at the top, Igris (engineering) in the
// middle, specialists evenly spaced at the bottom.
const BELION = { x: 400, y: 50 };
const IGRIS = { x: 400, y: 150 };
const SPECIALIST_Y = 300;

function relativeTime(iso: string, now: number = Date.now()): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const delta = Math.max(0, now - t);
  const s = Math.floor(delta / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function nodePosition(divisionId: string, specialistCount: number, specialistIndex: number) {
  if (divisionId === 'Belion') return BELION;
  if (divisionId === 'Igris') return IGRIS;
  // Specialists: spread evenly across the bottom row. With a single
  // specialist we center it at x=400; with more we distribute between 80
  // and 720 leaving 80px gutters.
  if (specialistCount <= 1) return { x: 400, y: SPECIALIST_Y };
  const padding = 80;
  const step = (VIEWBOX_W - padding * 2) / (specialistCount - 1);
  return { x: padding + specialistIndex * step, y: SPECIALIST_Y };
}

function strokeWidthFor(count: number): number {
  // Clamp 1..6 so a single noisy edge doesn't blow out the layout. Counts
  // < 1 are skipped at render time (see below).
  return Math.min(6, Math.max(1, count));
}

export function ActivityGraphPanel(): JSX.Element {
  const [windowHours, setWindowHours] = useState<WindowHours>(DEFAULT_WINDOW_HOURS);
  const [graph, setGraph] = useState<ActivityGraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState<boolean>(false);

  const fetchRef = useRef<((h: WindowHours) => Promise<void>) | null>(null);
  fetchRef.current = async (h: WindowHours) => {
    setError(null);
    try {
      const res = await fetch(`/api/activity-graph?windowHours=${h}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = (body && typeof body === 'object' && 'error' in body)
          ? String((body as { error: unknown }).error)
          : `HTTP ${res.status}`;
        setError(`Activity graph read failed: ${detail}`);
        return;
      }
      const payload = (await res.json()) as ActivityGraphResponse;
      setGraph(payload);
      setHasFetchedOnce(true);
    } catch (err) {
      setError(`Activity graph read failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Kick off the initial fetch on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchRef.current?.(windowHours);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 60s polling. We re-fire when windowHours changes (button click) and on
  // a 60s timer. The fetchRef always reads the latest windowHours via
  // closure when invoked.
  useEffect(() => {
    let cancelled = false;
    void fetchRef.current?.(windowHours);
    const id = setInterval(() => {
      if (cancelled) return;
      void fetchRef.current?.(windowHours);
    }, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [windowHours]);

  const onSelectWindow = useCallback((h: WindowHours) => {
    setWindowHours(h);
  }, []);

  const onRetry = useCallback(() => {
    void fetchRef.current?.(windowHours);
  }, [windowHours]);

  // --- layout --------------------------------------------------------------
  // Belion and Igris are first-class slots. Specialists are filled in from
  // the API response, in API order. If the API returns more or fewer
  // specialists than DIVISIONS has, we follow what the API says.
  const divisions = graph?.divisions ?? [];
  const orchestrator = divisions.find(d => d.id === 'Belion');
  const engineering = divisions.find(d => d.id === 'Igris');
  const specialists = divisions.filter(d => d.id !== 'Belion' && d.id !== 'Igris');
  const specialistCount = specialists.length;

  const positionById = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (orchestrator) map.set(orchestrator.id, BELION);
    if (engineering) map.set(engineering.id, IGRIS);
    specialists.forEach((d, i) => {
      map.set(d.id, nodePosition(d.id, specialistCount, i));
    });
    return map;
  }, [orchestrator, engineering, specialists, specialistCount]);

  // --- render --------------------------------------------------------------

  const edges = (graph?.edges ?? []).filter(e => e.count > 0);
  const windowLabel = windowHours === 168 ? '168h' : `${windowHours}h`;

  let body: JSX.Element;
  if (loading && !hasFetchedOnce) {
    body = <p className="muted" data-state="loading">Loading…</p>;
  } else if (error && !hasFetchedOnce) {
    body = (
      <div data-state="error">
        <p className="muted" data-error-message>{error}</p>
        <button type="button" data-testid="activity-graph-retry" onClick={onRetry}>Retry</button>
      </div>
    );
  } else if (edges.length === 0) {
    body = (
      <div data-state="empty">
        <EmptyState icon={<span>◷</span>} title={`No hand-offs in the last ${windowLabel}`} description={`Showing the last ${windowLabel}. Widen the window to see more.`} />
      </div>
    );
  } else {
    body = (
      <svg
        className="activityGraphSvg"
        viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
        role="img"
        aria-label="Routing flow hand-off graph"
        data-routing-flow-graph
        data-state="loaded"
        data-testid="routing-flow-graph"
      >
        <defs>
          <marker
            id="activity-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent-text)" />
          </marker>
        </defs>

        {/* edges first so nodes draw on top */}
        {edges.map(e => {
          const from = positionById.get(e.from);
          const to = positionById.get(e.to);
          if (!from || !to) return null;
          const className = `activity-edge${e.recent ? ' activity-edge--pulse' : ''}`;
          return (
            <line
              key={`${e.from}->${e.to}`}
              data-edge={`${e.from}->${e.to}`}
              data-recent={e.recent ? 'true' : 'false'}
              className={className}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--color-accent-text)"
              strokeWidth={strokeWidthFor(e.count)}
              strokeLinecap="round"
              markerEnd="url(#activity-arrow)"
            >
              <title>
                {`${e.count} hand-off${e.count === 1 ? '' : 's'}, last: ${e.lastCapability}, ${relativeTime(e.lastTimestamp)}`}
              </title>
            </line>
          );
        })}

        {/* nodes */}
        {divisions.map(d => {
          const pos = positionById.get(d.id) ?? { x: 0, y: 0 };
          return (
            <g key={d.id} data-division-id={d.id} transform={`translate(${pos.x} ${pos.y})`}>
              <circle r={22} fill={d.color} stroke="var(--color-border)" strokeWidth={1.5} />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={12}
                fontWeight={700}
                fill="var(--color-canvas)"
              >
                {d.label}
              </text>
              <title>{d.label}</title>
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <section
      className="agenticOsSection"
      aria-label="Routing flow"
      data-section="routing-flow"
    >
      <header className="agenticOsSectionHeader">
        <h3>Routing Flow</h3>
        <div className="activityGraphWindowSelector" role="group" aria-label="Window selector">
          {WINDOW_OPTIONS.map(h => (
            <button
              key={h}
              type="button"
              data-testid={`window-selector-${h}`}
              data-active={windowHours === h ? 'true' : 'false'}
              className={`activityGraphWindowButton${windowHours === h ? ' activityGraphWindowButton--active' : ''}`}
              onClick={() => onSelectWindow(h)}
              aria-pressed={windowHours === h}
            >
              {h === 168 ? '168h' : `${h}h`}
            </button>
          ))}
        </div>
      </header>

      {body}

      {error && hasFetchedOnce
        ? (
          <p className="muted" data-state="error-stale">
            Last update failed: {error}
            {graph?.generatedAt ? ` · last good fetch ${relativeTime(graph.generatedAt)}` : ''}
          </p>
        )
        : null}
      {graph?.generatedAt && !error
        ? (
          <p className="muted" data-state="generated-at">
            {edges.length} hand-off{edges.length === 1 ? '' : 's'} · window {graph.windowHours}h · generated {relativeTime(graph.generatedAt)}
          </p>
        )
        : null}
    </section>
  );
}