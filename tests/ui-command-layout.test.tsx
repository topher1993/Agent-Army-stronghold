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

describe('Stronghold Agentic OS default landing layout', () => {
  it('puts the Agentic OS dashboard in the main column with Approvals/Audit/Cron in the right rail (no left rail)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    expect(document.querySelector('.commandShell')).toBeTruthy();
    expect(document.querySelector('.commandGrid')).toBeTruthy();

    // The left rail is gone — no 'Stronghold context' aside.
    expect(document.querySelector('[aria-label="Stronghold context"]')).toBeNull();

    // The Agentic OS dashboard is the dominant content in the main area.
    const dashboardSection = document.querySelector('#dashboard-section');
    expect(dashboardSection).toBeTruthy();
    expect(dashboardSection?.textContent).toContain('Agentic OS Dashboard');
    // Compact dashboard (Phase E): App Health was deleted, QC Score History is
    // the first content section rendered.
    expect(dashboardSection?.textContent).toContain('QC Score History');
    expect(dashboardSection?.textContent).toContain('Activity');

    // The right rail contains operational tools only.
    const rightRail = document.querySelector('[aria-label="Approvals, audit, and operations monitoring"]');
    expect(rightRail).toBeTruthy();
    expect(rightRail?.textContent).toContain('Approval Queue');
    expect(rightRail?.textContent).toContain('Audit Trail');
    expect(rightRail?.textContent).toContain('Cron / Schedule Manager');

    // Operations section contains the proposal/orchestration/mission/safety content.
    const operationsSection = document.querySelector('#operations-section');
    expect(operationsSection).toBeTruthy();
    expect(operationsSection?.textContent).toContain('Mission Proposal');
    expect(operationsSection?.textContent).toContain('Task Proposal');
    expect(operationsSection?.textContent).toContain('Phase 3 Agent Orchestration');

    // No fake / stale static components in the default view.
    const text = document.body.textContent?.toLowerCase() || '';
    expect(text).not.toContain('stronghold telemetry');
    expect(text).not.toContain('engineering division roster');
    expect(text).not.toContain('agent army inventory');

    // Guarded posture is still present.
    expect(text).toContain('guarded');
    expect(text).toContain('no shell');
    expect(text).not.toContain('shell command');
    expect(text).not.toContain('execute command');
  });

  it('reduces information density with collapsed disclosures and collapsed mission details', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // Right rail has 3 disclosures (Approval Queue, Audit Trail, Cron).
    const collapsiblePanels = Array.from(document.querySelectorAll('aside.rightRail details.uxDisclosure')) as HTMLDetailsElement[];
    expect(collapsiblePanels.length).toBe(3);

    const approvalPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Approval Queue'));
    const auditPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Audit Trail'));
    const cronPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Cron / Schedule Manager'));

    expect(approvalPanel?.open).toBe(true);
    expect(auditPanel?.open).toBe(false);
    expect(cronPanel?.open).toBe(true);

    // Mission Board missions are still rendered as collapsed <details>.
    const missionDetails = document.querySelector('details.missionDisclosure') as HTMLDetailsElement | null;
    expect(missionDetails).toBeTruthy();
    expect(missionDetails?.open).toBe(false);

    expect(document.body.textContent).toContain('Phase 2/3 gate locked');
    expect(document.body.textContent?.toLowerCase()).not.toContain('generic command');
  });
});