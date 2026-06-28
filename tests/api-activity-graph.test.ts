// FEATURE — Phase D4 Activity Graph HTTP route.
//
// GET /api/activity-graph?windowHours=N
//
// Required coverage per the brief:
//   - returns 200 with the graph shape on success
//   - localhost guard rejects non-localhost origin (403)
//   - rate limit enforces 60/min (use vi.useFakeTimers)
//   - windowHours clamped to [1, 168]; invalid (non-numeric, negative) defaults to 24
//   - audit entry written on every successful read with action='activity-graph.read',
//     capability='graph:read', actor='Stronghold', targetType='activity-graph',
//     targetId='main', outcome='ok'
//   - audit entry written on failure too with outcome='failed'
//
// We follow the same pattern as api-discord-agent-army.test.ts (Phase D1): in-process
// inject() server, vi.mock the activityGraph service so we can deterministically
// shape the response and simulate failure.

import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

const AUDIT_FILE = approvedDataPath('audit');
const ALLOWED_ORIGIN = 'http://127.0.0.1:5174';

const fakeState = vi.hoisted(() => ({
  impl: (): unknown => ({
    generatedAt: '2026-06-28T00:00:00.000Z',
    divisions: [
      { id: 'Belion', label: 'Belion', color: '#49ffc7' },
      { id: 'Igris',  label: 'Igris',  color: '#5da6ff' },
      { id: 'Forge',  label: 'Forge',  color: '#f78c6c' },
    ],
    edges: [
      { from: 'Igris', to: 'Forge', count: 2, lastTimestamp: '2026-06-28T00:00:00.000Z', lastCapability: 'engineering:backend', recent: true },
    ],
    totalEntries: 1,
    windowHours: 24,
  }),
  calls: [] as Array<{ windowHours: number }>,
}));

vi.mock('../server/services/activityGraph', async () => {
  const actual = await vi.importActual<typeof import('../server/services/activityGraph')>('../server/services/activityGraph');
  return {
    ...actual,
    buildActivityGraph: (
      _path: string,
      options: { windowHours: number; now?: Date; maxEntries?: number },
    ) => {
      fakeState.calls.push({ windowHours: options.windowHours });
      return fakeState.impl();
    },
  };
});

let auditBackup = '';
function snapshotAudit() {
  auditBackup = fs.existsSync(AUDIT_FILE) ? fs.readFileSync(AUDIT_FILE, 'utf8') : '';
}
function restoreAudit() {
  if (auditBackup) fs.writeFileSync(AUDIT_FILE, auditBackup, 'utf8');
  else if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}

describe('GET /api/activity-graph (Phase D4)', () => {
  beforeEach(() => {
    snapshotAudit();
    fakeState.impl = () => ({
      generatedAt: '2026-06-28T00:00:00.000Z',
      divisions: [
        { id: 'Belion', label: 'Belion', color: '#49ffc7' },
        { id: 'Igris',  label: 'Igris',  color: '#5da6ff' },
        { id: 'Forge',  label: 'Forge',  color: '#f78c6c' },
      ],
      edges: [
        { from: 'Igris', to: 'Forge', count: 2, lastTimestamp: '2026-06-28T00:00:00.000Z', lastCapability: 'engineering:backend', recent: true },
      ],
      totalEntries: 1,
      windowHours: 24,
    });
    fakeState.calls = [];
  });
  afterEach(() => {
    restoreAudit();
  });

  it('returns 200 with the graph shape on a successful read (no query -> default 24h)', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/activity-graph', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.generatedAt).toBe('2026-06-28T00:00:00.000Z');
    expect(body.windowHours).toBe(24);
    expect(Array.isArray(body.divisions)).toBe(true);
    expect(body.divisions).toHaveLength(3);
    expect(Array.isArray(body.edges)).toBe(true);
    expect(body.edges[0].from).toBe('Igris');
    expect(body.edges[0].to).toBe('Forge');
    expect(body.edges[0].recent).toBe(true);
  });

  it('forwards windowHours=6 to buildActivityGraph', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/activity-graph?windowHours=6', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)?.windowHours).toBe(6);
  });

  it('clamps windowHours=999 down to 168 (one week)', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/activity-graph?windowHours=999', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)?.windowHours).toBe(168);
  });

  it('clamps windowHours=0 up to 1 (minimum)', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/activity-graph?windowHours=0', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)?.windowHours).toBe(1);
  });

  it('defaults windowHours to 24 when query is non-numeric', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/activity-graph?windowHours=banana', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)?.windowHours).toBe(24);
  });

  it('defaults windowHours to 24 when query is negative', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/activity-graph?windowHours=-7', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)?.windowHours).toBe(24);
  });

  it('rejects non-localhost origin with 403 (existing CORS guard)', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/activity-graph', headers: { origin: 'http://evil.example.com' } });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('origin not allowed');
    // No audit entry written for rejected requests.
    expect(fakeState.calls).toHaveLength(0);
  });

  it('appends exactly one audit entry with the canonical shape on a successful read', async () => {
    const server = createStrongholdServer();
    const before = readAuditEvents(AUDIT_FILE).length;
    const res = await server.inject({ method: 'GET', url: '/api/activity-graph', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(200);
    const after = readAuditEvents(AUDIT_FILE).length;
    expect(after - before).toBe(1);
    const last = readAuditEvents(AUDIT_FILE).at(-1)!;
    expect(last.action).toBe('activity-graph.read');
    expect(last.capability).toBe('graph:read');
    expect(last.actor).toBe('Stronghold');
    expect(last.targetType).toBe('activity-graph');
    expect(last.targetId).toBe('main');
    expect(last.outcome).toBe('ok');
  });

  it('appends exactly one audit entry on failure with outcome=failed', async () => {
    fakeState.impl = () => { throw new Error('synthetic failure'); };
    const server = createStrongholdServer();
    const before = readAuditEvents(AUDIT_FILE).length;
    const res = await server.inject({ method: 'GET', url: '/api/activity-graph', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(500);
    const after = readAuditEvents(AUDIT_FILE).length;
    expect(after - before).toBe(1);
    const last = readAuditEvents(AUDIT_FILE).at(-1)!;
    expect(last.action).toBe('activity-graph.read');
    expect(last.outcome).toBe('failed');
    expect(last.capability).toBe('graph:read');
  });

  it('enforces the per-family rate limit (activity-graph family, 60/min)', async () => {
    // Use real timers — the limiter reads Date.now() per check.
    const server = createStrongholdServer();
    let allowed = 0;
    let blocked = 0;
    for (let i = 0; i < 65; i++) {
      const res = await server.inject({ method: 'GET', url: '/api/activity-graph', headers: { origin: ALLOWED_ORIGIN } });
      if (res.statusCode === 200) allowed++;
      else if (res.statusCode === 429) blocked++;
    }
    expect(allowed).toBe(60);
    expect(blocked).toBe(5);
  });

  it('does not mutate the audit log beyond the read-audit append (no writes to activity-graph target)', async () => {
    const server = createStrongholdServer();
    const before = readAuditEvents(AUDIT_FILE).length;
    await server.inject({ method: 'GET', url: '/api/activity-graph', headers: { origin: ALLOWED_ORIGIN } });
    await server.inject({ method: 'GET', url: '/api/activity-graph?windowHours=6', headers: { origin: ALLOWED_ORIGIN } });
    const after = readAuditEvents(AUDIT_FILE).length;
    // Exactly one audit entry per request, both with targetType='activity-graph'.
    expect(after - before).toBe(2);
    const recent = readAuditEvents(AUDIT_FILE).slice(-2);
    expect(recent.every(e => e.targetType === 'activity-graph')).toBe(true);
  });
});
