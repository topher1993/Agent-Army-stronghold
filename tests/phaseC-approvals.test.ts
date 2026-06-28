// FEATURE 1 — Approvals (audit-log only) tests
//
// Right-rail approval cards currently expose approve/reject buttons via the
// change-requests route, but FEATURE 1 introduces a NEW, audit-log-only
// surface at /api/approvals/:id/{approve,reject}. That surface is the one
// described in the brief: id validation, per-id concurrency lock, immutable
// audit append, and 409 on a second concurrent resolve.
//
// These tests pin down:
//   - happy path approve resolves a pending item and writes one audit entry
//   - happy path reject resolves a pending item and writes one audit entry
//   - unknown id returns 404 and writes no audit entry
//   - resolving an already-resolved id returns 409 and writes no audit entry
//   - reason over 500 chars returns 400
//   - id outside /^[a-zA-Z0-9_-]{1,64}$/ returns 400
//   - audit entry shape: action=approval.approve|approval.reject,
//     actor=ui-button, targetId=<id>, outcome matches action, reason set.
//
// We snapshot data/audit-log.jsonl and data/approvals.json to keep tests
// deterministic across the suite.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

const APPROVALS_FILE = approvedDataPath('approvals');
const AUDIT_FILE = approvedDataPath('audit');

let approvalsBackup = '';
let auditBackup = '';

function snapshotFiles() {
  approvalsBackup = fs.existsSync(APPROVALS_FILE) ? fs.readFileSync(APPROVALS_FILE, 'utf8') : '[]\n';
  auditBackup = fs.existsSync(AUDIT_FILE) ? fs.readFileSync(AUDIT_FILE, 'utf8') : '';
}
function restoreFiles() {
  fs.writeFileSync(APPROVALS_FILE, approvalsBackup, 'utf8');
  if (auditBackup) fs.writeFileSync(AUDIT_FILE, auditBackup, 'utf8');
  else if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}
function clearFiles() {
  if (fs.existsSync(APPROVALS_FILE)) fs.unlinkSync(APPROVALS_FILE);
  if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}
function seedPendingApprovals(items: Array<{ id: string; title: string }>) {
  const seed = items.map(item => ({
    id: item.id,
    title: item.title,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  fs.mkdirSync(path.dirname(APPROVALS_FILE), { recursive: true });
  fs.writeFileSync(APPROVALS_FILE, JSON.stringify(seed, null, 2) + '\n', 'utf8');
}

describe('Phase C — Approvals wire (audit-log only)', () => {
  beforeEach(() => {
    snapshotFiles();
    clearFiles();
    seedPendingApprovals([
      { id: 'pending_alpha', title: 'Approve me' },
      { id: 'pending_beta', title: 'Reject me' },
      { id: 'pending_gamma', title: 'Will 409' },
    ]);
  });
  afterEach(() => { restoreFiles(); });

  it('approval:approve-success — resolves a pending item and writes one audit entry', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/approvals/pending_alpha/approve',
      body: { reason: 'looks fine' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.id).toBe('pending_alpha');
    expect(body.status).toBe('approved');
    expect(body.decidedBy).toBe('ui-button');
    expect(body.decisionReason).toBe('looks fine');
    expect(body.decidedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const events = readAuditEvents(AUDIT_FILE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.action).toBe('approval.approve');
    expect(e.actor).toBe('ui-button');
    expect(e.targetType).toBe('changeRequest'); // shared vocabulary; metadata.source disambiguates the right-rail origin
    expect(e.targetId).toBe('pending_alpha');
    expect(e.outcome).toBe('approved');
    expect(e.reason).toBe('looks fine');
    expect(e.policyVersion).toBeTruthy();
    expect(e.redactionApplied).toBe(true);
    expect((e.metadata as Record<string, unknown>).beforeStatus).toBe('pending');
    expect((e.metadata as Record<string, unknown>).afterStatus).toBe('approved');
  });

  it('approval:reject-success — resolves a pending item and writes one audit entry', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/approvals/pending_beta/reject',
      body: { reason: 'no thanks' },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('rejected');

    const events = readAuditEvents(AUDIT_FILE);
    expect(events).toHaveLength(1);
    const e = events[0];
    expect(e.action).toBe('approval.reject');
    expect(e.actor).toBe('ui-button');
    expect(e.targetId).toBe('pending_beta');
    expect(e.outcome).toBe('rejected');
    expect((e.metadata as Record<string, unknown>).beforeStatus).toBe('pending');
    expect((e.metadata as Record<string, unknown>).afterStatus).toBe('rejected');
  });

  it('approval:approve-unknown-id-404 — unknown id returns 404 and writes no audit entry', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/approvals/does_not_exist/approve',
      body: { reason: 'ghost' },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: 'approval not found' });
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(0);
  });

  it('approval:approve-already-resolved-409 — second concurrent resolve returns 409', async () => {
    const server = createStrongholdServer();
    // First call resolves.
    const first = await server.inject({
      method: 'POST',
      url: '/api/approvals/pending_gamma/approve',
      body: { reason: 'first' },
    });
    expect(first.statusCode).toBe(200);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(1);

    // Second call on the SAME id must 409 and NOT append a duplicate audit entry.
    const second = await server.inject({
      method: 'POST',
      url: '/api/approvals/pending_gamma/reject',
      body: { reason: 'too late' },
    });
    expect(second.statusCode).toBe(409);
    expect(JSON.parse(second.body)).toEqual({ error: 'approval already resolved', status: 'approved' });
    // Audit must still have exactly ONE entry — append-only is the contract.
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(1);
  });

  it('approval:reason-rejected-over-length — reason over 500 chars returns 400', async () => {
    const server = createStrongholdServer();
    const tooLong = 'x'.repeat(501);
    const res = await server.inject({
      method: 'POST',
      url: '/api/approvals/pending_alpha/approve',
      body: { reason: tooLong },
    });
    expect(res.statusCode).toBe(400);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(0);
  });

  it('approval:invalid-id-charset — id with bad chars returns 400 and writes no audit entry', async () => {
    const server = createStrongholdServer();
    // Slash is not in the allowed charset and would also fail to match the route.
    const res = await server.inject({
      method: 'POST',
      url: '/api/approvals/has%20space/approve',
      body: { reason: 'space' },
    });
    // Either 400 (validation) or 404 (route mismatch) is acceptable; what
    // MUST hold: no audit entry.
    expect([400, 404]).toContain(res.statusCode);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(0);
  });

  it('approval:audit-entry-written — audit line is well-formed JSONL with required shape', async () => {
    const server = createStrongholdServer();
    await server.inject({
      method: 'POST',
      url: '/api/approvals/pending_alpha/approve',
      body: { reason: 'jsonl shape check' },
    });
    const text = fs.readFileSync(AUDIT_FILE, 'utf8');
    const lines = text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(parsed.actor).toBe('ui-button');
    expect(parsed.action).toBe('approval.approve');
    expect(parsed.capability).toBe('approval:approve');
    expect(parsed.targetType).toBe('changeRequest'); // shared vocabulary; metadata.source disambiguates
    expect(parsed.targetId).toBe('pending_alpha');
    expect(parsed.outcome).toBe('approved');
    expect(parsed.reason).toBe('jsonl shape check');
    expect(parsed.policyVersion).toBeTruthy();
    expect(parsed.redactionApplied).toBe(true);
    expect(parsed.metadata).toBeTruthy();
  });

  // P0 fix (Sentinel): two parallel resolveApproval calls for the same id
  // must produce exactly one ok:true and one ok:false/409. The audit log
  // must contain exactly ONE entry for that id.
  it('approval:concurrent-second-caller-409 — parallel resolves collapse to exactly one success and one 409', async () => {
    const server = createStrongholdServer();
    const [a, b] = await Promise.all([
      server.inject({ method: 'POST', url: '/api/approvals/pending_gamma/approve', body: { reason: 'racer A' } }),
      server.inject({ method: 'POST', url: '/api/approvals/pending_gamma/reject', body: { reason: 'racer B' } }),
    ]);
    const statuses = [a.statusCode, b.statusCode].sort();
    expect(statuses).toEqual([200, 409]);
    // Audit log: exactly one entry for this id.
    const events = readAuditEvents(AUDIT_FILE);
    const ours = events.filter(e => e.targetId === 'pending_gamma');
    expect(ours).toHaveLength(1);
    // On-disk status matches whichever caller won.
    const onDisk = JSON.parse(fs.readFileSync(APPROVALS_FILE, 'utf8')).find((r: { id: string }) => r.id === 'pending_gamma');
    expect(['approved', 'rejected']).toContain(onDisk.status);
    expect(onDisk.decisionReason).toMatch(/^racer [AB]$/);
  });

  // P0 fix (Sentinel): the second concurrent caller must NOT cause a
  // second audit entry. This is the load-bearing audit-log integrity
  // check — duplicates here would corrupt the trail.
  it('approval:audit-not-written-on-409 — second concurrent caller does not append a duplicate audit entry', async () => {
    const server = createStrongholdServer();
    // First call writes one audit entry.
    const first = await server.inject({ method: 'POST', url: '/api/approvals/pending_gamma/approve', body: { reason: 'first wins' } });
    expect(first.statusCode).toBe(200);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(1);

    // Five more concurrent racers must all 409 and must not append.
    const racers = await Promise.all([
      server.inject({ method: 'POST', url: '/api/approvals/pending_gamma/reject', body: { reason: 'late 1' } }),
      server.inject({ method: 'POST', url: '/api/approvals/pending_gamma/reject', body: { reason: 'late 2' } }),
      server.inject({ method: 'POST', url: '/api/approvals/pending_gamma/approve', body: { reason: 'late 3' } }),
    ]);
    for (const r of racers) expect(r.statusCode).toBe(409);
    expect(readAuditEvents(AUDIT_FILE)).toHaveLength(1);
  });
});
