import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST, PORT } from './config';
import { readSnapshot } from './services/snapshotBridge';
import { approvedDataPath } from './safety/pathGuard';
import { atomicWriteJson, readJsonArray } from './services/storage';
import type { ChangeRequest } from '../shared/types';
import { readAuditEvents } from './services/auditLog';
import { createChangeRequest, approveChangeRequest, rejectChangeRequest, applyApprovedChangeRequest } from './services/approvalWorkflow';
import { listAgentRequests, createAgentRequest, approveAgentRequest, rejectAgentRequest, enqueueAgentRequest } from './services/agentRequestService';
import { dispatchMockAgentRequest } from './services/mockAgentDispatcher';
import { artifactToChangeRequestPayload } from './services/agentArtifactService';
import { isOrchestrationDisabled, disableOrchestration, enableOrchestration } from './safety/killSwitch';

type InjectRequest = { method: string; url: string; body?: unknown };
type InjectResponse = { statusCode: number; body: string; headers: Record<string, string> };
function json(statusCode: number, body: unknown): InjectResponse { return { statusCode, body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' } }; }
async function parseBody(req: http.IncomingMessage): Promise<unknown> {
  let raw = ''; for await (const chunk of req) raw += chunk; return raw ? JSON.parse(raw) : {};
}
async function route(method: string, url: string, body?: unknown): Promise<InjectResponse> {
  if (method === 'OPTIONS') return json(204, {});
  if (method === 'GET' && url === '/api/health') return json(200, { ok: true, phase: 2, host: HOST, writeGate: 'approval-required' });
  if (method === 'GET' && url === '/api/snapshot') return json(200, readSnapshot());
  if (method === 'GET' && url === '/api/missions') return json(200, readJsonArray(approvedDataPath('missions')));
  if (method === 'GET' && url.startsWith('/api/tasks')) return json(200, readJsonArray(approvedDataPath('tasks')));
  if (method === 'GET' && url === '/api/change-requests') return json(200, readJsonArray(approvedDataPath('changeRequests')));
  if (method === 'GET' && url === '/api/audit') return json(200, readAuditEvents(approvedDataPath('audit')));
  const agentFiles = { requests: approvedDataPath('agentRequests'), runs: approvedDataPath('agentRuns'), artifacts: approvedDataPath('agentArtifacts'), runLog: approvedDataPath('agentRunLog'), audit: approvedDataPath('audit') };
  const killFlag = 'data/agent-execution-disabled.flag';
  if (method === 'GET' && url === '/api/orchestration/health') return json(200, { ok: true, phase: 3, host: HOST, dispatchGate: 'approval-required', killSwitch: isOrchestrationDisabled(killFlag) ? 'active' : 'inactive' });
  if (method === 'POST' && url === '/api/orchestration/disable') { disableOrchestration(killFlag, 'operator disabled'); return json(200, { ok: true, killSwitch: 'active' }); }
  if (method === 'POST' && url === '/api/orchestration/enable') { enableOrchestration(killFlag); return json(200, { ok: true, killSwitch: 'inactive' }); }
  if (method === 'GET' && url === '/api/agent-requests') return json(200, listAgentRequests(agentFiles.requests));
  if (method === 'POST' && url === '/api/agent-requests') return json(201, createAgentRequest(agentFiles.requests, body as Record<string, unknown>));
  if (method === 'GET' && url === '/api/agent-runs') return json(200, readJsonArray(agentFiles.runs));
  if (method === 'GET' && url === '/api/agent-artifacts') return json(200, readJsonArray(agentFiles.artifacts));
  const agentRoute = url.match(/^\/api\/agent-requests\/([^/]+)\/(approve|reject|enqueue|dispatch-mock|cancel)$/);
  if (method === 'POST' && agentRoute) {
    const id = agentRoute[1];
    if (agentRoute[2] === 'approve') return json(200, approveAgentRequest(agentFiles.requests, id, 'Igris'));
    if (agentRoute[2] === 'reject') return json(200, rejectAgentRequest(agentFiles.requests, id, 'Igris', 'rejected by operator'));
    if (agentRoute[2] === 'enqueue') return json(200, enqueueAgentRequest(agentFiles.requests, id));
    if (agentRoute[2] === 'dispatch-mock') return json(200, dispatchMockAgentRequest(agentFiles, id));
    return json(200, { ok: true, status: 'cancelled' });
  }
  const artifactRoute = url.match(/^\/api\/agent-artifacts\/([^/]+)\/create-change-request$/);
  if (method === 'POST' && artifactRoute) {
    const artifacts = readJsonArray<{ id?: string }>(approvedDataPath('agentArtifacts'));
    const artifact = artifacts.find((a) => a.id === artifactRoute[1]);
    if (!artifact) return json(404, { error: 'artifact not found' });
    return json(201, artifactToChangeRequestPayload(artifact as never, 'Chris'));
  }
  if (method === 'POST' && url === '/api/change-requests') {
    const created = createChangeRequest(body as never);
    const existing = readJsonArray<ChangeRequest>(approvedDataPath('changeRequests'));
    atomicWriteJson(approvedDataPath('changeRequests'), [...existing, created]);
    return json(201, created);
  }
  const approve = url.match(/^\/api\/change-requests\/([^/]+)\/(approve|reject|apply)$/);
  if (method === 'POST' && approve) {
    const requests = readJsonArray<ChangeRequest>(approvedDataPath('changeRequests'));
    const index = requests.findIndex(request => request.id === approve[1]);
    const request = index >= 0 ? requests[index] : (body as { request?: ChangeRequest })?.request;
    if (!request) return json(404, { error: 'change request not found' });
    const actor = (body as { actor?: string }).actor || 'Igris';
    const reason = (body as { reason?: string }).reason || 'approved by operator';
    const updated = approve[2] === 'approve' ? approveChangeRequest(request, actor, reason) : approve[2] === 'reject' ? rejectChangeRequest(request, actor, reason) : applyApprovedChangeRequest(request, actor);
    if (index >= 0) { requests[index] = updated; atomicWriteJson(approvedDataPath('changeRequests'), requests); }
    return json(200, updated);
  }
  return json(404, { error: 'not found', safe: 'no generic command/write endpoint exists' });
}
export function createStrongholdServer() {
  return {
    inject: (req: InjectRequest) => route(req.method, req.url, req.body),
    listen: () => {
      const server = http.createServer(async (req, res) => {
        const result = await route(req.method || 'GET', req.url || '/', req.method === 'GET' ? undefined : await parseBody(req));
        res.writeHead(result.statusCode, result.headers); res.end(result.body);
      });
      server.listen(PORT, HOST, () => console.log(`Stronghold Phase 2 API on http://${HOST}:${PORT}`));
      return server;
    }
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) createStrongholdServer().listen();
