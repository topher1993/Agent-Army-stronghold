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
  it('renders mission control and read-only label', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    await act(async () => { createRoot(el).render(<App />); });
    expect(document.body.textContent).toContain('Agent-Army Mission Control');
    expect(document.body.textContent).toContain('READ ONLY');
    expect(document.body.textContent).toContain('Engineering Division Roster');
  });
});
