import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import snapshot from '../public/data/stronghold-snapshot.json';
import { App } from '../src/App';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (!String(url).includes('/api/')) return { ok: true, json: async () => snapshot };
    const path = new URL(String(url)).pathname;
    const responses: Record<string, unknown> = {
      '/api/health': { ok: true, phase: 2 },
      '/api/orchestration/health': { ok: true, phase: 3, dispatchGate: 'approval-required', killSwitch: 'inactive' },
      '/api/change-requests': [],
      '/api/audit': [],
      '/api/agent-requests': [],
      '/api/agent-runs': [],
      '/api/agent-artifacts': [],
      '/api/approvals': [],
    };
    return { ok: true, json: async () => responses[path] ?? [] };
  }));
});

/**
 * Phase 47: single-sidebar render — only the active surface is in the DOM.
 * Clicking a different sidebar item removes the current surface and mounts the
 * new one. Mobile uses a hamburger trigger; the test uses the sidebar items
 * directly to sidestep the overlay-trigger.
 */
describe('Stronghold shell sidebar-driven surface swap (Phase 47)', () => {
  it('renders the sidebar with 6 surfaces and Dashboard selected by default', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).toBeTruthy();

    const items = Array.from(sidebar?.querySelectorAll('[data-surface-id]') ?? []);
    expect(items.map(i => i.getAttribute('data-surface-id'))).toEqual([
      'dashboard', 'work', 'missions', 'subagents', 'operations', 'approvals', 'cron',
    ]);
    expect(sidebar?.querySelector('.sidebarItem--active')?.getAttribute('data-surface-id')).toBe('dashboard');
  });

  it('shows the Dashboard surface by default; other surfaces are not in the DOM', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const dashboardSurface = document.querySelector('#dashboard-section');
    expect(dashboardSurface).toBeTruthy();
    expect(document.querySelector('#operations-section')).toBeNull();
    expect(document.querySelector('#work-section')).toBeNull();
    expect(document.querySelector('#approvals-section')).toBeNull();

    const text = document.body.textContent || '';
    expect(text).toContain('Agentic OS Dashboard');
    expect(text).toContain('QC Score History');
    expect(text).not.toContain('App Health');

    expect(text).not.toContain('Stronghold Telemetry');
    expect(text).not.toContain('Engineering Division Roster');
    expect(text).not.toContain('Agent Army Inventory');

    expect(text).toContain('GUARDED');
    expect(text).toContain('No shell');

    // D4: approval queue / audit / cron manager are NOT on the Dashboard surface.
    expect(text).not.toContain('Approval Queue');
    expect(text).not.toContain('Audit Trail');
    expect(text).not.toContain('Cron / Schedule Manager');

    expect(text.toLowerCase()).not.toContain('execute command');
    expect(text.toLowerCase()).not.toContain('shell command');
  });

  it('switches to the Operations surface when its sidebar item is clicked', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const sidebar = document.querySelector('.sidebar');
    const opsItem = sidebar?.querySelector('[data-surface-id="operations"]') as HTMLButtonElement | null;
    expect(opsItem).toBeTruthy();
    await act(async () => { opsItem!.click(); });

    expect(document.querySelector('#operations-section')).toBeTruthy();
    expect(document.querySelector('#dashboard-section')).toBeNull();

    const text = document.body.textContent || '';
    expect(text).toContain('Mission Proposal');
    expect(text).toContain('Task Proposal');
    expect(text).toContain('Work Card Proposal');
    expect(text).toContain('Phase 3 Agent Orchestration');
    expect(text).toContain('Safety & Readiness');
    // Phase 47: "Mission Board" lives on its own sidebar surface (the Missions slot),
    // not inside Operations. Click the Missions sidebar item to reach it.
    expect(text).not.toContain('Mission Board');
  });

  it('exposes a hamburger trigger for mobile sidebar overlay', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const trigger = document.querySelector('[data-mobile-nav-trigger]');
    expect(trigger).toBeTruthy();
    const label = trigger?.getAttribute('aria-label')?.toLowerCase() ?? '';
    expect(label === 'open navigation' || label === 'close navigation').toBe(true);
  });
});