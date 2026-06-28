import fs from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';

// P2 fix #2: rate limiter wiring.
//
// These tests exercise the rate-limit guard wired into the Stronghold HTTP
// route handlers. They verify three contracts:
//   1. Requests within the per-family limit succeed.
//   2. Requests exceeding the per-family limit return 429 + { error: ... }.
//   3. Different route families have INDEPENDENT buckets, so a burst on
//      change-requests does not lock the operator out of agent-requests or
//      orchestration.
//
// Default limit is 30 requests / 60s per caller per route family.
// See server/index.ts for the inline documentation.
const changeFile = 'data/change-requests.json';
const agentFile = 'data/agent-requests.json';
const killFlag = 'data/agent-execution-disabled.flag';
let originalChange = '[]\n';
let originalAgent = '[]\n';
let killFlagExisted = false;
let killFlagContents = '';

describe('P2 fix #2: rate limiter wiring', () => {
  beforeEach(() => {
    originalChange = fs.existsSync(changeFile) ? fs.readFileSync(changeFile, 'utf8') : '[]\n';
    originalAgent = fs.existsSync(agentFile) ? fs.readFileSync(agentFile, 'utf8') : '[]\n';
    killFlagExisted = fs.existsSync(killFlag);
    killFlagContents = killFlagExisted ? fs.readFileSync(killFlag, 'utf8') : '';
    fs.writeFileSync(changeFile, '[]\n', 'utf8');
    fs.writeFileSync(agentFile, '[]\n', 'utf8');
    if (killFlagExisted) fs.unlinkSync(killFlag);
  });
  afterEach(() => {
    fs.writeFileSync(changeFile, originalChange, 'utf8');
    fs.writeFileSync(agentFile, originalAgent, 'utf8');
    if (killFlagExisted) fs.writeFileSync(killFlag, killFlagContents, 'utf8');
    else if (fs.existsSync(killFlag)) fs.unlinkSync(killFlag);
  });

  it('allows requests within the limit on a state-changing endpoint', async () => {
    const server = createStrongholdServer();
    // First three POSTs are well under the 30/min cap and must succeed.
    const make = async (i: number) => {
      await sleep(2); // brief FS settle for atomic rename on Windows
      return server.inject({
        method: 'POST',
        url: '/api/change-requests',
        body: { kind: 'mission.create', title: `CR ${i}`, rationale: `rl-test-${i}`, requestedBy: 'Chris', payload: { title: `CR ${i}`, summary: `rl test ${i}`, owner: 'Igris', priority: 'low', specialists: [] } },
      });
    };
    const r1 = await make(1);
    const r2 = await make(2);
    const r3 = await make(3);
    expect(r1.statusCode).toBe(201);
    expect(r2.statusCode).toBe(201);
    expect(r3.statusCode).toBe(201);
    for (const r of [r1, r2, r3]) {
      const body = JSON.parse(r.body);
      expect(body.id).toBeTruthy();
      expect(body.status).toBe('pending_review');
    }
  });

  it('returns 429 with { error: "rate limit exceeded" } once the per-family limit is exceeded', async () => {
    const server = createStrongholdServer();
    // The default limit is 30/min per caller per family. Fire 30 successful
    // POSTs, then assert the 31st is rate-limited.
    const successes: number[] = [];
    const failures: { i: number; status: number; body: string }[] = [];
    for (let i = 1; i <= 30; i++) {
      await sleep(5); // let atomic-write tmp files settle on Windows
      const res = await server.inject({
        method: 'POST',
        url: '/api/change-requests',
        body: { kind: 'mission.create', title: `Burst ${i}`, rationale: `burst-${i}`, requestedBy: 'Chris', payload: { title: `Burst ${i}`, summary: 'rl burst test', owner: 'Igris', priority: 'low', specialists: [] } },
      });
      if (res.statusCode === 201) successes.push(res.statusCode);
      else failures.push({ i, status: res.statusCode, body: res.body });
    }
    if (failures.length) {
      throw new Error(`Burst saw non-201 responses: ${JSON.stringify(failures.slice(0, 3))}`);
    }
    expect(successes).toHaveLength(30);
    const blocked = await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'Overflow', rationale: 'overflow', requestedBy: 'Chris', payload: { title: 'Overflow', summary: 'should be blocked', owner: 'Igris', priority: 'low', specialists: [] } },
    });
    expect(blocked.statusCode).toBe(429);
    const body = JSON.parse(blocked.body);
    expect(body.error).toBe('rate limit exceeded');
  });

  it('keeps route families independent — a change-request burst does NOT block agent-request or orchestration routes', async () => {
    const server = createStrongholdServer();
    // Saturate the change-requests bucket.
    for (let i = 1; i <= 30; i++) {
      await sleep(2);
      await server.inject({
        method: 'POST',
        url: '/api/change-requests',
        body: { kind: 'mission.create', title: `Sat ${i}`, rationale: `saturate-${i}`, requestedBy: 'Chris', payload: { title: `Sat ${i}`, summary: 'saturate change bucket', owner: 'Igris', priority: 'low', specialists: [] } },
      });
    }
    // change-requests must now be blocked.
    const blockedCr = await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'CR Blocked', rationale: 'should be blocked', requestedBy: 'Chris', payload: { title: 'CR Blocked', summary: 'cr block check', owner: 'Igris', priority: 'low', specialists: [] } },
    });
    expect(blockedCr.statusCode).toBe(429);

    // agent-requests bucket is INDEPENDENT — must still accept.
    const agent = await server.inject({
      method: 'POST',
      url: '/api/agent-requests',
      body: { kind: 'status.summary', title: 'RL independence check', prompt: 'Summarize the rate-limit independence test outcome.', requestedBy: 'Chris', targetAgent: 'igris' },
    });
    expect(agent.statusCode).toBe(201);

    // orchestration bucket is INDEPENDENT — must still accept.
    const orch = await server.inject({ method: 'POST', url: '/api/orchestration/disable' });
    expect(orch.statusCode).toBe(200);
    const body = JSON.parse(orch.body);
    expect(body.killSwitch).toBe('active');
  });

  it('does NOT rate-limit GET (read-only) endpoints even when called rapidly', async () => {
    const server = createStrongholdServer();
    // Fire 50 GETs back-to-back; none should be rate-limited.
    const codes: number[] = [];
    for (let i = 0; i < 50; i++) {
      const res = await server.inject({ method: 'GET', url: '/api/change-requests' });
      codes.push(res.statusCode);
    }
    expect(codes.every((c) => c === 200)).toBe(true);
  });
});
