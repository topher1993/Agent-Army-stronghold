import { describe, expect, it } from 'vitest';
import { validateMissionInput } from '../server/schemas/mission';
import { validateTaskInput } from '../server/schemas/task';

describe('Phase 2 schemas', () => {
  it('accepts valid mission and task inputs', () => {
    expect(validateMissionInput({ title: 'Build console', summary: 'Safe mission update', owner: 'Igris', priority: 'high', specialists: ['Forge'] }).ok).toBe(true);
    expect(validateTaskInput({ missionId: 'stronghold-phase-1', title: 'Add audit log', owner: 'Forge', priority: 'medium', specialists: ['Forge'] }).ok).toBe(true);
  });

  it('rejects invalid enum values and unsafe text', () => {
    expect(validateMissionInput({ title: 'x', summary: 'y', owner: 'Igris', priority: 'urgent', specialists: [] }).ok).toBe(false);
    expect(validateTaskInput({ missionId: '../escape', title: 'token=abc123', priority: 'high', specialists: [] }).ok).toBe(false);
  });
});
