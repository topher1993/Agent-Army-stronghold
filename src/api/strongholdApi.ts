import type { ChangeRequest, AuditEvent } from '../../shared/types';
import type { AgentArtifact, AgentRequest, AgentRun } from '../../shared/agentTypes';
import type { WorkCard } from '../types';

const API_BASE = 'http://127.0.0.1:5175/api';

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    // Surface the server's error body so the UI can show a meaningful toast
    // (e.g. "approval already resolved", "schedule invalid"). Without this
    // the catch block only sees a status number.
    let detail = `${path} failed: ${response.status}`;
    try { const body = await response.json(); detail = body?.error ? `${path}: ${body.error}` : detail; } catch { /* noop */ }
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}

export type ApprovalCard = {
  id: string;
  title: string;
  status: 'pending' | 'approved' | 'rejected';
  payload?: unknown;
  requestedBy?: string;
  createdAt: string;
  updatedAt: string;
  decidedBy?: string;
  decisionReason?: string;
  decidedAt?: string;
};

export type CronJobSummaryApi = {
  id: string;
  name: string;
  schedule: string;
  promptSnippet?: string;
  enabled: boolean;
  lastStatus?: string;
  nextRun?: string;
  profile?: string;
  deliver?: string;
  skills?: string[];
};

export type CronJobDetail = CronJobSummaryApi & {
  prompt: string;
  toolsets?: string[];
  noAgent?: boolean;
  raw?: Record<string, unknown>;
};

export async function backendHealth(): Promise<{ ok: boolean; phase?: number; error?: string }> {
  try {
    return await apiJson('/health');
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'backend unavailable' };
  }
}

export const strongholdApi = {
  listChangeRequests: () => apiJson<ChangeRequest[]>('/change-requests'),
  createChangeRequest: (body: unknown) => apiJson<ChangeRequest>('/change-requests', { method: 'POST', body: JSON.stringify(body) }),
  decideChangeRequest: (id: string, action: 'approve' | 'reject' | 'apply', body: unknown = {}) => apiJson<ChangeRequest>(`/change-requests/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
  listApprovals: () => apiJson<ApprovalCard[]>('/approvals'),
  decideApproval: (id: string, action: 'approve' | 'reject', body: { reason?: string } = {}) => apiJson<ApprovalCard>(`/approvals/${id}/${action}`, { method: 'POST', body: JSON.stringify(body) }),
  listAudit: () => apiJson<AuditEvent[]>('/audit'),
  listAgentRequests: () => apiJson<AgentRequest[]>('/agent-requests'),
  createAgentRequest: (body: unknown) => apiJson<AgentRequest>('/agent-requests', { method: 'POST', body: JSON.stringify(body) }),
  decideAgentRequest: (id: string, action: 'approve' | 'reject' | 'enqueue' | 'dispatch-mock' | 'cancel') => apiJson<unknown>(`/agent-requests/${id}/${action}`, { method: 'POST', body: JSON.stringify({ actor: 'Igris' }) }),
  listAgentRuns: () => apiJson<AgentRun[]>('/agent-runs'),
  listAgentArtifacts: () => apiJson<AgentArtifact[]>('/agent-artifacts'),
  promoteArtifact: (id: string) => apiJson<ChangeRequest>(`/agent-artifacts/${id}/create-change-request`, { method: 'POST', body: JSON.stringify({ actor: 'Chris' }) }),
  fetchWorkCards: () => apiJson<WorkCard[]>('/workcards'),
  // FEATURE 2 — Cron CRUD (full surface; proxies through to hermes cron CLI).
  listCronJobs: () => apiJson<CronJobSummaryApi[]>('/cron'),
  getCronJob: (id: string) => apiJson<CronJobDetail>(`/cron/${encodeURIComponent(id)}`),
  createCronJob: (body: CronJobCreateInput) => apiJson<CronJobDetail>('/cron', { method: 'POST', body: JSON.stringify(body) }),
  updateCronJob: (id: string, body: CronJobCreateInput) => apiJson<CronJobDetail>(`/cron/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) }),
  pauseCronJob: (id: string) => apiJson<CronJobDetail>(`/cron/${encodeURIComponent(id)}/pause`, { method: 'POST' }),
  resumeCronJob: (id: string) => apiJson<CronJobDetail>(`/cron/${encodeURIComponent(id)}/resume`, { method: 'POST' }),
  deleteCronJob: (id: string) => apiJson<{ ok: true; id: string }>(`/cron/${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ confirm: true }) }),
};

export type CronJobCreateInput = {
  name: string;
  schedule: string;
  prompt: string;
  skills?: string[];
  enabled?: boolean;
  deliver?: string;
  model?: { provider: string; model: string };
};
