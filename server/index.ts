import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, PORT } from './config';
import { readSnapshot } from './services/snapshotBridge';
import { approvedDataPath } from './safety/pathGuard';
import { atomicWriteJson, readJsonArray } from './services/storage';
import type { ChangeRequest } from '../shared/types';
import { readAuditEvents, appendAuditEvent } from './services/auditLog';
import { createChangeRequest, approveChangeRequest, rejectChangeRequest, applyApprovedChangeRequest } from './services/approvalWorkflow';
import { listAgentRequests, createAgentRequest, approveAgentRequest, rejectAgentRequest, enqueueAgentRequest, cancelAgentRequest } from './services/agentRequestService';
import { dispatchMockAgentRequest } from './services/mockAgentDispatcher';
import { artifactToChangeRequestPayload } from './services/agentArtifactService';
import { isOrchestrationDisabled, disableOrchestration, enableOrchestration } from './safety/killSwitch';
import { createRateLimiter } from './safety/rateLimiter';
import { resolveApproval, listApprovals } from './services/approvalActions';
import { callHermesCron, validateCronInput, type CronAction, type CronDispatchError } from './services/cronService';
import { fetchRecentAgentArmyMessages } from './services/discordFeed';
import { buildActivityGraph } from './services/activityGraph';
import { readMemoryStatus, defaultMemoryPath } from './services/memoryStatus';

// Stronghold is a localhost-only dashboard. The Vite dev server binds to
// 127.0.0.1:5174 (see vite.config.ts). CORS is restricted to that exact origin
// so the API is not reachable from any other browser context, while still
// supporting preflight from the only legitimate UI surface.
const ALLOWED_ORIGIN = 'http://127.0.0.1:5174';

// THREAT MODEL: The Origin header is a CORS hint, not authentication.
// The real security boundary is the 127.0.0.1 socket binding in server/config.ts.
// DO NOT deploy this server on a routable interface (0.0.0.0, public IPs, ::)
// without revisiting this entire CORS layer. CORS does not stop a same-origin
// attacker from reaching the socket; it only stops a browser from allowing
// cross-origin reads. The 127.0.0.1 bind is what stops arbitrary callers.
function isOriginAllowed(origin: string | undefined | null): boolean {
  // Empty/undefined Origin = non-browser caller or same-origin; non-browser
  // callers don't enforce CORS so we don't gate them, but we still refuse to
  // echo any arbitrary origin back. The browser path is handled below.
  if (!origin) return true;
  return origin === ALLOWED_ORIGIN;
}

function corsHeaders(origin: string | undefined | null): Record<string, string> {
  // Always emit a literal allow-list value (never reflect input) so a
  // compromised renderer cannot trick the server into widening CORS.
  return {
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}

function corsDenialHeaders(): Record<string, string> {
  // No Access-Control-Allow-Origin header => browser blocks the response.
  return {
    'content-type': 'application/json',
  };
}

type InjectRequest = { method: string; url: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type InjectResponse = { statusCode: number; body: string; headers: Record<string, string> };
function json(statusCode: number, body: unknown, origin: string | undefined | null = null): InjectResponse {
  return { statusCode, body: JSON.stringify(body), headers: { 'content-type': 'application/json', ...corsHeaders(origin) } };
}
async function parseBody(req: http.IncomingMessage): Promise<unknown> {
  let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {};
}
function extractOrigin(headers: http.IncomingHttpHeaders | Record<string, string | string[] | undefined> | undefined): string | undefined {
  if (!headers) return undefined;
  const raw = (headers as Record<string, string | string[] | undefined>)['origin'];
  if (Array.isArray(raw)) return raw[0];
  return raw || undefined;
}

// P2 fix #2: rate limiter wiring (P2-3 from Tusk audit).
//
// The primitive in ./safety/rateLimiter.ts is a sliding-window limiter keyed
// by an opaque "actor" string. We key on `origin||'local'` so every distinct
// caller gets its own bucket, and we use ONE bucket per route family
// (change-requests / agent-requests / orchestration). Different families are
// INDEPENDENT so a burst on one surface cannot lock the operator out of
// another. Within a family, all state-changing endpoints share a bucket, which
// reflects the fact that approve/reject/apply on the same resource are part of
// one operator workflow.
//
// DEFAULT LIMIT: 30 requests / 60s per caller per route family.
// - Generous enough that legitimate operator workflows (multi-step approve)
//   never trip it under normal use.
// - Tight enough to blunt credential-stuffing, replay storms, or a runaway
//   client loop.
// Documented here and exercised in tests/api-rate-limit.test.ts.
//
// GET endpoints are intentionally NOT rate-limited: they do not mutate state
// and they power the live dashboard, which would otherwise visibly stall.
//
// Buckets are constructed per-server (not module-level) so test isolation and
// per-instance hot-reload do not leak state between server instances.
const RATE_LIMIT_WINDOW_MS = 60_000;
// Per-family rate-limit ceilings (requests per minute). Most families share
// the conservative 30/min default. The activity-graph endpoint, which is
// polled every 60s by the Routing Flow panel, gets a higher 60/min ceiling
// so a single dashboard tab doesn't risk bursting the bucket. Documented
// inline where enforced.
const RATE_LIMIT_FAMILY_MAX: Record<string, number> = {
  'change-requests': 30,
  'agent-requests': 30,
  'orchestration': 30,
  'approvals': 30,
  'cron': 30,
  'discord-read': 30,
  'activity-graph': 60,
  'memory-status': 30,
};

type RateLimitFamily = 'change-requests' | 'agent-requests' | 'orchestration' | 'approvals' | 'cron' | 'discord-read' | 'activity-graph' | 'memory-status';
type RateLimiters = Record<RateLimitFamily, ReturnType<typeof createRateLimiter>>;
function buildRateLimiters(): RateLimiters {
  const make = (family: RateLimitFamily) => createRateLimiter({ maxPerWindow: RATE_LIMIT_FAMILY_MAX[family], windowMs: RATE_LIMIT_WINDOW_MS });
  return {
    'change-requests': make('change-requests'),
    'agent-requests': make('agent-requests'),
    'orchestration': make('orchestration'),
    'approvals': make('approvals'),
    'cron': make('cron'),
    'discord-read': make('discord-read'),
    'activity-graph': make('activity-graph'),
    'memory-status': make('memory-status'),
  };
}
function makeRoute(limiters: RateLimiters) {
  function enforceRateLimit(family: RateLimitFamily, origin: string | undefined | null): InjectResponse | null {
    const actor = origin || 'local';
    const verdict = limiters[family].check(actor);
    if (verdict.allowed) return null;
    return json(429, { error: 'rate limit exceeded' }, origin);
  }
  // Map dispatcher errors to HTTP statuses per the brief:
  //   400 invalid args, 404 unknown id, 502 tool failure.
  function mapCronError(err: unknown, origin: string | undefined | null): InjectResponse {
    const tagged = err as CronDispatchError;
    const code = tagged?.code;
    const message = err instanceof Error ? err.message : String(err);
    if (code === 'NOT_FOUND') return json(404, { error: 'cron job not found', detail: message }, origin);
    if (code === 'INVALID') return json(400, { error: 'invalid cron request', detail: message }, origin);
    return json(502, { error: 'cron tool failure', detail: message }, origin);
  }
  return async function route(method: string, url: string, body: unknown | undefined, origin: string | undefined | null): Promise<InjectResponse> {
      try {
        return await routeInner(method, url, body, origin);
      } catch (err) {
        // Defensive: any unhandled throw from a service (e.g. invalid lifecycle
        // transition) becomes a 500 instead of crashing the request handler.
        // We deliberately do NOT write an audit entry here — the audit is for
        // successful, audited transitions only. The audit log stays a faithful
        // record of what actually changed.
        const message = err instanceof Error ? err.message : String(err);
        return json(500, { error: 'internal server error', detail: message }, origin);
      }
    };
    async function routeInner(method: string, url: string, body: unknown | undefined, origin: string | undefined | null): Promise<InjectResponse> {
    if (!isOriginAllowed(origin)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'origin not allowed' }), headers: corsDenialHeaders() };
    }
  if (method === 'OPTIONS') return json(204, {}, origin);
  if (method === 'GET' && url === '/api/health') return json(200, { ok: true, phase: 2, host: HOST, writeGate: 'approval-required' }, origin);
  if (method === 'GET' && url === '/api/snapshot') return json(200, readSnapshot(), origin);
  if (method === 'GET' && url === '/api/missions') return json(200, readJsonArray(approvedDataPath('missions')), origin);
  if (method === 'GET' && url.startsWith('/api/tasks')) return json(200, readJsonArray(approvedDataPath('tasks')), origin);
  if (method === 'GET' && url === '/api/change-requests') return json(200, readJsonArray(approvedDataPath('changeRequests')), origin);
  if (method === 'GET' && url === '/api/approvals') return json(200, listApprovals(approvedDataPath('approvals')), origin);
  if (method === 'GET' && url === '/api/audit') return json(200, readAuditEvents(approvedDataPath('audit')), origin);
  const agentFiles = { requests: approvedDataPath('agentRequests'), runs: approvedDataPath('agentRuns'), artifacts: approvedDataPath('agentArtifacts'), runLog: approvedDataPath('agentRunLog'), audit: approvedDataPath('audit') };
  const killFlag = 'data/agent-execution-disabled.flag';
  if (method === 'GET' && url === '/api/orchestration/health') return json(200, { ok: true, phase: 3, host: HOST, dispatchGate: 'approval-required', killSwitch: isOrchestrationDisabled(killFlag) ? 'active' : 'inactive' }, origin);
  if (method === 'POST' && url === '/api/orchestration/disable') { const limited = enforceRateLimit('orchestration', origin); if (limited) return limited; const wasEnabled = !isOrchestrationDisabled(killFlag); disableOrchestration(killFlag, 'operator disabled'); appendAuditEvent(approvedDataPath('audit'), { actor: 'Igris', capability: 'orchestration:disable', action: 'disable', targetType: 'system', outcome: 'approved', reason: 'operator disabled', metadata: { beforeStatus: wasEnabled ? 'enabled' : 'disabled', afterStatus: 'disabled' } }); return json(200, { ok: true, killSwitch: 'active' }, origin); }
    if (method === 'POST' && url === '/api/orchestration/enable') { const limited = enforceRateLimit('orchestration', origin); if (limited) return limited; const wasDisabled = isOrchestrationDisabled(killFlag); enableOrchestration(killFlag); appendAuditEvent(approvedDataPath('audit'), { actor: 'Igris', capability: 'orchestration:enable', action: 'enable', targetType: 'system', outcome: 'approved', reason: 'operator enabled', metadata: { beforeStatus: wasDisabled ? 'disabled' : 'enabled', afterStatus: 'enabled' } }); return json(200, { ok: true, killSwitch: 'inactive' }, origin); }
  if (method === 'GET' && url === '/api/agent-requests') return json(200, listAgentRequests(agentFiles.requests), origin);
  if (method === 'POST' && url === '/api/agent-requests') {
    const limited = enforceRateLimit('agent-requests', origin); if (limited) return limited;
    const created = createAgentRequest(agentFiles.requests, body as Record<string, unknown>);
    appendAuditEvent(approvedDataPath('audit'), {
      actor: created.requestedBy || 'Chris',
      capability: 'agentRequest:create',
      action: 'create',
      targetType: 'changeRequest',
      targetId: created.id,
      outcome: 'requested',
      reason: `agent request created by ${created.requestedBy || 'Chris'}`,
      metadata: { beforeStatus: 'none', afterStatus: 'pending_review', kind: created.kind, title: created.title, targetAgent: created.targetAgent },
    });
    return json(201, created, origin);
  }
  if (method === 'GET' && url === '/api/agent-runs') return json(200, readJsonArray(agentFiles.runs), origin);
  if (method === 'GET' && url === '/api/agent-artifacts') return json(200, readJsonArray(agentFiles.artifacts), origin);
  const agentRoute = url.match(/^\/api\/agent-requests\/([^/]+)\/(approve|reject|enqueue|dispatch-mock|cancel)$/);
    if (method === 'POST' && agentRoute) {
      const limited = enforceRateLimit('agent-requests', origin); if (limited) return limited;
      const id = agentRoute[1];
      const op = agentRoute[2] as 'approve' | 'reject' | 'enqueue' | 'dispatch-mock' | 'cancel';
      // P2 fix #3: capture before-status for audit metadata on agent-request lifecycle transitions.
      const before = listAgentRequests(agentFiles.requests).find((r) => r.id === id);
      if (op === 'approve') {
        const updated = approveAgentRequest(agentFiles.requests, id, 'Igris');
        appendAuditEvent(approvedDataPath('audit'), { actor: 'Igris', capability: 'agentRequest:approve', action: 'approve', targetType: 'changeRequest', targetId: id, outcome: 'approved', reason: 'approved by Igris', metadata: { beforeStatus: before?.status ?? 'pending_review', afterStatus: updated.status, kind: updated.kind, title: updated.title, targetAgent: updated.targetAgent } });
        return json(200, updated, origin);
      }
      if (op === 'reject') {
        const updated = rejectAgentRequest(agentFiles.requests, id, 'Igris', 'rejected by operator');
        appendAuditEvent(approvedDataPath('audit'), { actor: 'Igris', capability: 'agentRequest:reject', action: 'reject', targetType: 'changeRequest', targetId: id, outcome: 'rejected', reason: 'rejected by operator', metadata: { beforeStatus: before?.status ?? 'pending_review', afterStatus: updated.status, kind: updated.kind, title: updated.title, targetAgent: updated.targetAgent } });
        return json(200, updated, origin);
      }
      if (op === 'enqueue') {
        const updated = enqueueAgentRequest(agentFiles.requests, id);
        appendAuditEvent(approvedDataPath('audit'), { actor: 'Igris', capability: 'agentRequest:enqueue', action: 'enqueue', targetType: 'changeRequest', targetId: id, outcome: 'validated', reason: 'enqueued after Tusk preflight', metadata: { beforeStatus: before?.status ?? 'approved', afterStatus: updated.status, kind: updated.kind, title: updated.title, targetAgent: updated.targetAgent, preflightVerdict: updated.preflightVerdict } });
        return json(200, updated, origin);
      }
      if (op === 'dispatch-mock') {
        // P1-1 fix (Sentinel): dispatchMockAgentRequest mutates 4 files but
        // writes no audit entry. Capture the return value and audit the
        // dispatched run + artifact so the lifecycle is traceable.
        const updated = dispatchMockAgentRequest(agentFiles, id);
        appendAuditEvent(approvedDataPath('audit'), {
          actor: 'Igris',
          capability: 'agentRequest:dispatch',
          action: 'dispatch',
          targetType: 'changeRequest',
          targetId: id,
          outcome: 'validated',
          reason: 'mock dispatcher executed',
          metadata: {
            beforeStatus: 'queued',
            afterStatus: 'awaiting_human_review',
            runId: updated.run.id,
            artifactId: updated.artifact.id,
          },
        });
        return json(200, updated, origin);
      }
      // P1 fix (Sentinel): cancel used to be a stub returning {ok:true}
      // with no write and no audit. Wire it through cancelAgentRequest and
      // audit the lifecycle transition like every other operator action.
      // The service throws on illegal status (queued/dispatched/etc) so we
      // catch and return 409 without auditing — the audit log stays a
      // record of transitions that actually happened.
      let updated;
      try {
        updated = cancelAgentRequest(agentFiles.requests, id, 'Igris', 'cancelled by operator');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return json(409, { error: 'cannot cancel agent request', detail: message }, origin);
      }
      appendAuditEvent(approvedDataPath('audit'), {
        actor: 'Igris',
        capability: 'agentRequest:cancel',
        action: 'cancel',
        targetType: 'changeRequest',
        targetId: id,
        outcome: 'rejected',
        reason: 'cancelled by operator',
        metadata: { beforeStatus: before?.status ?? 'pending_review', afterStatus: updated.status, kind: updated.kind, title: updated.title, targetAgent: updated.targetAgent },
      });
      return json(200, updated, origin);
    }
  const artifactRoute = url.match(/^\/api\/agent-artifacts\/([^/]+)\/create-change-request$/);
  if (method === 'POST' && artifactRoute) {
    const limited = enforceRateLimit('agent-requests', origin); if (limited) return limited;
    const artifacts = readJsonArray<{ id?: string }>(approvedDataPath('agentArtifacts'));
    const artifact = artifacts.find((a) => a.id === artifactRoute[1]);
    if (!artifact) return json(404, { error: 'artifact not found' }, origin);
    return json(201, artifactToChangeRequestPayload(artifact as never, 'Chris'), origin);
  }
  if (method === 'POST' && url === '/api/change-requests') {
    const limited = enforceRateLimit('change-requests', origin); if (limited) return limited;
    const created = createChangeRequest(body as never);
    const existing = readJsonArray<ChangeRequest>(approvedDataPath('changeRequests'));
    atomicWriteJson(approvedDataPath('changeRequests'), [...existing, created]);
    // P1 fix (Sentinel): POST /api/change-requests was persisting via
    // atomicWriteJson but never calling appendAuditEvent, leaving the
    // audit log silent on the most common operator action. Emit the
    // canonical create event now, matching the agentRequest:create shape
    // (action=create, capability=changeRequest:create, outcome=requested).
    appendAuditEvent(approvedDataPath('audit'), {
      action: 'create',
      capability: 'changeRequest:create',
      actor: ((body as { actor?: unknown })?.actor as string) || 'Chris',
      targetType: 'changeRequest',
      targetId: created.id,
      outcome: 'requested',
      reason: 'change request created',
      metadata: { beforeStatus: 'none', afterStatus: created.status, kind: created.kind, title: created.title },
    });
    return json(201, created, origin);
  }
  const approve = url.match(/^\/api\/change-requests\/([^/]+)\/(approve|reject|apply)$/);
    if (method === 'POST' && approve) {
      const limited = enforceRateLimit('change-requests', origin); if (limited) return limited;
      const requests = readJsonArray<ChangeRequest>(approvedDataPath('changeRequests'));
      const index = requests.findIndex(request => request.id === approve[1]);
      // P1-2 fix (Sentinel): remove the body.request fallback entirely.
      // Accepting a user-supplied `request` object allowed an attacker to
      // fabricate a CR, run the workflow in-memory, and write a ghost audit
      // entry for a non-persisted resource. Now we only operate on records
      // that exist in the approved store.
      const request = index >= 0 ? requests[index] : undefined;
      if (!request) return json(404, { error: 'change request not found' }, origin);
      const actor = (body as { actor?: string }).actor || 'Igris';
      const reason = (body as { reason?: string }).reason || 'approved by operator';
      const action = approve[2] as 'approve' | 'reject' | 'apply';
      const updated = action === 'approve' ? approveChangeRequest(request, actor, reason) : action === 'reject' ? rejectChangeRequest(request, actor, reason) : applyApprovedChangeRequest(request, actor);
      requests[index] = updated;
      atomicWriteJson(approvedDataPath('changeRequests'), requests);
      // P2 fix #3: audit lifecycle transitions. See audit-event-shape docs above.
      // Audit only fires after the record is persisted; failed/invalid paths
      // throw before reaching this line and stay out of the log.
      appendAuditEvent(approvedDataPath('audit'), {
        actor,
        capability: action === 'approve' ? 'changeRequest:approve' : action === 'reject' ? 'changeRequest:reject' : 'changeRequest:apply',
        action,
        targetType: 'changeRequest',
        targetId: updated.id,
        outcome: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'applied',
        reason: action === 'apply' ? `applied by ${actor}` : reason,
        metadata: { beforeStatus: request.status, afterStatus: updated.status, kind: updated.kind, title: updated.title },
      });
      return json(200, updated, origin);
    }
  // FEATURE 1 — Approvals wire (audit-log only).
  // The right rail exposes lightweight approval cards. This route resolves a
  // single card and appends exactly one audit entry on success. The body of
  // the brief calls these "audit-log only" — they do NOT cascade into the
  // change-request workflow or any tool surface.
  //
  // Idempotency / concurrency: every call re-reads the approvals file via
  // resolveApproval (atomic rename underneath). If the card was already
  // resolved by an earlier call we 409 with the current status; the audit
  // log stays at one entry per id. See tests/phaseC-approvals.test.ts.
  const approvalRoute = url.match(/^\/api\/approvals\/([^/]+)\/(approve|reject)$/);
  if (method === 'POST' && approvalRoute) {
    const limited = enforceRateLimit('approvals', origin); if (limited) return limited;
    const id = approvalRoute[1];
    const action = approvalRoute[2] as 'approve' | 'reject';
    // Id charset per brief: /^[a-zA-Z0-9_-]{1,64}$/. Anything else is 400.
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) return json(400, { error: 'invalid approval id' }, origin);
    const payload = (body || {}) as { reason?: string };
    const reason = typeof payload.reason === 'string' ? payload.reason : undefined;
    if (reason !== undefined && reason.length > 500) return json(400, { error: 'reason exceeds 500 characters' }, origin);
    const decision = action === 'approve' ? 'approved' : 'rejected';
    const result = await resolveApproval(approvedDataPath('approvals'), id, decision, 'ui-button', reason);
    if (!result.ok) {
      if (result.status === 404) return json(404, { error: 'approval not found' }, origin);
      return json(409, { error: 'approval already resolved', status: result.current.status }, origin);
    }
    // P0 fix (Sentinel): re-read after a successful resolve to guarantee
    // exactly one audit entry per id. resolveApproval already serializes
    // mutations through an in-process mutex and post-write verifies the
    // on-disk status, but two callers that BOTH received ok:true would
    // otherwise both reach this point and each append an audit row. The
    // re-read is the final guard: if the file now shows status != pending
    // for this id and another caller has already audited, we 409 without
    // writing a duplicate audit entry.
    const reread = listApprovals(approvedDataPath('approvals'));
    const onDisk = reread.find(r => r.id === id);
    if (!onDisk || onDisk.status === 'pending') {
      // resolveApproval said ok:true but the file is missing or still
      // pending — something raced us. Refuse to audit; the route cannot
      // claim success.
      return json(409, { error: 'approval already resolved', status: onDisk?.status ?? 'unknown' }, origin);
    }
    // Append the audit entry exactly once, only after a successful resolve.
    // Reuse appendAuditEvent directly — same primitive as every other write.
    appendAuditEvent(approvedDataPath('audit'), {
      actor: 'ui-button',
      capability: action === 'approve' ? 'approval:approve' : 'approval:reject',
      action: `approval.${action}`,
      targetType: 'changeRequest',
      targetId: result.record.id,
      outcome: decision,
      reason: reason,
      metadata: { beforeStatus: 'pending', afterStatus: result.record.status, source: 'right-rail-approvals', title: result.record.title },
    });
    return json(200, result.record, origin);
  }
  // FEATURE 2 — Cron CRUD endpoints.
  // All handlers proxy to the host `hermes cron` CLI via cronService. The
  // default implementation shells out; tests inject a fake dispatcher via
  // vi.mock('../server/services/cronService'). Validation lives in the
  // service so it's reusable. Each successful mutating action appends one
  // audit entry via the shared appendAuditEvent primitive.
  if (method === 'GET' && url === '/api/cron') {
    try {
      const jobs = await callHermesCron('list', {});
      return json(200, jobs, origin);
    } catch (err) {
      return mapCronError(err, origin);
    }
  }
  if (method === 'POST' && url === '/api/cron') {
    const limited = enforceRateLimit('cron', origin); if (limited) return limited;
    const errors = validateCronInput((body || {}) as Record<string, unknown>, 'create');
    if (errors.length) return json(400, { error: errors.map(e => `${e.field}: ${e.message}`).join('; ') }, origin);
    try {
      const created = await callHermesCron('create', (body || {}) as Record<string, unknown>);
      const createdObj = created as { id?: string; name?: string; schedule?: string };
      if (createdObj?.id) {
        appendAuditEvent(approvedDataPath('audit'), {
          actor: 'ui-button',
          capability: 'cron:create',
          action: 'cron.create',
          targetType: 'changeRequest',
          targetId: createdObj.id,
          outcome: 'approved',
          reason: `cron job created by operator`,
          metadata: { name: createdObj.name, schedule: createdObj.schedule },
        });
      }
      return json(201, created, origin);
    } catch (err) {
      return mapCronError(err, origin);
    }
  }
  const cronRoute = url.match(/^\/api\/cron\/([^/]+)(?:\/(pause|resume))?$/);
  if (cronRoute) {
    const id = decodeURIComponent(cronRoute[1]);
    const sub = cronRoute[2] as 'pause' | 'resume' | undefined;
    if (sub) {
      if (method !== 'POST') return json(405, { error: 'method not allowed' }, origin);
      const limited = enforceRateLimit('cron', origin); if (limited) return limited;
      try {
        const action: CronAction = sub;
        const updated = await callHermesCron(action, { id });
        appendAuditEvent(approvedDataPath('audit'), {
          actor: 'ui-button',
          capability: `cron:${sub}`,
          action: `cron.${sub}`,
          targetType: 'changeRequest',
          targetId: id,
          outcome: 'approved',
          reason: `cron job ${sub}d by operator`,
          metadata: { id },
        });
        return json(200, updated, origin);
      } catch (err) {
        return mapCronError(err, origin);
      }
    }
    if (method === 'GET') {
      try {
        const job = await callHermesCron('get', { id });
        return json(200, job, origin);
      } catch (err) {
        return mapCronError(err, origin);
      }
    }
    if (method === 'PATCH') {
      const limited = enforceRateLimit('cron', origin); if (limited) return limited;
      const errors = validateCronInput((body || {}) as Record<string, unknown>, 'update');
      if (errors.length) return json(400, { error: errors.map(e => `${e.field}: ${e.message}`).join('; ') }, origin);
      try {
        const updated = await callHermesCron('update', { id, ...((body || {}) as Record<string, unknown>) });
        appendAuditEvent(approvedDataPath('audit'), {
          actor: 'ui-button',
          capability: 'cron:update',
          action: 'cron.update',
          targetType: 'changeRequest',
          targetId: id,
          outcome: 'approved',
          reason: `cron job updated by operator`,
          metadata: { id },
        });
        return json(200, updated, origin);
      } catch (err) {
        return mapCronError(err, origin);
      }
    }
    if (method === 'DELETE') {
      const limited = enforceRateLimit('cron', origin); if (limited) return limited;
      const payload = (body || {}) as { confirm?: unknown };
      if (payload.confirm !== true) return json(400, { error: 'confirm: true is required to delete a cron job' }, origin);
      try {
        const removed = await callHermesCron('remove', { id });
        appendAuditEvent(approvedDataPath('audit'), {
          actor: 'ui-button',
          capability: 'cron:delete',
          action: 'cron.delete',
          targetType: 'changeRequest',
          targetId: id,
          outcome: 'approved',
          reason: `cron job deleted by operator`,
          metadata: { id },
        });
        return json(200, removed, origin);
      } catch (err) {
        return mapCronError(err, origin);
      }
    }
  }
  // FEATURE — Discord #agent-army read-only consumer (Phase D1).
  //
  // READ-ONLY: only GET is wired. No POST/PATCH/DELETE handlers exist for
  // /api/discord/* — Discord state cannot be mutated from Stronghold. The
  // route wraps `fetchRecentAgentArmyMessages` from server/services/discordFeed.ts
  // and adds:
  //   - localhost origin guard (existing CORS layer)
  //   - per-family rate limit ('discord-read', 30/min default — same shape
  //     as every other state-changing family; the GET endpoint would not
  //     normally be rate-limited per the inline comment in buildRateLimiters,
  //     but Phase D1 explicitly requires a dedicated bucket to protect the
  //     Discord rate-limit window from a runaway dashboard loop)
  //   - exactly one audit-log entry per request, with outcome=ok on success
  //     or outcome=failed on error.
  if (method === 'GET' && url.startsWith('/api/discord/agent-army')) {
    const limited = enforceRateLimit('discord-read', origin); if (limited) return limited;
    // Parse + clamp ?limit. Default 10, max 50. Anything non-numeric or
    // out-of-range falls back to the default rather than 400'ing the UI.
    const rawLimit = (() => {
      const q = url.split('?')[1] || '';
      const params = new URLSearchParams(q);
      const v = params.get('limit');
      if (!v) return 10;
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1) return 10;
      return Math.min(50, Math.floor(n));
    })();
    const channelId = process.env.DISCORD_HOME_CHANNEL || '';
    try {
      const messages = await fetchRecentAgentArmyMessages(rawLimit);
      appendAuditEvent(approvedDataPath('audit'), {
        action: 'discord.read',
        capability: 'discord:read:agent-army',
        actor: 'Stronghold',
        targetType: 'discord-channel',
        targetId: channelId,
        outcome: 'ok',
        reason: `read ${messages.length} messages from #agent-army`,
        metadata: { limit: rawLimit, returned: messages.length },
      });
      return json(200, { messages, fetchedAt: new Date().toISOString() }, origin);
    } catch (err) {
      const tagged = err as { code?: string; status?: number; retryAfter?: number; message?: string };
      const code = tagged?.code || 'DISCORD_FAILURE';
      const message = tagged?.message || String(err);
      appendAuditEvent(approvedDataPath('audit'), {
        action: 'discord.read',
        capability: 'discord:read:agent-army',
        actor: 'Stronghold',
        targetType: 'discord-channel',
        targetId: channelId,
        outcome: 'failed',
        reason: `discord read failed: ${code}`,
        metadata: { limit: rawLimit, code, status: tagged?.status, retryAfter: tagged?.retryAfter, error: message },
      });
      if (code === 'UNAUTHORIZED') return json(503, { error: 'discord bot token rejected', code: 'UNAUTHORIZED' }, origin);
      if (code === 'RATE_LIMITED') return json(503, { error: 'discord rate limited', code: 'RATE_LIMITED', retryAfter: tagged?.retryAfter }, origin);
      return json(502, { error: 'discord fetch failed', detail: message }, origin);
    }
  }
  // FEATURE — Phase D4 Activity Graph (read-only).
  //
  // Mirrors the Discord-read route shape exactly: localhost origin guard,
  // per-family rate limit ('activity-graph', 60/min), one audit entry per
  // request (ok on success, failed on error), and a JSON envelope with the
  // graph payload.
  //
  // The route is READ-ONLY: no POST/PATCH/DELETE handlers exist for
  // /api/activity-graph/* — activity is reconstructed from the audit log
  // on demand, never mutated from this surface.
  if (method === 'GET' && url.startsWith('/api/activity-graph')) {
    const limited = enforceRateLimit('activity-graph', origin); if (limited) return limited;
    // Parse + clamp windowHours. The service has its own clampWindowHours
    // helper; we run it on the parsed number so non-numeric and negative
    // inputs land on the default of 24h. The service returns a windowHours
    // field in the response so the UI can verify what was actually applied.
    const rawWindowHours = (() => {
      const q = url.split('?')[1] || '';
      const params = new URLSearchParams(q);
      const v = params.get('windowHours');
      if (!v) return 24;
      const n = Number(v);
      // Treat non-numeric, NaN, AND negative values as invalid — they
      // fall back to the 24h default rather than 400'ing the UI.
      if (!Number.isFinite(n) || n < 0) return 24;
      return n;
    })();
    // Clamp a valid number to [1, 168] (one hour .. one week). The service
    // applies the same clamp so callers always see a sane windowHours.
    const requestedWindowHours = Math.min(168, Math.max(1, Math.floor(rawWindowHours)));
    try {
      const graph = buildActivityGraph(approvedDataPath('audit'), { windowHours: requestedWindowHours });
      appendAuditEvent(approvedDataPath('audit'), {
        action: 'activity-graph.read',
        capability: 'graph:read',
        actor: 'Stronghold',
        targetType: 'activity-graph',
        targetId: 'main',
        outcome: 'ok',
        reason: `activity graph read: ${graph.edges.length} edges across ${graph.divisions.length} divisions (window=${graph.windowHours}h)`,
        metadata: { windowHours: graph.windowHours, edges: graph.edges.length, divisions: graph.divisions.length, totalEntries: graph.totalEntries },
      });
      return json(200, graph, origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendAuditEvent(approvedDataPath('audit'), {
        action: 'activity-graph.read',
        capability: 'graph:read',
        actor: 'Stronghold',
        targetType: 'activity-graph',
        targetId: 'main',
        outcome: 'failed',
        reason: `activity graph read failed: ${message}`,
        metadata: { error: message },
      });
      return json(500, { error: 'activity graph build failed', detail: message }, origin);
    }
  }

  // GET /api/memory-status — Phase D3
  // Read-only audit/lint view of the Hermes MEMORY.md file. Returns
  // file size, last-modified timestamp, per-section breakdown (title,
  // char count, first sentence, line range), and the raw text for
  // clipboard copy. The route never writes; the audit entry records
  // every read so the dashboard's own visibility is auditable.
  if (method === 'GET' && url === '/api/memory-status') {
    const limited = enforceRateLimit('memory-status', origin); if (limited) return limited;
    const memoryPath = process.env.HERMES_MEMORY_PATH || defaultMemoryPath();
    try {
      const status = readMemoryStatus(memoryPath);
      appendAuditEvent(approvedDataPath('audit'), {
        action: 'memory-status.read',
        capability: 'memory:read',
        actor: 'Stronghold',
        targetType: 'memory-file',
        targetId: 'MEMORY.md',
        outcome: 'ok',
        reason: `memory status read: ${status.sections.length} sections, ${status.sizeBytes} bytes`,
        metadata: { sections: status.sections.length, sizeBytes: status.sizeBytes, exists: status.exists },
      });
      return json(200, status, origin);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      appendAuditEvent(approvedDataPath('audit'), {
        action: 'memory-status.read',
        capability: 'memory:read',
        actor: 'Stronghold',
        targetType: 'memory-file',
        targetId: 'MEMORY.md',
        outcome: 'failed',
        reason: `memory status read failed: ${message}`,
        metadata: { error: message },
      });
      return json(500, { error: 'memory status read failed', detail: message }, origin);
    }
  }

  return json(404, { error: 'not found', safe: 'no generic command/write endpoint exists' }, origin);
  };
}
export function createStrongholdServer() {
  const limiters = buildRateLimiters();
  const route = makeRoute(limiters);
  return {
    inject: (req: InjectRequest) => route(req.method, req.url, req.body, extractOrigin(req.headers)),
    listen: () => {
      const server = http.createServer(async (req, res) => {
        const result = await route(req.method || 'GET', req.url || '/', req.method === 'GET' ? undefined : await parseBody(req), extractOrigin(req.headers));
        res.writeHead(result.statusCode, result.headers); res.end(result.body);
      });
      server.listen(PORT, HOST, () => console.log(`Stronghold Phase 2 API on http://${HOST}:${PORT}`));
      return server;
    }
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) createStrongholdServer().listen();
