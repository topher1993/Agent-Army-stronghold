import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { StrongholdSnapshot } from '../src/types';

const snapshotPath = path.join(process.cwd(), 'public', 'data', 'stronghold-snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as StrongholdSnapshot;

describe('Stronghold snapshot', () => {
  it('is explicitly read-only and Igris-owned', () => {
    expect(snapshot.readOnly).toBe(true);
    expect(snapshot.owner).toBe('Igris');
    expect(snapshot.coordinator).toBe('Belion');
  });

  it('contains core dashboard modules data', () => {
    expect(snapshot.roster.length).toBeGreaterThanOrEqual(8);
    expect(snapshot.profiles.length).toBeGreaterThanOrEqual(1);
    expect(snapshot.missions.some(m => m.id === 'stronghold-phase-1')).toBe(true);
    expect(snapshot.safetyFindings.length).toBeGreaterThanOrEqual(3);
  });

  it('does not expose cron prompt or script bodies', () => {
    const asText = JSON.stringify(snapshot.cronJobs).toLowerCase();
    expect(asText).not.toContain('prompt');
    expect(asText).not.toContain('script:');
    expect(asText).toContain('metadata-only');
  });
});
