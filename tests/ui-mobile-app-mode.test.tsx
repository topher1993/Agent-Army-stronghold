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
      '/api/agent-artifacts': []
    };
    return { ok: true, json: async () => responses[path] ?? [] };
  }));
});

describe('Stronghold Agentic OS default + Operations tab layout', () => {
  it('renders the bottom mobile tab navigation with Dashboard selected by default', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const nav = document.querySelector('[aria-label="Stronghold sections"]');
    expect(nav).toBeTruthy();

    const tabs = Array.from(nav?.querySelectorAll('button') ?? []);
    expect(tabs).toHaveLength(2);
    expect(tabs.map(tab => tab.textContent)).toEqual(['Dashboard', 'Operations']);

    expect(document.querySelector('.commandGrid')?.className).toContain('active-dashboard');
    const dashboardTab = tabs.find(tab => tab.textContent === 'Dashboard');
    expect(dashboardTab?.getAttribute('aria-selected')).toBe('true');
    expect(dashboardTab?.getAttribute('aria-controls')).toBe('dashboard-section');
  });

  it('shows the Agentic OS dashboard by default with no tab click required', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // The dashboard section is visible by default; the operations section is hidden.
    const dashboardSection = document.querySelector('#dashboard-section');
    const operationsSection = document.querySelector('#operations-section');
    expect(dashboardSection).toBeTruthy();
    expect(operationsSection).toBeTruthy();
    expect(dashboardSection?.getAttribute('aria-hidden')).toBe('false');
    expect(operationsSection?.getAttribute('aria-hidden')).toBe('true');

    // The Agentic OS dashboard hero is rendered in the main area by default.
    const text = document.body.textContent || '';
    expect(text).toContain('Agentic OS Dashboard');
    // Compact dashboard (Phase E — igris-compact-dashboard-brief): the App
    // Health section was deleted. QC Score History is still rendered.
    expect(text).toContain('QC Score History');
    expect(text).not.toContain('App Health');

    // No fake/stale static components.
    expect(text).not.toContain('Stronghold Telemetry');
    expect(text).not.toContain('Engineering Division Roster');
    expect(text).not.toContain('Agent Army Inventory');

    // Guarded posture is still present.
    expect(text).toContain('GUARDED');
    expect(text).toContain('No shell');
    expect(text).toContain('Approval Queue');
    expect(text).toContain('Audit Trail');
    expect(text).toContain('Cron / Schedule Manager');
    expect(text.toLowerCase()).not.toContain('execute command');
    expect(text.toLowerCase()).not.toContain('shell command');
  });

  it('switches to the Operations section when the Operations tab is clicked', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const tabs = Array.from(document.querySelectorAll('[aria-label="Stronghold sections"] button'));
    const operationsTab = tabs.find(tab => tab.textContent === 'Operations')!;
    expect(operationsTab).toBeTruthy();

    await act(async () => { operationsTab.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.querySelector('.commandGrid')?.className).toContain('active-operations');
    expect(document.querySelector('#operations-section')?.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector('#dashboard-section')?.getAttribute('aria-hidden')).toBe('true');

    const text = document.body.textContent || '';
    expect(text).toContain('Phase 2 Guarded Controls');
    expect(text).toContain('Mission Proposal');
    expect(text).toContain('Task Proposal');
    expect(text).toContain('Phase 3 Agent Orchestration');
    expect(text).toContain('Mission Board');
    expect(text).toContain('Safety & Readiness');
  });

  it('uses mobile-specific section ids and viewport classes for app-like scrolling', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    expect(document.querySelector('#dashboard-section')?.className).toContain('mobileSection');
    expect(document.querySelector('#operations-section')?.className).toContain('mobileSection');
  });
});