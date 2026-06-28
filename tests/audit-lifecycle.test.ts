import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

// P2 fix #3: audit lifecycle wiring.
//
// Verifies that every state-changing transition in server/index.ts writes an
// audit event to data/audit-log.jsonl with the required metadata fields
// (id, action, actor, timestamp, before/after status). Failed operations must
// NOT create audit entries.
//
// The audit log primitive in server/services/auditLog.ts is unchanged; this
// suite only exercises the wiring inside the route layer.

// We exercise the REAL audit file path used by the API (data/audit-log.jsonl)
// and snapshot it for restore in afterEach. This keeps tests deterministic
// without stubbing the path guard.
const auditFile = approvedDataPath('audit');
const changeFile = approvedDataPath('changeRequests');
const agentFile = approvedDataPath('agentRequests');
const killFlag = 'data/agent-execution-disabled.flag';

let auditBackup = '';
let changeBackup = '';
let agentBackup = '';
let killFlagExisted = false;
let killFlagContents = '';

function snapshotDataFiles() {
  auditBackup = fs.existsSync(auditFile) ? fs.readFileSync(auditFile, 'utf8') : '';
  changeBackup = fs.existsSync(changeFile) ? fs.readFileSync(changeFile, 'utf8') : '[]\n';
  agentBackup = fs.existsSync(agentFile) ? fs.readFileSync(agentFile, 'utf8') : '[]\n';
  killFlagExisted = fs.existsSync(killFlag);
  killFlagContents = killFlagExisted ? fs.readFileSync(killFlag, 'utf8') : '';
}

function restoreDataFiles() {
  if (auditBackup) fs.writeFileSync(auditFile, auditBackup, 'utf8');
  else if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
  fs.writeFileSync(changeFile, changeBackup, 'utf8');
  fs.writeFileSync(agentFile, agentBackup, 'utf8');
  if (killFlagExisted) fs.writeFileSync(killFlag, killFlagContents, 'utf8');
  else if (fs.existsSync(killFlag)) fs.unlinkSync(killFlag);
}

describe('P2 fix #3: audit lifecycle wiring', () => {
  beforeEach(() => {
    snapshotDataFiles();
    // Reset to a clean slate. The audit log is a JSONL append-only file — we
    // delete it so each test starts at zero entries. This guarantees the
    // assertions below only see events produced by THIS test.
    if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile);
    fs.writeFileSync(changeFile, '[]\n', 'utf8');
    fs.writeFileSync(agentFile, '[]\n', 'utf8');
    if (fs.existsSync(killFlag)) fs.unlinkSync(killFlag);
  });
  afterEach(() => { restoreDataFiles(); });

  // Helper: clear audit log mid-test (e.g. between two endpoints in the same
  // test). Each test should still verify only what it asserts.
  function clearAudit() { if (fs.existsSync(auditFile)) fs.unlinkSync(auditFile); }

  it('writes a JSONL audit entry on change-request approve', async () => {
    const server = createStrongholdServer();
    // Seed a change-request directly (the create endpoint isn't on the audit
    // list in P2-3, but we still want the approve transition to be audit'd).
    const created = (await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'Audit CR approve', rationale: 'audit test', requestedBy: 'Chris', payload: { title: 'Audit CR approve', summary: 'audit test', owner: 'Igris', priority: 'low', specialists: [] } },
    }));
    expect(created.statusCode).toBe(201);
    const cr = JSON.parse(created.body);
    clearAudit();

    const res = await server.inject({ method: 'POST', url: `/api/change-requests/${cr.id}/approve`, body: { actor: 'Igris', reason: 'audit test' } });
    expect(res.statusCode).toBe(200);

    const events = readAuditEvents(auditFile);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.action).toBe('approve');
    expect(e.actor).toBe('Igris');
    expect(e.capability).toBe('changeRequest:approve');
    expect(e.targetType).toBe('changeRequest');
    expect(e.targetId).toBe(cr.id);
    expect(e.outcome).toBe('approved');
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(e.id).toBeTruthy();
    expect(e.policyVersion).toBeTruthy();
    expect((e.metadata as Record<string, unknown>).beforeStatus).toBe('pending_review');
    expect((e.metadata as Record<string, unknown>).afterStatus).toBe('approved');
    // Verify the JSONL file format: one JSON object per line.
    const text = fs.readFileSync(auditFile, 'utf8');
    expect(text.split('\n').filter(Boolean)).toHaveLength(1);
  });

  it('writes a JSONL audit entry on change-request reject AND apply', async () => {
    const server = createStrongholdServer();
    const created = (await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'Audit CR reject+apply', rationale: 'audit test', requestedBy: 'Chris', payload: { title: 'Audit CR reject+apply', summary: 'audit test', owner: 'Igris', priority: 'low', specialists: [] } },
    }));
    const cr = JSON.parse(created.body);

    // P1 fix (Sentinel): POST /api/change-requests now writes a canonical
    // 'create' audit entry per the brief, so the audit log has 1 entry
    // (the create) before the reject transition. We assert on the REJECT
    // entry shape — it must be present and well-formed — and on the
    // total length (1 create + 1 reject = 2 entries).
    expect(readAuditEvents(auditFile)).toHaveLength(1);

    const rejectRes = await server.inject({ method: 'POST', url: `/api/change-requests/${cr.id}/reject`, body: { actor: 'Igris', reason: 'changed mind' } });
    expect(rejectRes.statusCode).toBe(200);
    const events1 = readAuditEvents(auditFile);
    expect(events1).toHaveLength(2);
    const rejectEntry = events1.find((e) => e.action === 'reject')!;
    expect(rejectEntry.outcome).toBe('rejected');
    expect(rejectEntry.capability).toBe('changeRequest:reject');
    expect((rejectEntry.metadata as Record<string, unknown>).beforeStatus).toBe('pending_review');
    expect((rejectEntry.metadata as Record<string, unknown>).afterStatus).toBe('rejected');
    // And the create entry is present with the canonical shape.
    const createEntry = events1.find((e) => e.action === 'create')!;
    expect(createEntry.capability).toBe('changeRequest:create');
    expect(createEntry.outcome).toBe('requested');
    expect(createEntry.targetId).toBe(cr.id);

    // Reject transitions are terminal, so applying a rejected CR should throw
    // inside approvalWorkflow and NOT write an audit entry. This proves the
    // "failed operations do NOT audit" rule.
    clearAudit();
    const applyFail = await server.inject({ method: 'POST', url: `/api/change-requests/${cr.id}/apply`, body: { actor: 'Igris' } });
    expect(applyFail.statusCode).toBe(500);
    expect(readAuditEvents(auditFile)).toHaveLength(0);

    // Now seed a fresh pending CR for the apply audit check.
    const cr2 = JSON.parse((await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'Audit CR apply', rationale: 'audit apply', requestedBy: 'Chris', payload: { title: 'Audit CR apply', summary: 'audit apply', owner: 'Igris', priority: 'low', specialists: [] } },
    })).body);
    const approve2 = await server.inject({ method: 'POST', url: `/api/change-requests/${cr2.id}/approve`, body: { actor: 'Igris', reason: 'ok' } });
    expect(approve2.statusCode).toBe(200);
    clearAudit();
    const apply2 = await server.inject({ method: 'POST', url: `/api/change-requests/${cr2.id}/apply`, body: { actor: 'Igris' } });
    expect(apply2.statusCode).toBe(200);
    const events2 = readAuditEvents(auditFile);
    expect(events2).toHaveLength(1);
    expect(events2[0].action).toBe('apply');
    expect(events2[0].outcome).toBe('applied');
    expect(events2[0].capability).toBe('changeRequest:apply');
    expect((events2[0].metadata as Record<string, unknown>).beforeStatus).toBe('approved');
    expect((events2[0].metadata as Record<string, unknown>).afterStatus).toBe('applied');
  });

  it('writes JSONL audit entries for every agent-request lifecycle transition', async () => {
    const server = createStrongholdServer();
    // 1) create
    const created = await server.inject({
      method: 'POST',
      url: '/api/agent-requests',
      body: { kind: 'status.summary', title: 'Audit AR create', prompt: 'summarize the audit lifecycle wiring.', requestedBy: 'Chris', targetAgent: 'igris' },
    });
    expect(created.statusCode).toBe(201);
    const ar = JSON.parse(created.body);

    const eventsAfterCreate = readAuditEvents(auditFile);
    expect(eventsAfterCreate).toHaveLength(1);
    expect(eventsAfterCreate[0].action).toBe('create');
    expect(eventsAfterCreate[0].outcome).toBe('requested');
    expect(eventsAfterCreate[0].capability).toBe('agentRequest:create');
    expect(eventsAfterCreate[0].targetId).toBe(ar.id);
    expect(eventsAfterCreate[0].actor).toBe('Chris');
    expect((eventsAfterCreate[0].metadata as Record<string, unknown>).beforeStatus).toBe('none');
    expect((eventsAfterCreate[0].metadata as Record<string, unknown>).afterStatus).toBe('pending_review');

    // 2) approve
    clearAudit();
    const approve = await server.inject({ method: 'POST', url: `/api/agent-requests/${ar.id}/approve` });
    expect(approve.statusCode).toBe(200);
    const evApprove = readAuditEvents(auditFile);
    expect(evApprove).toHaveLength(1);
    expect(evApprove[0].action).toBe('approve');
    expect(evApprove[0].outcome).toBe('approved');
    expect(evApprove[0].capability).toBe('agentRequest:approve');
    expect((evApprove[0].metadata as Record<string, unknown>).beforeStatus).toBe('pending_review');
    expect((evApprove[0].metadata as Record<string, unknown>).afterStatus).toBe('approved');

    // 3) enqueue (approved -> queued, after Tusk preflight)
    clearAudit();
    const enqueue = await server.inject({ method: 'POST', url: `/api/agent-requests/${ar.id}/enqueue` });
    expect(enqueue.statusCode).toBe(200);
    const evEnqueue = readAuditEvents(auditFile);
    expect(evEnqueue).toHaveLength(1);
    expect(evEnqueue[0].action).toBe('enqueue');
    expect(evEnqueue[0].outcome).toBe('validated');
    expect(evEnqueue[0].capability).toBe('agentRequest:enqueue');
    expect((evEnqueue[0].metadata as Record<string, unknown>).beforeStatus).toBe('approved');
    expect((evEnqueue[0].metadata as Record<string, unknown>).afterStatus).toBe('queued');

    // 4) reject on a SECOND agent-request (terminal transition)
    const ar2 = JSON.parse((await server.inject({
      method: 'POST',
      url: '/api/agent-requests',
      body: { kind: 'status.summary', title: 'Audit AR reject', prompt: 'reject me', requestedBy: 'Chris', targetAgent: 'igris' },
    })).body);
    clearAudit();
    const reject = await server.inject({ method: 'POST', url: `/api/agent-requests/${ar2.id}/reject` });
    expect(reject.statusCode).toBe(200);
    const evReject = readAuditEvents(auditFile);
    expect(evReject).toHaveLength(1);
    expect(evReject[0].action).toBe('reject');
    expect(evReject[0].outcome).toBe('rejected');
    expect(evReject[0].capability).toBe('agentRequest:reject');
    expect((evReject[0].metadata as Record<string, unknown>).beforeStatus).toBe('pending_review');
    expect((evReject[0].metadata as Record<string, unknown>).afterStatus).toBe('rejected');
  });

  it('writes JSONL audit entries on orchestration enable/disable transitions', async () => {
    const server = createStrongholdServer();
    // 1) disable (enabled -> disabled)
    const disable = await server.inject({ method: 'POST', url: '/api/orchestration/disable' });
    expect(disable.statusCode).toBe(200);
    const evDisable = readAuditEvents(auditFile);
    expect(evDisable).toHaveLength(1);
    expect(evDisable[0].action).toBe('disable');
    expect(evDisable[0].capability).toBe('orchestration:disable');
    expect(evDisable[0].targetType).toBe('system');
    expect(evDisable[0].actor).toBe('Igris');
    expect((evDisable[0].metadata as Record<string, unknown>).beforeStatus).toBe('enabled');
    expect((evDisable[0].metadata as Record<string, unknown>).afterStatus).toBe('disabled');

    // 2) enable (disabled -> enabled)
    clearAudit();
    const enable = await server.inject({ method: 'POST', url: '/api/orchestration/enable' });
    expect(enable.statusCode).toBe(200);
    const evEnable = readAuditEvents(auditFile);
    expect(evEnable).toHaveLength(1);
    expect(evEnable[0].action).toBe('enable');
    expect(evEnable[0].capability).toBe('orchestration:enable');
    expect(evEnable[0].targetType).toBe('system');
    expect(evEnable[0].actor).toBe('Igris');
    expect((evEnable[0].metadata as Record<string, unknown>).beforeStatus).toBe('disabled');
    expect((evEnable[0].metadata as Record<string, unknown>).afterStatus).toBe('enabled');
  });

  it('does NOT write an audit entry when a transition is invalid (failed operation)', async () => {
    const server = createStrongholdServer();
    // Try to approve a non-existent change-request. The route returns 404 and
    // does NOT touch the audit log.
    const before = readAuditEvents(auditFile).length;
    const res = await server.inject({ method: 'POST', url: '/api/change-requests/00000000-0000-0000-0000-000000000000/approve', body: { actor: 'Igris', reason: 'no-op' } });
    // The route falls through to the embedded `request` lookup and returns 404.
    expect(res.statusCode).toBe(404);
    expect(readAuditEvents(auditFile)).toHaveLength(before);

    // Try to reject a non-existent agent-request. The service throws, route
    // returns 500, and the audit log stays empty.
    const agentRes = await server.inject({ method: 'POST', url: '/api/agent-requests/00000000-0000-0000-0000-000000000000/reject' });
    expect(agentRes.statusCode).toBe(500);
    expect(readAuditEvents(auditFile)).toHaveLength(before);

    // Try to apply a CR that's still pending_review (not approved). The
    // approvalWorkflow service throws and the route returns 500; no audit
    // entry is written.
    const cr = JSON.parse((await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'Audit failure path', rationale: 'audit failure', requestedBy: 'Chris', payload: { title: 'Audit failure path', summary: 'audit failure', owner: 'Igris', priority: 'low', specialists: [] } },
    })).body);
    clearAudit();
    const applyFail = await server.inject({ method: 'POST', url: `/api/change-requests/${cr.id}/apply`, body: { actor: 'Igris' } });
    expect(applyFail.statusCode).toBe(500);
    expect(readAuditEvents(auditFile)).toHaveLength(0);
  });

  it('produces valid JSONL — every line is parseable, every entry has a uuid id and ISO timestamp', async () => {
    const server = createStrongholdServer();
    // Drive two transitions so we get multiple entries.
    const cr = JSON.parse((await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: { kind: 'mission.create', title: 'JSONL integrity', rationale: 'jsonl check', requestedBy: 'Chris', payload: { title: 'JSONL integrity', summary: 'jsonl check', owner: 'Igris', priority: 'low', specialists: [] } },
    })).body);
    clearAudit();
    await server.inject({ method: 'POST', url: `/api/change-requests/${cr.id}/approve`, body: { actor: 'Igris', reason: 'jsonl' } });
    await server.inject({ method: 'POST', url: `/api/change-requests/${cr.id}/apply`, body: { actor: 'Igris' } });
    await server.inject({ method: 'POST', url: '/api/orchestration/disable' });

    const raw = fs.readFileSync(auditFile, 'utf8');
    const lines = raw.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const line of lines) {
      // Every line must be parseable JSON.
      const parsed = JSON.parse(line);
      expect(parsed.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(typeof parsed.actor).toBe('string');
      expect(typeof parsed.action).toBe('string');
      expect(typeof parsed.capability).toBe('string');
      expect(typeof parsed.outcome).toBe('string');
      expect(parsed.redactionApplied).toBe(true);
      expect(parsed.policyVersion).toBeTruthy();
      expect(parsed.metadata).toBeTruthy();
    }
    // The three actions we just drove should be present in order.
    const events = readAuditEvents(auditFile);
    const actions = events.map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['approve', 'apply', 'disable']));
  });
});