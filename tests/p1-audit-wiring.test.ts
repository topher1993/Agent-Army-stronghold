import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';
import { createAgentRequest, approveAgentRequest, enqueueAgentRequest } from '../server/services/agentRequestService';

// P1 fixes (Sentinel review of P2 fix #3 audit lifecycle).
//
// These tests pin down the two security findings raised by Sentinel:
//
//   P1-1 — POST /api/agent-requests/:id/dispatch-mock mutates state in 4 files
//          but writes no audit entry. The route MUST emit an audit event with
//          action='dispatch', targetId=<agent-request id>, and metadata.runId /
//          metadata.artifactId derived from the dispatcher's return value.
//
//   P1-2 — POST /api/change-requests/:id/approve|reject|apply must return 404
//          AND write NO audit entry when the id does not exist in the
//          approved store. Previously the route accepted a user-supplied
//          `request` object from the body, ran the workflow in-memory, and
//          wrote a ghost audit entry. The body.request fallback is removed.

// The route resolves all paths via approvedDataPath() inside routeInner,
// so any test that exercises it must snapshot + restore the real data files.
// We snapshot ALL files the dispatch-mock path touches.
const realPaths = {
  audit: approvedDataPath('audit'),
  agentRequests: approvedDataPath('agentRequests'),
  agentRuns: approvedDataPath('agentRuns'),
  agentArtifacts: approvedDataPath('agentArtifacts'),
  agentRunLog: approvedDataPath('agentRunLog'),
  changeRequests: approvedDataPath('changeRequests'),
};

function readSafe(p: string, fallback: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : fallback;
}

function snapshotAll() {
  return {
    audit: readSafe(realPaths.audit, ''),
    agentRequests: readSafe(realPaths.agentRequests, '[]\n'),
    agentRuns: readSafe(realPaths.agentRuns, '[]\n'),
    agentArtifacts: readSafe(realPaths.agentArtifacts, '[]\n'),
    agentRunLog: readSafe(realPaths.agentRunLog, ''),
    changeRequests: readSafe(realPaths.changeRequests, '[]\n'),
  };
}

function restoreAll(bk: ReturnType<typeof snapshotAll>) {
  fs.writeFileSync(realPaths.agentRequests, bk.agentRequests, 'utf8');
  fs.writeFileSync(realPaths.agentRuns, bk.agentRuns, 'utf8');
  fs.writeFileSync(realPaths.agentArtifacts, bk.agentArtifacts, 'utf8');
  fs.writeFileSync(realPaths.agentRunLog, bk.agentRunLog, 'utf8');
  fs.writeFileSync(realPaths.changeRequests, bk.changeRequests, 'utf8');
  if (bk.audit) fs.writeFileSync(realPaths.audit, bk.audit, 'utf8');
  else if (fs.existsSync(realPaths.audit)) fs.unlinkSync(realPaths.audit);
}

function clearWrites() {
  // Reset to a clean slate but keep file existence so storage helpers don't error.
  fs.writeFileSync(realPaths.agentRequests, '[]\n', 'utf8');
  fs.writeFileSync(realPaths.agentRuns, '[]\n', 'utf8');
  fs.writeFileSync(realPaths.agentArtifacts, '[]\n', 'utf8');
  fs.writeFileSync(realPaths.agentRunLog, '', 'utf8');
  fs.writeFileSync(realPaths.changeRequests, '[]\n', 'utf8');
  if (fs.existsSync(realPaths.audit)) fs.unlinkSync(realPaths.audit);
}

describe('P1-1 fix: dispatch-mock writes a real audit entry', () => {
  let backup: ReturnType<typeof snapshotAll>;
  beforeEach(() => {
    backup = snapshotAll();
    clearWrites();
  });
  afterEach(() => { restoreAll(backup); });

  it('emits action=dispatch with runId/artifactId metadata when the mock dispatcher runs', async () => {
    const server = createStrongholdServer();
    // Drive an agent-request through create -> approve -> enqueue using the
    // SERVICE LAYER (writes to the same real file the route reads from).
    const created = createAgentRequest(realPaths.agentRequests, {
      kind: 'status.summary',
      title: 'P1-1 dispatch test',
      prompt: 'summarize',
      requestedBy: 'Chris',
      targetAgent: 'igris',
    });
    const approved = approveAgentRequest(realPaths.agentRequests, created.id, 'Igris');
    const queued = enqueueAgentRequest(realPaths.agentRequests, approved.id);
    expect(queued.status).toBe('queued');

    // Reset audit so we only see the dispatch entry.
    if (fs.existsSync(realPaths.audit)) fs.unlinkSync(realPaths.audit);

    const res = await server.inject({
      method: 'POST',
      url: `/api/agent-requests/${queued.id}/dispatch-mock`,
    });
    expect(res.statusCode).toBe(200);

    // The dispatcher response must contain run + artifact with ids.
    const body = JSON.parse(res.body);
    expect(body.run?.id).toBeTruthy();
    expect(body.artifact?.id).toBeTruthy();

    // P1-1 core assertion: a NEW audit entry was written for THIS dispatch.
    const events = readAuditEvents(realPaths.audit);
    const dispatchEvent = events.find(
      (e) => e.action === 'dispatch' && e.targetId === queued.id,
    );
    expect(dispatchEvent).toBeTruthy();
    expect(dispatchEvent!.capability).toBe('agentRequest:dispatch');
    expect(dispatchEvent!.targetType).toBe('changeRequest');
    // outcome='validated' matches the existing audit-event vocabulary
    // (see /api/agent-requests/:id/enqueue which uses 'validated' for preflight-passed).
    expect(dispatchEvent!.outcome).toBe('validated');
    expect(dispatchEvent!.actor).toBe('Igris');
    const meta = dispatchEvent!.metadata as Record<string, unknown>;
    expect(meta.beforeStatus).toBe('queued');
    expect(meta.afterStatus).toBe('awaiting_human_review');
    expect(meta.runId).toBe(body.run.id);
    expect(meta.artifactId).toBe(body.artifact.id);

    // And the response body must expose the same run/artifact the audit
    // logged — proves the wiring captures the right return shape.
    expect(body.run.id).toBe(meta.runId);
    expect(body.artifact.id).toBe(meta.artifactId);
  });
});

describe('P1-2 fix: change-request approve on a non-existent id returns 404 with no audit entry', () => {
  let backup: ReturnType<typeof snapshotAll>;
  beforeEach(() => {
    backup = snapshotAll();
    clearWrites();
  });
  afterEach(() => { restoreAll(backup); });

  it('returns 404 and writes no audit entry for an unknown change-request id, even with attacker-crafted body.request', async () => {
    const server = createStrongholdServer();
    const ghostId = '99999999-9999-9999-9999-999999999999';
    // The OLD vulnerable route would have honored this body.request payload
    // and written a ghost audit entry. We pass it now to prove the fix.
    const res = await server.inject({
      method: 'POST',
      url: `/api/change-requests/${ghostId}/approve`,
      body: {
        actor: 'Mallory',
        reason: 'attempted log injection',
        request: {
          id: ghostId,
          kind: 'mission.create',
          title: 'fabricated CR',
          rationale: 'attacker-supplied',
          requestedBy: 'Mallory',
          status: 'pending_review',
          payload: {},
        },
      },
    });
    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: 'change request not found' });

    // P1-2 core assertion: NO audit entry with this targetId was written.
    const events = readAuditEvents(realPaths.audit);
    const ghost = events.find(
      (e) => e.targetId === ghostId && (e.action === 'approve' || e.action === 'reject' || e.action === 'apply'),
    );
    expect(ghost).toBeUndefined();
  });

  it('also returns 404 with no audit entry when the id is a random uuid and the body has no request fallback', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({
      method: 'POST',
      url: `/api/change-requests/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/approve`,
      body: { actor: 'Igris', reason: 'no such CR' },
    });
    expect(res.statusCode).toBe(404);
    const events2 = readAuditEvents(realPaths.audit);
    const ghost2 = events2.find(
      (e) => e.targetId === 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' && (e.action === 'approve' || e.action === 'reject' || e.action === 'apply'),
    );
    expect(ghost2).toBeUndefined();
  });
});