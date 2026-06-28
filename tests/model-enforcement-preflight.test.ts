import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createAgentRequest, approveAgentRequest, enqueueAgentRequest } from '../server/services/agentRequestService';

function tempRequestsFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-preflight-'));
  const file = path.join(dir, 'agent-requests.json');
  fs.writeFileSync(file, '[]');
  return file;
}

describe('Agent Army v2 automatic model enforcement and Tusk preflight', () => {
  it('blocks Yellow requests from queueing when model verification source is missing', () => {
    const file = tempRequestsFile();
    const request = createAgentRequest(file, {
      kind: 'code.review',
      title: 'Review patch',
      prompt: 'Review this patch for safety',
      requestedBy: 'Chris',
      targetAgent: 'igris',
      riskLevel: 'Yellow',
      requiredModel: 'GPT Codex',
      actualModel: 'GPT Codex',
      modelProvider: 'openai-codex',
      modelVerificationStatus: 'VERIFIED',
      fallbackAllowed: false,
      fallbackUsed: false,
    });
    const approved = approveAgentRequest(file, request.id, 'Igris');
    expect(() => enqueueAgentRequest(file, approved.id)).toThrow(/verification source/i);
  });

  it('blocks wrong-model and unapproved fallback requests before dispatch queue', () => {
    const file = tempRequestsFile();
    const request = createAgentRequest(file, {
      kind: 'architecture.proposal',
      title: 'Production deployment approval',
      prompt: 'Approve production deployment for this app',
      requestedBy: 'Chris',
      targetAgent: 'igris',
      riskLevel: 'Red',
      requiredModel: 'GPT Codex',
      actualModel: 'gemma4',
      modelProvider: 'Local Ollama',
      verificationSource: 'local-helper output',
      modelVerificationStatus: 'VERIFIED',
      fallbackAllowed: false,
      fallbackUsed: true,
      fallbackReason: 'Codex unavailable',
    });
    const approved = approveAgentRequest(file, request.id, 'Igris');
    expect(() => enqueueAgentRequest(file, approved.id)).toThrow(/wrong model|fallback|red/i);
  });

  it('adds Tusk as required reviewer and queues valid Yellow coding requests', () => {
    const file = tempRequestsFile();
    const request = createAgentRequest(file, {
      kind: 'code.review',
      title: 'Review safe patch',
      prompt: 'Review this patch for regressions',
      requestedBy: 'Chris',
      targetAgent: 'pulse',
      riskLevel: 'Yellow',
      requiredModel: 'GPT Codex',
      actualModel: 'GPT Codex',
      modelProvider: 'openai-codex',
      verificationSource: 'provider metadata',
      modelVerificationStatus: 'VERIFIED',
      fallbackAllowed: false,
      fallbackUsed: false,
    });
    expect(request.reviewers).toContain('Tusk');
    const approved = approveAgentRequest(file, request.id, 'Tusk');
    const queued = enqueueAgentRequest(file, approved.id);
    expect(queued.status).toBe('queued');
    expect(queued.preflightVerdict).toBe('PASS');
  });
});
