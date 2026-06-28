// FEATURE — Phase D4 Activity Graph panel UI (Routing Flow).
//
// The panel sits below the Discord Coordination card on the Agentic OS
// Dashboard. It polls GET /api/activity-graph?windowHours=N every 60s and
// renders an SVG hand-off graph: three rows of division nodes (Belion
// top-center, Igris middle-center, specialists spread along the bottom)
// connected by lines whose stroke width reflects activity count. Edges
// with `recent=true` get the `activity-edge--pulse` class so a CSS keyframe
// animation highlights active hand-offs.
//
// Required coverage per the brief:
//   - renders heading "Routing Flow"
//   - renders one SVG node per division in mock data
//   - renders one SVG line per (from, to) edge with non-zero count
//   - edges with recent=true have className containing "pulse"
//   - window selector buttons (1h/6h/24h/168h) switch the fetch URL on click
//   - empty state when edges array is empty
//   - error state with retry button on fetch failure
//
// We follow the existing UI test convention (ui-discord-coordination.test.tsx):
//   - jsdom + createRoot + act
//   - vi.stubGlobal('fetch', ...) so no real network call is made
//   - assertions on document.body.textContent / data-testid attributes

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ActivityGraphPanel } from '../src/components/ActivityGraphPanel';

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };

// --- helpers ---------------------------------------------------------------

function mountPanel(): { root: Root; host: HTMLDivElement } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  return { root, host };
}

function unmount({ root, host }: { root: Root; host: HTMLDivElement }): void {
  root.unmount();
  host.remove();
}

function stubFetchOk(payload: unknown): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (_url: string): Promise<FetchResponse> => ({
    ok: true,
    status: 200,
    json: async () => payload,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function stubFetchFail(status = 500, body: unknown = { error: 'boom' }): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (_url: string): Promise<FetchResponse> => ({
    ok: false,
    status,
    json: async () => body,
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const SAMPLE_GRAPH = {
  generatedAt: '2026-06-28T00:00:00.000Z',
  divisions: [
    { id: 'Belion', label: 'Belion', color: '#49ffc7' },
    { id: 'Igris',  label: 'Igris',  color: '#5da6ff' },
    { id: 'Forge',  label: 'Forge',  color: '#f78c6c' },
  ],
  edges: [
    { from: 'Igris', to: 'Forge', count: 5, lastTimestamp: '2026-06-28T00:00:00.000Z', lastCapability: 'engineering:backend', recent: true },
    { from: 'Belion', to: 'Igris', count: 3, lastTimestamp: '2026-06-27T22:00:00.000Z', lastCapability: 'governance:dispatch', recent: false },
  ],
  totalEntries: 12,
  windowHours: 24,
};

// --- tests -----------------------------------------------------------------

describe('ActivityGraphPanel (Phase D4 UI)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders the "Routing Flow" heading on mount', async () => {
    stubFetchOk(SAMPLE_GRAPH);
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    const text = document.body.textContent || '';
    expect(text).toContain('Routing Flow');
    unmount(m);
  });

  it('renders one SVG node per division in the mock data', async () => {
    stubFetchOk(SAMPLE_GRAPH);
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    // Wait for the awaited fetch to settle.
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    // Each division is rendered as a <g data-division-id="..."> node; the
    // header chip and the SVG node should both exist.
    for (const d of SAMPLE_GRAPH.divisions) {
      const nodes = document.querySelectorAll(`[data-division-id="${d.id}"]`);
      expect(nodes.length).toBeGreaterThanOrEqual(1);
    }
    unmount(m);
  });

  it('renders one SVG <line> per edge with non-zero count', async () => {
    stubFetchOk(SAMPLE_GRAPH);
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    // Each (from, to) edge produces exactly one <line> with a data-edge attr.
    for (const e of SAMPLE_GRAPH.edges) {
      if (e.count <= 0) continue;
      const sel = `[data-edge="${e.from}->${e.to}"]`;
      const lines = document.querySelectorAll(sel);
      expect(lines.length).toBe(1);
    }
    unmount(m);
  });

  it('tags recent edges with the pulse class so CSS can animate them', async () => {
    stubFetchOk(SAMPLE_GRAPH);
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const recentEdge = SAMPLE_GRAPH.edges.find(e => e.recent);
    expect(recentEdge).toBeDefined();
    const line = document.querySelector(`[data-edge="${recentEdge!.from}->${recentEdge!.to}"]`);
    expect(line).not.toBeNull();
    const cls = line?.getAttribute('class') || '';
    expect(cls).toContain('pulse');
    unmount(m);
  });

  it('exposes window selector buttons that switch the fetch URL on click', async () => {
    const fetchSpy = stubFetchOk(SAMPLE_GRAPH);
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });

    const button1h = document.querySelector('[data-testid="window-selector-1"]') as HTMLButtonElement | null;
    const button6h = document.querySelector('[data-testid="window-selector-6"]') as HTMLButtonElement | null;
    expect(button1h).not.toBeNull();
    expect(button6h).not.toBeNull();

    const callsBefore = fetchSpy.mock.calls.length;
    await act(async () => { button1h!.click(); });
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore);
    const lastCall = fetchSpy.mock.calls.at(-1)?.[0] as string;
    expect(lastCall).toMatch(/windowHours=1/);

    const callsBefore6 = fetchSpy.mock.calls.length;
    await act(async () => { button6h!.click(); });
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore6);
    const lastCall6 = fetchSpy.mock.calls.at(-1)?.[0] as string;
    expect(lastCall6).toMatch(/windowHours=6/);

    unmount(m);
  });

  it('renders the empty state when the API returns no edges', async () => {
    stubFetchOk({ ...SAMPLE_GRAPH, edges: [] });
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/no hand-?offs|no activity|empty/);
    unmount(m);
  });

  it('renders the error state with a Retry button when fetch fails', async () => {
    stubFetchFail(500);
    const m = mountPanel();
    await act(async () => { m.root.render(<ActivityGraphPanel />); });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/failed|error/);
    const retry = Array.from(document.querySelectorAll('button')).find(b => /retry/i.test(b.textContent || ''));
    expect(retry).toBeDefined();
    unmount(m);
  });
});