import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { cronPreview } from '../src/lib/cronPreview';
import type { StrongholdSnapshot } from '../src/types';

const snapshotPath = path.join(process.cwd(), 'public', 'data', 'stronghold-snapshot.json');

describe('Phase 2 snapshot contract', () => {
  it('exposes approved nullable subagentsStats shape', () => {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as StrongholdSnapshot;
    expect(snapshot.subagentsStats).toEqual({
      costToday: expect.toSatisfy((v: unknown) => v === null || typeof v === 'number'),
      tokensToday: expect.toSatisfy((v: unknown) => v === null || typeof v === 'number'),
      activeRuns: expect.any(Number),
      lastWrapperSyncAt: expect.toSatisfy((v: unknown) => v === null || typeof v === 'string'),
    });
    expect(Object.keys(snapshot.subagentsStats).sort()).toEqual(['activeRuns', 'costToday', 'lastWrapperSyncAt', 'tokensToday'].sort());
  });
});

describe('cronPreview', () => {
  const base = new Date('2026-01-01T00:00:00Z');

  it('supports wildcard five-field schedules', () => {
    expect(cronPreview('* * * * *', base, 3).map(d => d.toISOString())).toEqual([
      '2026-01-01T00:01:00.000Z',
      '2026-01-01T00:02:00.000Z',
      '2026-01-01T00:03:00.000Z',
    ]);
  });

  it('supports list, range, step, and question mark in five-field schedules', () => {
    expect(cronPreview('0,30 1-2/1 * * ?', base, 3).map(d => d.toISOString())).toEqual([
      '2026-01-01T01:00:00.000Z',
      '2026-01-01T01:30:00.000Z',
      '2026-01-01T02:00:00.000Z',
    ]);
  });

  it('supports six-field schedules with seconds', () => {
    expect(cronPreview('*/30 * * * * ?', base, 3).map(d => d.toISOString())).toEqual([
      '2026-01-01T00:00:30.000Z',
      '2026-01-01T00:01:00.000Z',
      '2026-01-01T00:01:30.000Z',
    ]);
  });
});
