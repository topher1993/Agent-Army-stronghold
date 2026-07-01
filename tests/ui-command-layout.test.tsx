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
  it('puts the Agentic OS dashboard full-width on the dashboard tab and moves approvals/audit/cron into Operations', async () => {
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
    expect(dashboardSection?.textContent).toContain('QC Score History');
    expect(dashboardSection?.textContent).toContain('Activity');

    // The right rail is gone — Approvals/Audit/Cron moved into Operations.
    expect(document.querySelector('aside.rightRail')).toBeNull();
    expect(document.querySelector('[aria-label="Approvals, audit, and operations monitoring"]')).toBeNull();

    // Operations section is now home for approvals + audit + cron + proposals + safety.
    const operationsSection = document.querySelector('#operations-section');
    expect(operationsSection).toBeTruthy();
    expect(operationsSection?.textContent).toContain('Approval Queue');
    expect(operationsSection?.textContent).toContain('Audit Trail');
    expect(operationsSection?.textContent).toContain('Cron / Schedule Manager');
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

  it('Approval Queue is the only disclosure open by default in Operations (Audit and Cron collapsed)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // The 3 disclosures (Approval Queue, Audit Trail, Cron / Schedule Manager)
    // now live inside the operations section, not a right rail aside.
    const operationsSection = document.querySelector('#operations-section');
    expect(operationsSection).toBeTruthy();

    const collapsiblePanels = Array.from(
      operationsSection?.querySelectorAll('details.uxDisclosure') ?? []
    ) as HTMLDetailsElement[];

    const approvalPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Approval Queue'));
    const auditPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Audit Trail'));
    const cronPanel = collapsiblePanels.find(panel => panel.querySelector('summary')?.textContent?.includes('Cron / Schedule Manager'));

    expect(approvalPanel).toBeTruthy();
    expect(auditPanel).toBeTruthy();
    expect(cronPanel).toBeTruthy();
    expect(approvalPanel?.open).toBe(true);
    expect(auditPanel?.open).toBe(false);
    expect(cronPanel?.open).toBe(false);

    // Mission Board missions are still rendered as collapsed <details>.
    const missionDetails = document.querySelector('details.missionDisclosure') as HTMLDetailsElement | null;
    expect(missionDetails).toBeTruthy();
    expect(missionDetails?.open).toBe(false);

    expect(document.body.textContent).toContain('Phase 2/3 gate locked');
    expect(document.body.textContent?.toLowerCase()).not.toContain('generic command');
  });
});