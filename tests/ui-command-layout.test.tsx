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
      '/api/orchestration/health': { ok: true, phase: 3, killSwitch: 'inactive' },
      '/api/change-requests': [],
      '/api/audit': [],
      '/api/agent-requests': [],
      '/api/agent-runs': [],
      '/api/agent-artifacts': [],
      '/api/approvals': [],
      '/api/memory-status': { path: '', exists: false, sizeBytes: 0, lastModified: null, sections: [], rawText: '' },
      '/api/workcards': [],
    };
    return { ok: true, json: async () => responses[path] ?? [] };
  }));
});

/**
 * Phase 47: Dashboard is the default landing view. The right rail is gone.
 * The Sidebar lists 6 surfaces (Dashboard, Work, Missions, Operations, Approvals, Cron).
 * Approvals / Audit / Cron live on the Operations surface.
 */
describe('Stronghold Dashboard default landing layout (Phase 47 — sidebar nav)', () => {
  it('renders the new app shell with a left sidebar (Dashboard default)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // New shell primitives.
    expect(document.querySelector('.appShell')).toBeTruthy();
    expect(document.querySelector('.sidebar')).toBeTruthy();

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar?.getAttribute('aria-label')).toBe('Stronghold surfaces');

    // Sidebar surfaces (6).
    const surfaces = Array.from(sidebar?.querySelectorAll('[data-surface-id]') ?? []);
    const ids = surfaces.map(s => s.getAttribute('data-surface-id'));
    expect(ids).toEqual(['dashboard', 'work', 'missions', 'subagents', 'operations', 'approvals', 'cron']);

    // Dashboard is the default active surface.
    const active = sidebar?.querySelector('.sidebarItem--active');
    expect(active?.getAttribute('data-surface-id')).toBe('dashboard');

    // No fake intel/roster/inventory in main.
    const text = document.body.textContent?.toLowerCase() || '';
    expect(text).not.toContain('stronghold telemetry');
    expect(text).not.toContain('engineering division roster');
    expect(text).not.toContain('agent army inventory');

    // Guarded posture is still present.
    expect(text).toContain('guarded');
    expect(text).toContain('no shell');
  });

  it('renders Dashboard content (Agentic OS panel) on the Dashboard surface', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const dashboardSurface = document.querySelector('#dashboard-section');
    expect(dashboardSurface).toBeTruthy();
    expect(dashboardSurface?.textContent).toContain('Agentic OS Dashboard');
    expect(dashboardSurface?.textContent).toContain('QC Score History');
    expect(dashboardSurface?.textContent).toContain('Activity');
  });

  it('switches the active surface when a sidebar item is clicked', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const sidebar = document.querySelector('.sidebar');
    const opsItem = sidebar?.querySelector('[data-surface-id="operations"]') as HTMLButtonElement | null;
    expect(opsItem).toBeTruthy();
    await act(async () => { opsItem!.click(); });

    // Operations surface is in the DOM.
    const opsSection = document.querySelector('#operations-section');
    expect(opsSection).toBeTruthy();
    expect(opsSection?.textContent).toContain('Mission Proposal');
    expect(opsSection?.textContent).toContain('Task Proposal');
    expect(opsSection?.textContent).toContain('Work Card Proposal');
    expect(opsSection?.textContent).toContain('Phase 3 Agent Orchestration');

    // Dashboard section is gone.
    expect(document.querySelector('#dashboard-section')).toBeNull();
    // Active sidebar item updated.
    expect(sidebar?.querySelector('.sidebarItem--active')?.getAttribute('data-surface-id')).toBe('operations');
  });

  it('shows the backend status indicator in the sidebar footer', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    expect(document.querySelector('.sidebarStatusDot')).toBeTruthy();
    expect(document.body.textContent).toContain('Backend live');
  });

  it('collapses the sidebar to icon-only when the toggle is clicked', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const sidebar = document.querySelector('.sidebar');
    expect(sidebar?.getAttribute('data-sidebar-collapsed')).toBe('false');

    const toggle = document.querySelector('[data-sidebar-toggle]') as HTMLButtonElement | null;
    expect(toggle).toBeTruthy();
    await act(async () => { toggle!.click(); });

    expect(sidebar?.getAttribute('data-sidebar-collapsed')).toBe('true');
  });
});