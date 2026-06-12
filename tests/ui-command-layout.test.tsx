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
      '/api/agent-artifacts': []
    };
    return { ok: true, json: async () => responses[path] ?? [] };
  }));
});

describe('Stronghold command-center layout', () => {
  it('organizes the cockpit into context, primary workflow, and monitoring side panels without shell controls', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    expect(document.querySelector('.commandShell')).toBeTruthy();
    expect(document.querySelector('.commandGrid')).toBeTruthy();

    const leftRail = document.querySelector('[aria-label="Stronghold context"]');
    const centerDeck = document.querySelector('[aria-label="Primary command workflows"]');
    const rightRail = document.querySelector('[aria-label="Approvals, audit, and safety monitoring"]');

    expect(leftRail?.textContent).toContain('Stronghold Telemetry');
    expect(leftRail?.textContent).toContain('Engineering Division Roster');
    expect(centerDeck?.textContent).toContain('Phase 3 Agent Orchestration');
    expect(centerDeck?.textContent).toContain('Mission Proposal');
    expect(centerDeck?.textContent).toContain('Mission Board');
    expect(rightRail?.textContent).toContain('Approval Queue');
    expect(rightRail?.textContent).toContain('Audit Trail');
    expect(rightRail?.textContent).toContain('Cron / Schedule Monitor');

    const text = document.body.textContent?.toLowerCase() || '';
    expect(text).toContain('guarded');
    expect(text).toContain('no shell');
    expect(text).not.toContain('shell command');
    expect(text).not.toContain('execute command');
  });

  it('reduces information density with collapsed intel, monitoring, and mission detail panels', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const collapsiblePanels = Array.from(document.querySelectorAll('details.uxDisclosure')) as HTMLDetailsElement[];
    expect(collapsiblePanels.length).toBeGreaterThanOrEqual(6);

    const rosterPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Engineering Division Roster'));
    const inventoryPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Agent Army Inventory'));
    const auditPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Audit Trail'));

    expect(rosterPanel?.open).toBe(false);
    expect(inventoryPanel?.open).toBe(false);
    expect(auditPanel?.open).toBe(false);

    const missionDetails = document.querySelector('details.missionDisclosure') as HTMLDetailsElement | null;
    expect(missionDetails).toBeTruthy();
    expect(missionDetails?.open).toBe(false);

    expect(document.body.textContent).toContain('Phase 2/3 gate locked');
    expect(document.body.textContent?.toLowerCase()).not.toContain('generic command');
  });
});
