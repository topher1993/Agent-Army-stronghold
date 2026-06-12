import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Phase 1 regression safety', () => {
  it('snapshot remains read-only and cron bodies remain redacted', () => {
    const snapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public/data/stronghold-snapshot.json'), 'utf8'));
    expect(snapshot.readOnly).toBe(true);
    const cronText = JSON.stringify(snapshot.cronJobs).toLowerCase();
    expect(cronText).not.toContain('script:');
    expect(cronText).not.toContain('prompt:');
  });
});
