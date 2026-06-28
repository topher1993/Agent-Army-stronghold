// FEATURE 1 (Phase C) — change-request create-route audit wiring.
//
// P1 fix (Sentinel): POST /api/change-requests was persisting the new CR
// via atomicWriteJson but never called appendAuditEvent, so the audit log
// stayed silent on the most common operator action. The fix routes the
// create through appendAuditEvent with the canonical shape:
//
//   action:      'create'
//   capability:  'changeRequest:create'
//   actor:       body.actor ?? 'Chris'
//   targetType:  'changeRequest'
//   targetId:    created.id
//   outcome:     'requested'
//   reason:      'change request created'
//   metadata:    { beforeStatus, afterStatus, kind, title }
//
// These tests pin down the wiring end-to-end.

import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

const AUDIT_FILE = approvedDataPath('audit');
const CHANGE_REQUESTS_FILE = approvedDataPath('changeRequests');

function readSafe(p: string, fallback: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : fallback;
}

let auditBackup = '';
let crBackup = '';

function snapshot() {
  auditBackup = readSafe(AUDIT_FILE, '');
  crBackup = readSafe(CHANGE_REQUESTS_FILE, '[]\n');
}
function restore() {
  fs.writeFileSync(CHANGE_REQUESTS_FILE, crBackup, 'utf8');
  if (auditBackup) fs.writeFileSync(AUDIT_FILE, auditBackup, 'utf8');
  else if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}
function clearWrites() {
  fs.writeFileSync(CHANGE_REQUESTS_FILE, '[]\n', 'utf8');
  if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
}

describe('Phase C — change-request create writes a canonical audit entry', () => {
  beforeEach(() => { snapshot(); clearWrites(); });
  afterEach(() => { restore(); });

  it('changeRequest:create-writes-audit-entry — POST a valid CR and assert the last audit line matches the spec shape', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: {
        actor: 'Chris',
        kind: 'mission.create',
        title: 'Audit wiring smoke test',
        rationale: 'pin down the create audit shape',
        requestedBy: 'Chris',
        payload: { missionTitle: 'Smoke' },
      },
    });
    expect(res.statusCode).toBe(201);
    const created = JSON.parse(res.body);
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(created.status).toBe('pending_review');

    const events = readAuditEvents(AUDIT_FILE);
    expect(events).toHaveLength(1);
    const e = events[0];

    // Canonical create shape from the brief.
    expect(e.action).toBe('create');
    expect(e.capability).toBe('changeRequest:create');
    expect(e.actor).toBe('Chris');
    expect(e.targetType).toBe('changeRequest');
    expect(e.targetId).toBe(created.id);
    expect(e.outcome).toBe('requested');
    expect(e.reason).toBe('change request created');
    const meta = e.metadata as Record<string, unknown>;
    expect(meta.beforeStatus).toBe('none');
    expect(meta.afterStatus).toBe('pending_review');
    expect(meta.kind).toBe('mission.create');
    expect(meta.title).toBe('Audit wiring smoke test');
    // Required audit-event boilerplate.
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(e.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(e.policyVersion).toBeTruthy();
    expect(e.redactionApplied).toBe(true);
  });

  it('changeRequest:create-audit-actor-falls-back-to-Chris — when body.actor is omitted, audit actor defaults to Chris', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: '/api/change-requests',
      body: {
        kind: 'task.update',
        title: 'actor default',
        rationale: 'no actor supplied',
        requestedBy: 'Chris',
        payload: { taskId: 't-1' },
      },
    });
    expect(res.statusCode).toBe(201);
    const events = readAuditEvents(AUDIT_FILE);
    expect(events).toHaveLength(1);
    expect(events[0].actor).toBe('Chris');
    expect(events[0].capability).toBe('changeRequest:create');
  });
});
