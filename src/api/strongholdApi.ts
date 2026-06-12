import type { ChangeRequest, AuditEvent } from '../../shared/types';
import type { AgentArtifact, AgentRequest, AgentRun } from '../../shared/agentTypes';

const API_BASE = 'http://127.0.0.1:5175/api';

async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    headers: { 'content-type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
  return response.json() as Promise<T>;
}

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
  listAudit: () => apiJson<AuditEvent[]>('/audit'),
  listAgentRequests: () => apiJson<AgentRequest[]>('/agent-requests'),
  createAgentRequest: (body: unknown) => apiJson<AgentRequest>('/agent-requests', { method: 'POST', body: JSON.stringify(body) }),
  decideAgentRequest: (id: string, action: 'approve' | 'reject' | 'enqueue' | 'dispatch-mock' | 'cancel') => apiJson<unknown>(`/agent-requests/${id}/${action}`, { method: 'POST', body: JSON.stringify({ actor: 'Igris' }) }),
  listAgentRuns: () => apiJson<AgentRun[]>('/agent-runs'),
  listAgentArtifacts: () => apiJson<AgentArtifact[]>('/agent-artifacts'),
  promoteArtifact: (id: string) => apiJson<ChangeRequest>(`/agent-artifacts/${id}/create-change-request`, { method: 'POST', body: JSON.stringify({ actor: 'Chris' }) }),
};
