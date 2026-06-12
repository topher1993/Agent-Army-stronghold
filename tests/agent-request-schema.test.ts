import { describe, expect, it } from 'vitest';
import { validateAgentRequestInput } from '../server/schemas/agentRequest';

describe('Phase 3 agent request schema', () => {
  it('accepts safe planning requests and rejects secrets/unknown agents', () => {
    expect(validateAgentRequestInput({ kind: 'mission.plan', title: 'Plan Phase 4', prompt: 'Draft safe plan', requestedBy: 'Chris', targetAgent: 'igris' }).ok).toBe(true);
    expect(validateAgentRequestInput({ kind: 'shell.run', title: 'bad', prompt: 'rm -rf /', requestedBy: 'Chris', targetAgent: 'bash' }).ok).toBe(false);
    expect(validateAgentRequestInput({ kind: 'mission.plan', title: 'secret', prompt: 'token=abc123', requestedBy: 'Chris', targetAgent: 'igris' }).ok).toBe(false);
  });
});
