import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAgentRequest, approveAgentRequest, enqueueAgentRequest } from '../server/services/agentRequestService';
import { dispatchMockAgentRequest } from '../server/services/mockAgentDispatcher';

describe('Phase 3 mock dispatcher', () => {
  it('dispatches only approved queued requests and creates redacted artifacts', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-agent-'));
    const files = { requests: path.join(dir, 'agent-requests.json'), runs: path.join(dir, 'agent-runs.json'), artifacts: path.join(dir, 'agent-artifacts.json'), runLog: path.join(dir, 'agent-runs.jsonl'), audit: path.join(dir, 'audit-log.jsonl') };
    for (const file of [files.requests, files.runs, files.artifacts]) fs.writeFileSync(file, '[]');
    fs.writeFileSync(files.runLog, ''); fs.writeFileSync(files.audit, '');
    const request = createAgentRequest(files.requests, { kind: 'mission.plan', title: 'Plan', prompt: 'Summarize next step', requestedBy: 'Chris', targetAgent: 'igris' });
    expect(() => dispatchMockAgentRequest(files, request.id)).toThrow(/approved|queued/i);
    const approved = approveAgentRequest(files.requests, request.id, 'Igris');
    const queued = enqueueAgentRequest(files.requests, approved.id);
    const result = dispatchMockAgentRequest(files, queued.id);
    expect(result.run.status).toBe('succeeded');
    expect(result.artifact.requiresHumanApply).toBe(true);
    const artifacts = JSON.parse(fs.readFileSync(files.artifacts, 'utf8'));
    expect(artifacts).toHaveLength(1);
  });
});
