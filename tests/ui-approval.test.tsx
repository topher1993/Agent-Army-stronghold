import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import snapshot from '../public/data/stronghold-snapshot.json';
import { App } from '../src/App';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).includes('/api/')) return { ok: false, status: 404, json: async () => ({}) };
    return { ok: true, json: async () => snapshot };
  }));
});

describe('Phase 2 UI approval posture (Phase 47 — sidebar nav)', () => {
  it('renders guarded proposal language without execute controls', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // Phase 47: SafetyBoundary / approval language lives on the Operations surface.
    const sidebar = document.querySelector('.sidebar');
    const opsItem = sidebar?.querySelector('[data-surface-id="operations"]') as HTMLButtonElement | null;
    expect(opsItem).toBeTruthy();
    await act(async () => { opsItem!.click(); });

    const text = document.body.textContent || '';
    expect(text).toContain('Phase 2 Guarded Controls');
    expect(text).toContain('Propose mission/task changes');
    expect(text.toLowerCase()).not.toContain('execute agent');
    expect(text.toLowerCase()).not.toContain('edit cron');
  });
});