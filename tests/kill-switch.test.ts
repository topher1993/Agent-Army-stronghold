import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertDispatchEnabled, disableOrchestration, enableOrchestration, isOrchestrationDisabled } from '../server/safety/killSwitch';

describe('Phase 3 kill switch', () => {
  it('blocks dispatch when active', () => {
    const flag = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-kill-')), 'agent-execution-disabled.flag');
    expect(isOrchestrationDisabled(flag)).toBe(false);
    disableOrchestration(flag, 'test');
    expect(isOrchestrationDisabled(flag)).toBe(true);
    expect(() => assertDispatchEnabled(flag)).toThrow(/disabled/i);
    enableOrchestration(flag);
    expect(isOrchestrationDisabled(flag)).toBe(false);
  });
});
