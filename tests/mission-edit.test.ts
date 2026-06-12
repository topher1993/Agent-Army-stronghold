import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMissionFromProposal, updateMissionFromProposal } from '../server/services/missionService';

describe('Phase 2 mission edits', () => {
  it('creates and updates missions only through approved proposals', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-missions-'));
    const file = path.join(dir, 'missions.json');
    fs.writeFileSync(file, '[]');
    const created = createMissionFromProposal(file, { title: 'Phase 2', summary: 'Gated writes', owner: 'Igris', priority: 'high', specialists: ['Forge'] }, 'Chris');
    expect(created.id).toContain('phase-2');
    const updated = updateMissionFromProposal(file, created.id, { status: 'active' }, 'Igris');
    expect(updated.status).toBe('active');
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(saved).toHaveLength(1);
  });
});
