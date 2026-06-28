// FEATURE — Discord #agent-army coordination panel (Phase D1 UI).
//
// The panel is a self-contained card on the Dashboard tab that polls
// /api/discord/agent-army?limit=20 every 60 seconds (pausable) and renders
// a card per message: author display name, relative time, content (truncated
// to 280 chars with "…" if longer), and a bot badge when isBot is true.
//
// This file drives the TDD lifecycle:
//   - RED:   these tests must fail before DiscordCoordinationPanel exists
//   - GREEN: after src/components/DiscordCoordinationPanel.tsx lands
//   - REFACTOR: extract helpers as needed
//
// We follow the existing UI test convention (ui-approval.test.tsx):
//   - jsdom + createRoot + act
//   - vi.stubGlobal('fetch', ...) so no real network call is made
//   - assertions on document.body.textContent / data-testid attributes

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiscordCoordinationPanel } from '../src/components/DiscordCoordinationPanel';

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

function stubFetchOk(payload: { messages: unknown[]; fetchedAt: string }): ReturnType<typeof vi.fn> {
  const body = JSON.stringify(payload);
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

// Two minutes in the past so relative time resolves to "2m ago".
const TWO_MIN_AGO = new Date(Date.now() - 2 * 60 * 1000).toISOString();
const NOW_ISO = new Date().toISOString();

const SAMPLE_MESSAGES = [
  {
    id: 'm1',
    timestamp: TWO_MIN_AGO,
    author: { id: 'a1', username: 'igris', displayName: 'Igris' },
    content: 'Phase D1 starting',
    isBot: false,
  },
  {
    id: 'm2',
    timestamp: NOW_ISO,
    author: { id: 'a2', username: 'auto-bot', displayName: 'auto-bot' },
    content: 'acknowledged',
    isBot: true,
  },
];

// --- tests -----------------------------------------------------------------

describe('DiscordCoordinationPanel (Phase D1 UI)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('renders the Coordination heading on mount', async () => {
    stubFetchOk({ messages: SAMPLE_MESSAGES, fetchedAt: NOW_ISO });
    const m = mountPanel();
    await act(async () => { m.root.render(<DiscordCoordinationPanel />); });
    const text = document.body.textContent || '';
    expect(text).toContain('Coordination');
    unmount(m);
  });

  it('renders a card per message with author display name, relative time, and content', async () => {
    stubFetchOk({ messages: SAMPLE_MESSAGES, fetchedAt: NOW_ISO });
    const m = mountPanel();
    await act(async () => { m.root.render(<DiscordCoordinationPanel />); });
    const text = document.body.textContent || '';
    expect(text).toContain('Igris');
    expect(text).toContain('Phase D1 starting');
    expect(text).toContain('acknowledged');
    // relative time formatter must surface "2m ago" for the 2-minute-old message
    expect(text).toMatch(/2m ago/);
    // bot badge is required when isBot is true
    expect(text.toLowerCase()).toContain('bot');
    unmount(m);
  });

  it('renders the empty state with a Refresh button when the API returns []', async () => {
    stubFetchOk({ messages: [], fetchedAt: NOW_ISO });
    const m = mountPanel();
    await act(async () => { m.root.render(<DiscordCoordinationPanel />); });
    const text = document.body.textContent || '';
    expect(text).toContain('No recent messages');
    const refresh = document.querySelector('[data-testid="coordination-refresh"]');
    expect(refresh).not.toBeNull();
    expect(refresh?.textContent?.toLowerCase()).toContain('refresh');
    unmount(m);
  });

  it('renders the error state with a Retry button when fetch fails', async () => {
    stubFetchFail(502);
    const m = mountPanel();
    await act(async () => { m.root.render(<DiscordCoordinationPanel />); });
    // wait for the awaited fetch to settle inside the panel's useEffect
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    const text = document.body.textContent || '';
    expect(text.toLowerCase()).toMatch(/failed|error/);
    const retry = Array.from(document.querySelectorAll('button')).find(b => /retry/i.test(b.textContent || ''));
    expect(retry).toBeDefined();
    unmount(m);
  });

  it('pauses polling when the toggle button is pressed', async () => {
    vi.useFakeTimers();
    const fetchSpy = stubFetchOk({ messages: [], fetchedAt: NOW_ISO });
    const m = mountPanel();
    await act(async () => { m.root.render(<DiscordCoordinationPanel />); });
    const callsAfterMount = fetchSpy.mock.calls.length;

    // Toggle pause.
    const toggle = document.querySelector('[data-testid="coordination-toggle"]') as HTMLButtonElement | null;
    expect(toggle).not.toBeNull();
    await act(async () => { toggle!.click(); });

    // Advance the panel's poll interval. The default is 60s; advance by
    // 60s + a small buffer and confirm fetch was NOT called again.
    await act(async () => {
      vi.advanceTimersByTime(61_000);
    });
    expect(fetchSpy.mock.calls.length).toBe(callsAfterMount);

    // Unpause; one more fetch should fire on the next tick.
    await act(async () => { toggle!.click(); });
    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsAfterMount);

    unmount(m);
  });
});