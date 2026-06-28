// FEATURE 2 — Cron CRUD tests
//
// The cron endpoints proxy to the host's `hermes cron` tool. To keep tests
// deterministic we INJECT the cron dispatcher into server/index.ts. The
// default real dispatcher shells out to the CLI; tests use a fake.
// Each test resets the shared audit + approvals + data files so cron mutations
// do not leak between cases.
//
// Required test groups per the brief:
//   - cron:list-passes-through
//   - cron:get-unknown-404
//   - cron:create-validates-schedule
//   - cron:create-validates-name-charset
//   - cron:update-pause-resume-round-trip
//   - cron:delete-requires-confirm
//   - cron:invalid-schedule-400
//   - audit: every mutating action writes exactly one append-only entry with
//     the correct shape.

import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

const AUDIT_FILE = approvedDataPath('audit');

let auditBackup = '';
let lastCreateArgs: unknown;
let nextCreateResponse: unknown = { id: 'cron_test_1', name: 'seed', status: 'created' };

function snapshotFiles() {
  auditBackup = fs.existsSync(AUDIT_FILE) ? fs.readFileSync(AUDIT_FILE, 'utf8') : '';
}
function restoreFiles() {
  if (auditBackup) fs.writeFileSync(AUDIT_FILE, auditBackup, 'utf8');
  else if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}
function clearFiles() {
  if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}

// Build a fake dispatcher that the route will call instead of the real shell
// invocation. We mutate module state to vary behaviour per test.
let fakeJobs: Array<Record<string, unknown>> = [];
let fakeGetThrows: Error | null = null;
let fakeListThrows: Error | null = null;
let fakeCreateThrows: Error | null = null;
let fakeUpdateThrows: Error | null = null;
let fakePauseThrows: Error | null = null;
let fakeResumeThrows: Error | null = null;
let fakeRemoveThrows: Error | null = null;

vi.mock('../server/services/cronService', async () => {
  const actual = await vi.importActual<typeof import('../server/services/cronService')>('../server/services/cronService');
  return {
    ...actual,
    callHermesCron: async (action: string, args: unknown) => {
      lastCreateArgs = args;
      if (action === 'list') {
        if (fakeListThrows) throw fakeListThrows;
        return fakeJobs;
      }
      if (action === 'get') {
        if (fakeGetThrows) throw fakeGetThrows;
        const id = (args as { id: string }).id;
        const found = fakeJobs.find(j => j.id === id);
        if (!found) throw Object.assign(new Error(`cron job not found: ${id}`), { code: 'NOT_FOUND' });
        return found;
      }
      if (action === 'create') {
        if (fakeCreateThrows) throw fakeCreateThrows;
        const id = `cron_${Math.random().toString(36).slice(2, 10)}`;
        const input = args as Record<string, unknown>;
        const created = {
          id,
          name: input.name,
          schedule: input.schedule,
          prompt: input.prompt,
          skills: input.skills || [],
          deliver: input.deliver || 'origin',
          enabled: input.enabled !== false,
          toolsets: [],
          profile: 'default',
          lastStatus: undefined,
          nextRun: undefined,
          noAgent: false,
        };
        fakeJobs.push(created);
        nextCreateResponse = created;
        return created;
      }
      if (action === 'update') {
        if (fakeUpdateThrows) throw fakeUpdateThrows;
        const input = args as { id: string } & Record<string, unknown>;
        const idx = fakeJobs.findIndex(j => j.id === input.id);
        if (idx < 0) throw Object.assign(new Error('cron job not found'), { code: 'NOT_FOUND' });
        fakeJobs[idx] = { ...fakeJobs[idx], ...input };
        return fakeJobs[idx];
      }
      if (action === 'pause') {
        if (fakePauseThrows) throw fakePauseThrows;
        const input = args as { id: string };
        const idx = fakeJobs.findIndex(j => j.id === input.id);
        if (idx < 0) throw Object.assign(new Error('cron job not found'), { code: 'NOT_FOUND' });
        fakeJobs[idx] = { ...fakeJobs[idx], enabled: false, paused: true };
        return fakeJobs[idx];
      }
      if (action === 'resume') {
        if (fakeResumeThrows) throw fakeResumeThrows;
        const input = args as { id: string };
        const idx = fakeJobs.findIndex(j => j.id === input.id);
        if (idx < 0) throw Object.assign(new Error('cron job not found'), { code: 'NOT_FOUND' });
        fakeJobs[idx] = { ...fakeJobs[idx], enabled: true, paused: false };
        return fakeJobs[idx];
      }
      if (action === 'remove') {
        if (fakeRemoveThrows) throw fakeRemoveThrows;
        const input = args as { id: string };
        const idx = fakeJobs.findIndex(j => j.id === input.id);
        if (idx < 0) throw Object.assign(new Error('cron job not found'), { code: 'NOT_FOUND' });
        const removed = fakeJobs.splice(idx, 1)[0];
        return { ok: true as const, id: removed.id };
      }
      throw new Error(`unknown cron action: ${action}`);
    },
  };
});

describe('Phase C — Cron CRUD (live proxy, mocked dispatcher)', () => {
  beforeEach(() => {
    snapshotFiles();
    clearFiles();
    fakeJobs = [
      { id: 'cron_seed_a', name: 'Seed A', schedule: '*/5 * * * *', prompt: 'do a', enabled: true, skills: [], deliver: 'origin', toolsets: [], profile: 'default', noAgent: false },
      { id: 'cron_seed_b', name: 'Seed B', schedule: '0 9 * * *', prompt: 'do b', enabled: false, skills: ['jisho-phrase-verification'], deliver: 'local', toolsets: [], profile: 'default', noAgent: false },
    ];
    fakeGetThrows = null;
    fakeListThrows = null;
    fakeCreateThrows = null;
    fakeUpdateThrows = null;
    fakePauseThrows = null;
    fakeResumeThrows = null;
    fakeRemoveThrows = null;
    lastCreateArgs = null;
  });
  afterEach(() => { restoreFiles(); });

  it('cron:list-passes-through — GET /api/cron returns the dispatcher payload unchanged', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/cron' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(2);
    expect(body[0]).toMatchObject({ id: 'cron_seed_a', name: 'Seed A' });
  });

  it('cron:get-unknown-404 — GET /api/cron/:id with unknown id returns 404', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/cron/does_not_exist' });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toMatchObject({ error: 'cron job not found' });
  });

  it('cron:create-validates-schedule — POST /api/cron with garbage schedule returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'Bad schedule', schedule: 'every tuesday', prompt: 'do something' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/schedule/i);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(0);
  });

  it('cron:create-validates-name-charset — name with control chars returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'bad\x07name', schedule: '*/5 * * * *', prompt: 'do something' },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/name/i);
  });

  it('cron:create-validates-prompt-length — prompt under 1 or over 10000 chars returns 400', async () => {
    const server = createStrongholdServer();
    const tooLong = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'long', schedule: '*/5 * * * *', prompt: 'x'.repeat(10001) },
    });
    expect(tooLong.statusCode).toBe(400);
    const empty = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'empty', schedule: '*/5 * * * *', prompt: '' },
    });
    expect(empty.statusCode).toBe(400);
  });

  it('cron:create-validates-skills-allowlist — unknown skill returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'Bad skill', schedule: '*/5 * * * *', prompt: 'do', skills: ['not-a-real-skill'] },
    });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/skill/i);
  });

  it('cron:create-validates-deliver — bad deliver value returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'Bad deliver', schedule: '*/5 * * * *', prompt: 'do', deliver: 'twitter' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cron:create-validates-model — bad provider pattern returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'Bad model', schedule: '*/5 * * * *', prompt: 'do', model: { provider: 'bad provider with spaces', model: 'x' } },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cron:update-pause-resume-round-trip — PATCH /api/cron/:id updates fields, pause then resume toggles enabled', async () => {
    const server = createStrongholdServer();
    // 1. Update name + schedule
    const patch = await server.inject({
      method: 'PATCH', url: '/api/cron/cron_seed_a',
      body: { name: 'Seed A renamed', schedule: '0 12 * * *' },
    });
    expect(patch.statusCode).toBe(200);
    const patched = JSON.parse(patch.body);
    expect(patched.name).toBe('Seed A renamed');
    expect(patched.schedule).toBe('0 12 * * *');

    // 2. Pause
    const pause = await server.inject({ method: 'POST', url: '/api/cron/cron_seed_a/pause' });
    expect(pause.statusCode).toBe(200);
    expect(JSON.parse(pause.body).enabled).toBe(false);

    // 3. Resume
    const resume = await server.inject({ method: 'POST', url: '/api/cron/cron_seed_a/resume' });
    expect(resume.statusCode).toBe(200);
    expect(JSON.parse(resume.body).enabled).toBe(true);

    // 4. Each mutating call wrote exactly one audit entry.
    const events = readAuditEvents(AUDIT_FILE);
    const actions = events.map(e => e.action);
    expect(actions).toEqual(expect.arrayContaining(['cron.update', 'cron.pause', 'cron.resume']));
    // No duplicates.
    const updateCount = actions.filter(a => a === 'cron.update').length;
    const pauseCount = actions.filter(a => a === 'cron.pause').length;
    const resumeCount = actions.filter(a => a === 'cron.resume').length;
    expect(updateCount).toBe(1);
    expect(pauseCount).toBe(1);
    expect(resumeCount).toBe(1);
  });

  it('cron:delete-requires-confirm — DELETE /api/cron/:id without confirm=true returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'DELETE', url: '/api/cron/cron_seed_a', body: {} });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toMatch(/confirm/i);
    // Job should still exist.
    const list = JSON.parse((await server.inject({ method: 'GET', url: '/api/cron' })).body);
    expect(list.some((j: { id: string }) => j.id === 'cron_seed_a')).toBe(true);
  });

  it('cron:delete-with-confirm — DELETE /api/cron/:id with confirm=true removes the job and writes one audit entry', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'DELETE', url: '/api/cron/cron_seed_a', body: { confirm: true } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true, id: 'cron_seed_a' });
    const events = readAuditEvents(AUDIT_FILE);
    const del = events.find(e => e.action === 'cron.delete' && e.targetId === 'cron_seed_a');
    expect(del).toBeTruthy();
    expect(del!.actor).toBe('ui-button');
    expect(del!.outcome).toBe('approved');
    expect(del!.targetType).toBe('changeRequest');
  });

  it('cron:invalid-schedule-400 — POST /api/cron with non-string schedule returns 400', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'no-sched', schedule: 12345 as unknown as string, prompt: 'do' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('cron:create-success — POST /api/cron with valid input creates the job and writes one audit entry', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: {
        name: 'New cron job',
        schedule: '*/15 * * * *',
        prompt: 'summarize the inbox',
        skills: ['jisho-phrase-verification'],
        deliver: 'origin',
        enabled: true,
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.id).toMatch(/^cron_/);
    expect(body.name).toBe('New cron job');

    const events = readAuditEvents(AUDIT_FILE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.action).toBe('cron.create');
    expect(e.actor).toBe('ui-button');
    expect(e.capability).toBe('cron:create');
    expect(e.targetType).toBe('changeRequest');
    expect(e.targetId).toBe(body.id);
    expect(e.outcome).toBe('approved');
    expect((e.metadata as Record<string, unknown>).name).toBe('New cron job');
    expect((e.metadata as Record<string, unknown>).schedule).toBe('*/15 * * * *');
  });

  it('cron:tool-failure-502 — when the dispatcher throws, the route returns 502 and writes no audit entry', async () => {
    fakeCreateThrows = new Error('disk full');
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'Will fail', schedule: '*/5 * * * *', prompt: 'do something' },
    });
    expect(res.statusCode).toBe(502);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(0);
  });

  it('cron:update-unknown-id-404 — PATCH on missing id returns 404', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'PATCH', url: '/api/cron/missing_job',
      body: { name: 'x' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('cron:audit-shape — every audit entry written by cron actions has the correct shape', async () => {
    const server = createStrongholdServer();
    // Drive create + pause + resume + delete (delete uses confirm).
    const created = JSON.parse((await server.inject({
      method: 'POST', url: '/api/cron',
      body: { name: 'audit shape', schedule: '*/10 * * * *', prompt: 'do' },
    })).body);
    await server.inject({ method: 'POST', url: `/api/cron/${created.id}/pause` });
    await server.inject({ method: 'POST', url: `/api/cron/${created.id}/resume` });
    await server.inject({ method: 'DELETE', url: `/api/cron/${created.id}`, body: { confirm: true } });

    const events = readAuditEvents(AUDIT_FILE);
    expect(events).toHaveLength(4);
    for (const e of events) {
      expect(e.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(e.actor).toBe('ui-button');
      expect(e.targetType).toBe('changeRequest');
      expect(e.targetId).toBe(created.id);
      expect(e.policyVersion).toBeTruthy();
      expect(e.redactionApplied).toBe(true);
      expect(e.metadata).toBeTruthy();
    }
    const actions = events.map(e => e.action);
    expect(actions).toEqual(['cron.create', 'cron.pause', 'cron.resume', 'cron.delete']);
  });
});
