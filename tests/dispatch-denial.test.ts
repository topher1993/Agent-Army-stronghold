import { describe, expect, it } from 'vitest';
import { assertAllowedAgentAction, assertAllowedAgentTarget } from '../server/safety/agentAllowlist';
import { assertNoShellPayload } from '../server/safety/executionPolicy';

describe('Phase 3 dispatch denial', () => {
  it('denies unknown wrappers, unsafe actions, and shell-like payloads', () => {
    expect(() => assertAllowedAgentTarget('igris')).not.toThrow();
    expect(() => assertAllowedAgentTarget('powershell')).toThrow(/not allowlisted/i);
    expect(() => assertAllowedAgentAction('agent:plan')).not.toThrow();
    expect(() => assertAllowedAgentAction('command:run')).toThrow(/not allowlisted/i);
    expect(() => assertNoShellPayload('please review architecture')).not.toThrow();
    expect(() => assertNoShellPayload('bash -lc "rm -rf /"')).toThrow(/shell|command/i);
  });
});
