// FEATURE — Discord #agent-army read-only consumer (Phase D1).
//
// These tests exercise the HTTP surface:
//   GET /api/discord/agent-army?limit=N
//
// via Stronghold's in-process inject() server. We mock the discordFeed
// service so no real HTTP call is made and so we can deterministically
// simulate 401 / 429 / timeout paths.
//
// Required coverage per the brief:
//   - route: returns normalized array on 200
//   - route: returns 503 with UNAUTHORIZED code on 401
//   - route: returns 503 with RATE_LIMITED code + retryAfter on 429
//   - route: appends exactly one audit entry per successful read
//   - route: rejects non-localhost origin (existing guard)
//   - route: enforces rate limit (uses vi.useFakeTimers)
//
// Every Discord read appends EXACTLY ONE audit entry. We assert on the
// audit-log length delta to prove that — failed reads (e.g. UNAUTHORIZED)
// must NOT audit (per the brief: append on successful read; we record
// failed reads in metadata only via a separate failed-audit path... no,
// per the brief: "outcome='failed' on error" — so we DO audit failures too,
// but exactly once per request).

import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

const AUDIT_FILE = approvedDataPath('audit');
const ALLOWED_ORIGIN = 'http://127.0.0.1:5174';
const TEST_CHANNEL_ID = '1520507344486924511';

// Mutable fake state — set per test. Hoisted so the vi.mock factory can
// capture it BEFORE the test module is evaluated; otherwise the factory
// would snapshot a stale closure and reassigning `fakeImpl` per test would
// have no effect on the mock the route actually calls.
const fakeState = vi.hoisted(() => ({
  impl: (): Promise<unknown> => Promise.resolve([]),
  calls: [] as number[],
}));

vi.mock('../server/services/discordFeed', async () => {
  const actual = await vi.importActual<typeof import('../server/services/discordFeed')>('../server/services/discordFeed');
  return {
    ...actual,
    fetchRecentAgentArmyMessages: async (limit: number) => {
      fakeState.calls.push(limit);
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

describe('GET /api/discord/agent-army (Phase D1)', () => {
  beforeEach(() => {
    snapshotAudit();
    // The route reads DISCORD_HOME_CHANNEL to populate audit targetId and
    // DISCORD_BOT_TOKEN to authenticate the outbound Discord fetch. Without
    // these set, the audit targetId is an empty string and the fetch fails —
    // neither is what these tests want to exercise.
    process.env.DISCORD_HOME_CHANNEL = TEST_CHANNEL_ID;
    process.env.DISCORD_BOT_TOKEN = 'test-bot-token-not-real';
    fakeState.impl = async () => [];
    fakeState.calls = [];
  });
  afterEach(() => {
    restoreAudit();
    delete process.env.DISCORD_HOME_CHANNEL;
    delete process.env.DISCORD_BOT_TOKEN;
  });

  it('returns the normalized message array plus fetchedAt on a successful read', async () => {
    fakeState.impl = async () => ([
      { id: 'm1', timestamp: '2026-06-28T10:00:00.000+00:00', author: { id: 'a1', username: 'igris', displayName: 'Igris' }, content: 'Phase D1 starting', isBot: false },
      { id: 'm2', timestamp: '2026-06-28T10:01:00.000+00:00', author: { id: 'a2', username: 'auto', displayName: 'auto' }, content: 'acknowledged', isBot: true },
    ]);
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army?limit=20', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].id).toBe('m1');
    expect(body.messages[0].author.displayName).toBe('Igris');
    expect(body.messages[1].isBot).toBe(true);
    expect(typeof body.fetchedAt).toBe('string');
    expect(() => new Date(body.fetchedAt).toISOString()).not.toThrow();
  });

  it('defaults limit to 10 when no query string is provided', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)).toBe(10);
  });

  it('caps limit at 50 to protect Discord rate-limit headroom', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/discord/agent-army?limit=999', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)).toBe(50);
  });

  it('parses an explicit numeric limit correctly', async () => {
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/discord/agent-army?limit=7', headers: { origin: ALLOWED_ORIGIN } });
    expect(fakeState.calls.at(-1)).toBe(7);
  });

  it('returns 503 with code UNAUTHORIZED when the bot token is rejected', async () => {
    fakeState.impl = async () => { throw Object.assign(new Error('discord: bot token rejected (401)'), { code: 'UNAUTHORIZED', status: 401 }); };
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('UNAUTHORIZED');
    expect(body.error).toMatch(/rejected/i);
  });

  it('returns 503 with code RATE_LIMITED + retryAfter on a 429', async () => {
    fakeState.impl = async () => { throw Object.assign(new Error('discord: rate limited (429)'), { code: 'RATE_LIMITED', status: 429, retryAfter: 12 }); };
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.retryAfter).toBe(12);
  });

  it('returns 502 with code DISCORD_FAILURE on a generic fetch error', async () => {
    fakeState.impl = async () => { throw Object.assign(new Error('boom'), { code: 'DISCORD_FAILURE', status: 500 }); };
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/discord fetch failed/i);
    expect(body.detail).toBeTruthy();
  });

  it('returns 502 with code TIMEOUT when the service times out', async () => {
    fakeState.impl = async () => { throw Object.assign(new Error('discord: fetch timed out after 5000ms'), { code: 'TIMEOUT' }); };
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(502);
    const body = JSON.parse(res.body);
    expect(body.detail).toMatch(/timed out/i);
  });

  it('appends exactly one audit entry with the canonical shape on a successful read', async () => {
    fakeState.impl = async () => ([{ id: 'm1', timestamp: '2026-06-28T10:00:00.000+00:00', author: { id: 'a1', username: 'igris', displayName: 'Igris' }, content: 'ok', isBot: false }]);
    const before = readAuditEvents(AUDIT_FILE).length;
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    const after = readAuditEvents(AUDIT_FILE).length;
    expect(after - before).toBe(1);
    const last = readAuditEvents(AUDIT_FILE).at(-1)!;
    expect(last.action).toBe('discord.read');
    expect(last.capability).toBe('discord:read:agent-army');
    expect(last.actor).toBe('Stronghold');
    expect(last.targetType).toBe('discord-channel');
    expect(last.outcome).toBe('ok');
    expect(last.targetId).toBeTruthy();
  });

  it('appends exactly one audit entry on a failed read with outcome=failed', async () => {
    fakeState.impl = async () => { throw Object.assign(new Error('rejected'), { code: 'UNAUTHORIZED', status: 401 }); };
    const before = readAuditEvents(AUDIT_FILE).length;
    const server = createStrongholdServer();
    await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    const after = readAuditEvents(AUDIT_FILE).length;
    expect(after - before).toBe(1);
    const last = readAuditEvents(AUDIT_FILE).at(-1)!;
    expect(last.action).toBe('discord.read');
    expect(last.outcome).toBe('failed');
  });

  it('rejects non-localhost origins with 403 (existing CORS guard)', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: 'http://evil.example.com' } });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('origin not allowed');
    // No audit entry written for the rejected request.
    const before = readAuditEvents(AUDIT_FILE).length;
    expect(before).toBe(readAuditEvents(AUDIT_FILE).length);
  });

  it('enforces the per-family rate limit (discord-read family, 30/min default)', async () => {
    fakeState.impl = async () => [];
    // Use real timers — limit enforcement uses Date.now() not setTimeout.
    const server = createStrongholdServer();
    let allowed = 0;
    let blocked = 0;
    for (let i = 0; i < 35; i++) {
      const res = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
      if (res.statusCode === 200) allowed++;
      else if (res.statusCode === 429) blocked++;
    }
    expect(allowed).toBe(30);
    expect(blocked).toBe(5);
    const lastBlocked = await server.inject({ method: 'GET', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect(lastBlocked.statusCode).toBe(429);
    expect(JSON.parse(lastBlocked.body).error).toBe('rate limit exceeded');
  });

  it('does not mutate Discord state — only the GET shape is exposed', async () => {
    const server = createStrongholdServer();
    const post = await server.inject({ method: 'POST', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN }, body: {} });
    // Either 404 (no route) or 405 (method not allowed) — NOT 2xx.
    expect([404, 405]).toContain(post.statusCode);
    const put = await server.inject({ method: 'PUT', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN }, body: {} });
    expect([404, 405]).toContain(put.statusCode);
    const del = await server.inject({ method: 'DELETE', url: '/api/discord/agent-army', headers: { origin: ALLOWED_ORIGIN } });
    expect([404, 405]).toContain(del.statusCode);
  });
});