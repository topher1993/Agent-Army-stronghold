// FEATURE — Phase D3 Memory Status panel UI.
//
// Polls GET /api/memory-status every 60s. Renders file metadata,
// per-section breakdown, copy-to-clipboard button.
//
// Required coverage per the brief:
//   - renders header
//   - renders stats line
//   - renders section list with title + char count + first sentence
//   - copy button calls navigator.clipboard.writeText
//   - error state + retry button
//   - empty state for missing file
//
// Same UI test convention as ui-activity-graph.test.tsx:
//   - jsdom + createRoot + act
//   - vi.stubGlobal('fetch', ...) so no real network call is made
//   - vi.stubGlobal('navigator.clipboard', ...) for the copy button

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryStatusPanel } from '../src/components/MemoryStatusPanel';

type FetchResponse = { ok: boolean; status: number; json: () => Promise<unknown> };
type Clipboard = { writeText: (s: string) => Promise<void> };

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

function stubFetchError(status = 500): ReturnType<typeof vi.fn> {
  const fn = vi.fn(async (_url: string): Promise<FetchResponse> => ({
    ok: false,
    status,
    json: async () => ({}),
  }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const SAMPLE = {
  path: 'C:\\Users\\tophe\\AppData\\Local\\hermes\\memories\\MEMORY.md',
  exists: true,
  sizeBytes: 1856,
  lastModified: new Date(Date.now() - 60_000).toISOString(),
  sections: [
    { title: 'Audit governance', charCount: 280, firstSentence: 'MiniMax M3 is the orchestrator and engineer ONLY.', lineStart: 1, lineEnd: 1 },
    { title: 'Pitfalls', charCount: 410, firstSentence: 'QC_REPORTS_DIR was on Desktop and silently deleted rounds.', lineStart: 3, lineEnd: 3 },
  ],
  rawText: '**Audit governance:** MiniMax M3 is the orchestrator and engineer ONLY.\n\n§\n\n**Pitfalls:** QC_REPORTS_DIR was on Desktop and silently deleted rounds.\n',
};

describe('<MemoryStatusPanel />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('renders the header and stats line on successful fetch', async () => {
    stubFetchOk(SAMPLE);
    const handle = mountPanel();
    await act(async () => {
      handle.root.render(React.createElement(MemoryStatusPanel));
      await Promise.resolve();
    });
    const text = document.body.textContent ?? '';
    expect(text).toContain('Memory Status');
    expect(text).toContain('1856 bytes');
    expect(text).toContain('2 sections');
    expect(text).toContain(SAMPLE.path);
    unmount(handle);
  });

  it('renders one list item per section with title + first sentence', async () => {
    stubFetchOk(SAMPLE);
    const handle = mountPanel();
    await act(async () => {
      handle.root.render(React.createElement(MemoryStatusPanel));
      await Promise.resolve();
    });
    const items = document.body.querySelectorAll('[data-testid="memory-status-section"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Audit governance');
    expect(items[0].textContent).toContain('MiniMax M3');
    expect(items[1].textContent).toContain('Pitfalls');
    expect(items[1].textContent).toContain('QC_REPORTS_DIR');
    unmount(handle);
  });

  it('copy button calls navigator.clipboard.writeText with rawText', async () => {
    stubFetchOk(SAMPLE);
    const writeText = vi.fn(async () => {});
    vi.stubGlobal('navigator', { clipboard: { writeText } satisfies Clipboard });
    const handle = mountPanel();
    await act(async () => {
      handle.root.render(React.createElement(MemoryStatusPanel));
      await Promise.resolve();
    });
    const btn = document.body.querySelector('[data-testid="memory-status-copy"]') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    await act(async () => {
      btn!.click();
      await Promise.resolve();
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Audit governance');
    unmount(handle);
  });

  it('shows error state with retry button on HTTP failure', async () => {
    stubFetchError(500);
    const handle = mountPanel();
    await act(async () => {
      handle.root.render(React.createElement(MemoryStatusPanel));
      await Promise.resolve();
    });
    const text = document.body.textContent ?? '';
    expect(text).toContain('Error');
    expect(text).toContain('Retry');
    unmount(handle);
  });

  it('shows empty state when file does not exist', async () => {
    stubFetchOk({ ...SAMPLE, exists: false, sections: [], sizeBytes: 0, lastModified: null, rawText: '' });
    const handle = mountPanel();
    await act(async () => {
      handle.root.render(React.createElement(MemoryStatusPanel));
      await Promise.resolve();
    });
    const text = document.body.textContent ?? '';
    expect(text).toContain('Memory file not found');
    expect(text).toContain(SAMPLE.path);
    expect(document.body.querySelectorAll('[data-testid="memory-status-section"]').length).toBe(0);
    unmount(handle);
  });
});
