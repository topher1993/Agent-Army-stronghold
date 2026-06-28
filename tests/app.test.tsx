import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import snapshot from '../public/data/stronghold-snapshot.json';
import { App } from '../src/App';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => snapshot })));
});

describe('App', () => {
  it('renders mission control and the Agentic OS dashboard as the default landing view', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });
    expect(document.body.textContent).toContain('Agent-Army Mission Control');
    expect(document.body.textContent).toContain('GUARDED');
    // The Agentic OS dashboard is the default view — its hero should be
    // present without the user clicking any tab.
    expect(document.body.textContent).toContain('Agentic OS Dashboard');
    // Compact dashboard (Phase E — igris-compact-dashboard-brief): App Health
    // section was deleted. QC Score History is still the canonical section header.
    expect(document.body.textContent).toContain('QC Score History');
  });
});