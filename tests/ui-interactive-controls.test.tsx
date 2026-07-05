import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import snapshot from '../public/data/stronghold-snapshot.json';
import { App } from '../src/App';

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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    if (!String(url).includes('/api/')) return { ok: true, json: async () => snapshot };
    if (init?.method === 'POST') return { ok: true, json: async () => ({ id: 'created-1', status: 'pending_review', title: 'Created' }) };
    const path = new URL(String(url)).pathname;
    return { ok: true, json: async () => responses[path] ?? [] };
  }));
});

describe('Phase 3.5 interactive controls (Phase 47 — sidebar nav)', () => {
  it('renders real forms, buttons, and backend-backed panels on the Operations surface', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    // Phase 47: interactive controls (proposals, audit, orchestration) live on the Operations surface.
    // Approval Queue is now its own sidebar surface (per N7 — kill right rails).
    const sidebar = document.querySelector('.sidebar');
    const opsItem = sidebar?.querySelector('[data-surface-id="operations"]') as HTMLButtonElement | null;
    expect(opsItem).toBeTruthy();
    await act(async () => { opsItem!.click(); });

    const text = document.body.textContent || '';
    expect(text).toContain('Mission title');
    expect(text).toContain('Create mission proposal');
    expect(text).toContain('Task title');
    expect(text).toContain('Create task proposal');
    expect(text).toContain('Create work card proposal');
    expect(text).toContain('Create agent request');
    expect(text).toContain('No agent requests yet');
  });

  it('renders the Approval Queue separately on the Approvals surface', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const sidebar = document.querySelector('.sidebar');
    const approvalsItem = sidebar?.querySelector('[data-surface-id="approvals"]') as HTMLButtonElement | null;
    expect(approvalsItem).toBeTruthy();
    await act(async => { approvalsItem!.click(); });

    const text = document.body.textContent || '';
    expect(text).toContain('Approval Queue');
    expect(text).toContain('No pending approvals');
  });
});