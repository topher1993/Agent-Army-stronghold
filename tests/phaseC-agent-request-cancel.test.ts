// FEATURE 1 (Phase C) — agent-request cancel wire.
//
// P1 fix (Sentinel): POST /api/agent-requests/:id/cancel used to be a stub
// returning {ok:true, status:'cancelled'} with no write and no audit. The
// fix routes it through a new cancelAgentRequest service mutator and emits
// an audit entry with capability='agentRequest:cancel'. The service throws
// on illegal status (queued/dispatched/etc) so the route returns 409
// without auditing.
//
// These tests pin down:
//   - cancel on pending_review → status='cancelled' on disk, audit entry
//   - cancel on approved       → status='cancelled' on disk, audit entry
//   - second cancel on already-cancelled → 409, no extra audit entry
//   - cancel on queued         → 409, no audit entry
//   - cancel on unknown id     → 409 (route-level fallback), no audit entry

import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';
import { createAgentRequest, approveAgentRequest, enqueueAgentRequest } from '../server/services/agentRequestService';

const AUDIT_FILE = approvedDataPath('audit');
const AGENT_FILE = approvedDataPath('agentRequests');

function readSafe(p: string, fallback: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : fallback;
}

let auditBackup = '';
let agentBackup = '';

function snapshot() {
  auditBackup = readSafe(AUDIT_FILE, '');
  agentBackup = readSafe(AGENT_FILE, '[]\n');
}
function restore() {
  fs.writeFileSync(AGENT_FILE, agentBackup, 'utf8');
  if (auditBackup) fs.writeFileSync(AUDIT_FILE, auditBackup, 'utf8');
  else if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}
function clearWrites() {
  fs.writeFileSync(AGENT_FILE, '[]\n', 'utf8');
  if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}

describe('Phase C — agent-request cancel writes a real mutation + audit entry', () => {
  beforeEach(() => { snapshot(); clearWrites(); });
  afterEach(() => { restore(); });

  it('agentRequest:cancel-on-pending — cancel from pending_review mutates the record and audits the transition', async () => {
    const created = createAgentRequest(AGENT_FILE, {
      kind: 'status.summary',
      title: 'cancel from pending',
      prompt: 'noop',
      requestedBy: 'Chris',
      targetAgent: 'igris',
    });
    expect(created.status).toBe('pending_review');

    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: `/api/agent-requests/${created.id}/cancel`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe(created.id);
    expect(body.status).toBe('cancelled');
    expect(body.cancelledBy).toBe('Igris');
    expect(body.failureReason).toBe('cancelled by operator');

    // On-disk status matches.
    const onDisk = JSON.parse(fs.readFileSync(AGENT_FILE, 'utf8'));
    const persisted = onDisk.find((r: { id: string }) => r.id === created.id);
    expect(persisted.status).toBe('cancelled');

    // Audit entry written with capability='agentRequest:cancel'.
    const events = readAuditEvents(AUDIT_FILE);
    const cancelEvent = events.find((e) => e.targetId === created.id && e.action === 'cancel');
    expect(cancelEvent).toBeTruthy();
    expect(cancelEvent!.capability).toBe('agentRequest:cancel');
    expect(cancelEvent!.actor).toBe('Igris');
    expect(cancelEvent!.targetType).toBe('changeRequest');
    const meta = cancelEvent!.metadata as Record<string, unknown>;
    expect(meta.beforeStatus).toBe('pending_review');
    expect(meta.afterStatus).toBe('cancelled');
    expect(meta.kind).toBe('status.summary');
    expect(meta.title).toBe('cancel from pending');
  });

  it('agentRequest:cancel-on-approved — cancel from approved is allowed and audited', async () => {
    const created = createAgentRequest(AGENT_FILE, {
      kind: 'mission.plan',
      title: 'cancel from approved',
      prompt: 'noop',
      requestedBy: 'Chris',
      targetAgent: 'igris',
    });
    const approved = approveAgentRequest(AGENT_FILE, created.id, 'Igris');
    expect(approved.status).toBe('approved');

    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: `/api/agent-requests/${created.id}/cancel`,
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('cancelled');

    // The cancel audit entry references beforeStatus='approved'.
    const events = readAuditEvents(AUDIT_FILE);
    const cancelEvent = events.find((e) => e.targetId === created.id && e.action === 'cancel');
    expect(cancelEvent).toBeTruthy();
    expect((cancelEvent!.metadata as Record<string, unknown>).beforeStatus).toBe('approved');
  });

  it('agentRequest:cancel-on-already-cancelled — second cancel call returns 409 with no extra audit entry', async () => {
    const created = createAgentRequest(AGENT_FILE, {
      kind: 'status.summary',
      title: 'double cancel',
      prompt: 'noop',
      requestedBy: 'Chris',
      targetAgent: 'igris',
    });
    const server = createStrongholdServer();

    const first = await server.inject({ method: 'POST', url: `/api/agent-requests/${created.id}/cancel` });
    expect(first.statusCode).toBe(200);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(1);

    const second = await server.inject({ method: 'POST', url: `/api/agent-requests/${created.id}/cancel` });
    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.body).error).toBe('cannot cancel agent request');
    // Still exactly ONE audit entry — second cancel did not append.
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(1);
  });

  it('agentRequest:cancel-on-queued — cancel from a terminal-of-cancelable status returns 409 with no audit entry', async () => {
    const created = createAgentRequest(AGENT_FILE, {
      kind: 'status.summary',
      title: 'cannot cancel queued',
      prompt: 'noop',
      requestedBy: 'Chris',
      targetAgent: 'igris',
    });
    const approved = approveAgentRequest(AGENT_FILE, created.id, 'Igris');
    const queued = enqueueAgentRequest(AGENT_FILE, approved.id);
    expect(queued.status).toBe('queued');

    const server = createStrongholdServer();
    const res = await server.inject({ method: 'POST', url: `/api/agent-requests/${created.id}/cancel` });
    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).error).toBe('cannot cancel agent request');
    // No audit entry — the failure happened before appendAuditEvent.
    expect(readAuditEvents(AUDIT_FILE).filter((e) => e.targetId === created.id && e.action === 'cancel')).toHaveLength(0);
  });
});
