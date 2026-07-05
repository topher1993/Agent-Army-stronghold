import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import snapshot from '../public/data/stronghold-snapshot.json';
import { App } from '../src/App';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('/api/')) return { ok: true, json: async () => ({ ok: true, phase: 3, dispatchGate: 'approval-required', killSwitch: 'inactive' }) };
    return { ok: true, json: async () => snapshot };
  }));
});

describe('Phase 3 UI orchestration posture (Phase 47 — sidebar nav)', () => {
  it('renders agent request queue, run monitor, artifact review, and kill switch status on Operations surface', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // Phase 47: orchestration surfaces live on the Operations surface, reached via the sidebar.
    const sidebar = document.querySelector('.sidebar');
    const opsItem = sidebar?.querySelector('[data-surface-id="operations"]') as HTMLButtonElement | null;
    expect(opsItem).toBeTruthy();
    await act(async () => { opsItem!.click(); });

    const text = document.body.textContent || '';
    expect(text).toContain('Phase 3 Agent Orchestration');
    expect(text).toContain('Agent Request Queue');
    expect(text).toContain('Agent Run Monitor');
    expect(text).toContain('Artifact Review');
    expect(text).toContain('Kill switch');
    expect(text.toLowerCase()).not.toContain('/api/execute');
  });
});