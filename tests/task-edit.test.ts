import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTaskFromProposal, updateTaskFromProposal } from '../server/services/taskService';

describe('Phase 2 task edits', () => {
  it('creates and updates tasks with valid mission linkage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-tasks-'));
    const file = path.join(dir, 'tasks.json');
    fs.writeFileSync(file, '[]');
    const task = createTaskFromProposal(file, { missionId: 'stronghold-phase-2', title: 'Add path guard', owner: 'Forge', priority: 'high', specialists: ['Forge'] }, 'Chris');
    expect(task.status).toBe('todo');
    const updated = updateTaskFromProposal(file, task.id, { status: 'review' }, 'Pulse');
    expect(updated.status).toBe('review');
  });
});
