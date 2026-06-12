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

describe('Phase 4 mobile app mode', () => {
  it('renders bottom mobile tab navigation with command selected by default', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const nav = document.querySelector('[aria-label="Mobile command sections"]');
    expect(nav).toBeTruthy();

    const tabs = Array.from(nav?.querySelectorAll('button') ?? []);
    expect(tabs).toHaveLength(5);
    expect(tabs.map(tab => tab.textContent)).toEqual(['Command', 'Approvals', 'Missions', 'Intel', 'Safety']);

    expect(document.querySelector('.commandGrid')?.className).toContain('active-command');
    const commandTab = tabs.find(tab => tab.textContent === 'Command');
    expect(commandTab?.getAttribute('aria-selected')).toBe('true');
    expect(commandTab?.getAttribute('aria-controls')).toBe('command-section');
  });

  it('switches app sections while keeping guarded content and no shell controls', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    const tabs = Array.from(document.querySelectorAll('[aria-label="Mobile command sections"] button'));
    const approvalsTab = tabs.find(tab => tab.textContent === 'Approvals')!;
    const intelTab = tabs.find(tab => tab.textContent === 'Intel')!;

    await act(async () => { approvalsTab.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.querySelector('.commandGrid')?.className).toContain('active-approvals');
    expect(document.querySelector('#approvals-section')?.getAttribute('aria-hidden')).toBe('false');
    expect(document.querySelector('#command-section')?.getAttribute('aria-hidden')).toBe('true');

    await act(async () => { intelTab.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(document.querySelector('.commandGrid')?.className).toContain('active-intel');
    expect(document.querySelector('#intel-section')?.getAttribute('aria-hidden')).toBe('false');

    const text = document.body.textContent || '';
    expect(text).toContain('GUARDED');
    expect(text).toContain('No shell');
    expect(text).toContain('Approval Queue');
    expect(text).toContain('Stronghold Telemetry');
    expect(text.toLowerCase()).not.toContain('execute command');
    expect(text.toLowerCase()).not.toContain('shell command');
  });

  it('uses mobile-specific section ids and viewport classes for app-like scrolling', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });

    expect(document.querySelector('#command-section')?.className).toContain('mobileSection');
    expect(document.querySelector('#approvals-section')?.className).toContain('mobileSection');
    expect(document.querySelector('#missions-section')?.className).toContain('mobileSection');
    expect(document.querySelector('#intel-section')?.className).toContain('mobileSection');
    expect(document.querySelector('#safety-section')?.className).toContain('mobileSection');
  });
});
