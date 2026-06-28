// FEATURE — Phase D4 Activity Graph service (unit tests).
//
// buildActivityGraph() reads the audit log and groups entries by hand-off
// rule. These tests exercise:
//   - empty log -> all divisions, no edges
//   - 1 entry -> exactly one edge with count=1
//   - 10 mixed entries -> correct (from,to) grouping + counts + recency
//   - entries with unknown capabilities -> do NOT fire any edge
//   - window clamping: only entries within windowHours from now are counted
//
// The audit log shape is the JSONL written by server/services/auditLog.ts.
// Each line is a serialized AuditEvent.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildActivityGraph } from '../server/services/activityGraph';
import { appendAuditEvent } from '../server/services/auditLog';

let tmpDir = '';
const auditFile = (): string => path.join(tmpDir, 'audit-log.jsonl');

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-graph-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeLines(lines: object[]): void {
  fs.writeFileSync(auditFile(), lines.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');
}

function isoOffset(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60_000).toISOString();
}

describe('buildActivityGraph', () => {
  it('returns all divisions and zero edges for an empty log', () => {
    // Empty file -> empty audit
    fs.writeFileSync(auditFile(), '', 'utf8');
    const g = buildActivityGraph(auditFile(), { windowHours: 24, now: new Date() });
    expect(g.totalEntries).toBe(0);
    expect(g.windowHours).toBe(24);
    expect(g.edges).toEqual([]);
    // All 16 divisions must be present (we don't care about order, only ids)
    const ids = g.divisions.map(d => d.id).sort();
    expect(ids).toEqual([
      'Atlas', 'Belion', 'Beru', 'Cipher', 'Clix', 'Forge', 'GREED',
      'Igris', 'Kaisel', 'Nexus', 'Nova', 'Pulse', 'Sensei', 'Sentinel',
      'Tusk', 'Vector',
    ]);
  });

  it('handles a missing file gracefully (zero entries, all divisions)', () => {
    const g = buildActivityGraph(path.join(tmpDir, 'nope.jsonl'), { windowHours: 24, now: new Date() });
    expect(g.totalEntries).toBe(0);
    expect(g.divisions.length).toBe(16);
    expect(g.edges).toEqual([]);
  });

  it('fires exactly one edge for a single Igris->Forge entry', () => {
    writeLines([
      { id: 'a', timestamp: isoOffset(5), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
    ]);
    const g = buildActivityGraph(auditFile(), { windowHours: 24, now: new Date() });
    expect(g.totalEntries).toBe(1);
    expect(g.edges).toHaveLength(1);
    const edge = g.edges[0];
    expect(edge.from).toBe('Igris');
    expect(edge.to).toBe('Forge');
    expect(edge.count).toBe(1);
    expect(edge.lastCapability).toBe('engineering:backend');
    // 5 minutes ago -> recent (within 1h)
    expect(edge.recent).toBe(true);
  });

  it('ignores entries with unknown capabilities', () => {
    writeLines([
      { id: '1', timestamp: isoOffset(1), actor: 'Igris', capability: 'mystery:capability', action: 'x', targetType: 'changeRequest', outcome: 'requested' },
      { id: '2', timestamp: isoOffset(2), actor: 'Forge', capability: 'banana:split', action: 'y', targetType: 'changeRequest', outcome: 'requested' },
      { id: '3', timestamp: isoOffset(3), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
    ]);
    const g = buildActivityGraph(auditFile(), { windowHours: 24, now: new Date() });
    // Only the third entry fires an edge
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].from).toBe('Igris');
    expect(g.edges[0].to).toBe('Forge');
    expect(g.edges[0].count).toBe(1);
  });

  it('groups 10 mixed entries correctly with counts and recency', () => {
    const now = new Date();
    const lines = [
      // 3x Igris -> Forge (engineering:backend)
      { id: '1', timestamp: isoOffset(2),  actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      { id: '2', timestamp: isoOffset(8),  actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      { id: '3', timestamp: isoOffset(15), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      // 2x Igris -> Clix (engineering:frontend)
      { id: '4', timestamp: isoOffset(3),  actor: 'Igris', capability: 'engineering:frontend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      { id: '5', timestamp: isoOffset(10), actor: 'Igris', capability: 'engineering:frontend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      // 1x Belion -> Igris (stronghold: governance)
      { id: '6', timestamp: isoOffset(4),  actor: 'Belion', capability: 'stronghold:dispatch',  action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      // 1x Tusk -> Igris (capability ends with :review)
      { id: '7', timestamp: isoOffset(20), actor: 'Tusk',   capability: 'qc:verdict:review',    action: 'review',  targetType: 'changeRequest', outcome: 'approved' },
      // 1x Beru -> Sensei (content:lesson)
      { id: '8', timestamp: isoOffset(45), actor: 'Beru',   capability: 'content:lesson',       action: 'create',  targetType: 'changeRequest', outcome: 'requested' },
      // 2x Forge -> Igris (capability = forge back-report; we use "engineering:backend-report")
      { id: '9',  timestamp: isoOffset(5),  actor: 'Forge',  capability: 'engineering:backend-report', action: 'report', targetType: 'changeRequest', outcome: 'approved' },
      { id: '10', timestamp: isoOffset(70), actor: 'Forge',  capability: 'engineering:backend-report', action: 'report', targetType: 'changeRequest', outcome: 'approved' },
    ];
    writeLines(lines);
    const g = buildActivityGraph(auditFile(), { windowHours: 24, now });
    expect(g.totalEntries).toBe(10);
    // We expect 6 distinct edges to fire:
    //   Igris->Forge (3), Igris->Clix (2), Belion->Igris (1),
    //   Tusk->Igris (1), Beru->Sensei (1), Forge->Igris (2) = 6
    expect(g.edges).toHaveLength(6);

    const byKey = new Map(g.edges.map(e => [`${e.from}->${e.to}`, e]));

    const igrisForge = byKey.get('Igris->Forge')!;
    expect(igrisForge.count).toBe(3);
    expect(igrisForge.lastCapability).toBe('engineering:backend');
    // lastTimestamp among ids 1,2,3 is the most-recent (smallest minutes-ago)
    expect(igrisForge.recent).toBe(true);

    const igrisClix = byKey.get('Igris->Clix')!;
    expect(igrisClix.count).toBe(2);
    expect(igrisClix.recent).toBe(true);

    const belionIgris = byKey.get('Belion->Igris')!;
    expect(belionIgris.count).toBe(1);
    expect(belionIgris.recent).toBe(true);

    const tuskIgris = byKey.get('Tusk->Igris')!;
    expect(tuskIgris.count).toBe(1);
    expect(tuskIgris.lastCapability).toBe('qc:verdict:review');
    expect(tuskIgris.recent).toBe(true);

    const beruSensei = byKey.get('Beru->Sensei')!;
    expect(beruSensei.count).toBe(1);
    expect(beruSensei.recent).toBe(true);

    const forgeIgris = byKey.get('Forge->Igris')!;
    expect(forgeIgris.count).toBe(2);
    // lastTimestamp is the most-recent of (5min, 70min) = 5min -> recent=true
    expect(forgeIgris.recent).toBe(true);
  });

  it('respects windowHours: older entries are excluded', () => {
    const now = new Date();
    writeLines([
      { id: 'old', timestamp: isoOffset(120), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
      { id: 'new', timestamp: isoOffset(2),   actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
    ]);
    // 1h window -> only the "new" entry
    const g1 = buildActivityGraph(auditFile(), { windowHours: 1, now });
    expect(g1.totalEntries).toBe(2);
    expect(g1.edges).toHaveLength(1);
    expect(g1.edges[0].count).toBe(1);

    // 24h window -> both entries
    const g24 = buildActivityGraph(auditFile(), { windowHours: 24, now });
    expect(g24.edges).toHaveLength(1);
    expect(g24.edges[0].count).toBe(2);
    // most-recent is "new" (2 min ago) -> recent=true
    expect(g24.edges[0].recent).toBe(true);
  });

  it('marks recent=false when lastTimestamp is older than 1 hour', () => {
    const now = new Date();
    writeLines([
      { id: '1', timestamp: isoOffset(90), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
    ]);
    const g = buildActivityGraph(auditFile(), { windowHours: 24, now });
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].count).toBe(1);
    expect(g.edges[0].recent).toBe(false);
  });

  it('skips malformed JSONL lines without throwing', () => {
    const file = auditFile();
    const good = JSON.stringify({ id: '1', timestamp: isoOffset(2), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' });
    fs.writeFileSync(file, `${good}\n{ this is not json }\n${good}\n`, 'utf8');
    const g = buildActivityGraph(file, { windowHours: 24, now: new Date() });
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].count).toBe(2);
  });

  it('does not mutate the audit log file', () => {
    const file = auditFile();
    writeLines([
      { id: '1', timestamp: isoOffset(2), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' },
    ]);
    const before = fs.statSync(file).size;
    buildActivityGraph(file, { windowHours: 24, now: new Date() });
    const after = fs.statSync(file).size;
    expect(after).toBe(before);
  });

  it('reads at most the last 200 lines', () => {
    // 250 lines, 249 of which are unrelated noise; 1 real edge near the tail.
    const lines: object[] = [];
    for (let i = 0; i < 249; i++) {
      lines.push({ id: `n-${i}`, timestamp: isoOffset(180), actor: 'Unknown', capability: 'noise', action: 'noop', targetType: 'changeRequest', outcome: 'requested' });
    }
    lines.push({ id: 'real', timestamp: isoOffset(2), actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' });
    writeLines(lines);
    const g = buildActivityGraph(auditFile(), { windowHours: 24, now: new Date() });
    // We cap at last 200, so 200 of the 250 lines are considered.
    // The real entry is the most recent and is included.
    expect(g.totalEntries).toBe(200);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].from).toBe('Igris');
    expect(g.edges[0].to).toBe('Forge');
  });

  it('appending via appendAuditEvent does not interfere (service is read-only)', () => {
    const file = auditFile();
    appendAuditEvent(file, { actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' });
    appendAuditEvent(file, { actor: 'Igris', capability: 'engineering:backend', action: 'dispatch', targetType: 'changeRequest', outcome: 'requested' });
    const g = buildActivityGraph(file, { windowHours: 24, now: new Date() });
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].count).toBe(2);
  });

  it('readTail only reads the last N bytes of the file (seek-from-end, not full-file load)', () => {
    // Phase D4 P2 QC: the brief required a bounded tail using
    // seek-and-read-from-end so the service stays memory-safe as the
    // audit log grows. The previous implementation used
    // fs.readFileSync(whole-file) + slice, which loads the whole file
    // into memory first. This test pins the contract: the implementation
    // must open the file, stat it, and read from a seek offset measured
    // from the END of the file (not from offset 0).
    //
    // We construct a synthetic log that is much larger than the
    // intended tail budget so a naive readFileSync implementation would
    // touch every byte, while a seek-from-end implementation only reads
    // the trailing 256 KB window.
    const TAIL_BUDGET = 256 * 1024; // mirrors TAIL_BYTES in the service
    const PAD_LINE = JSON.stringify({
      id: 'pad',
      timestamp: '2025-01-01T00:00:00.000Z',
      actor: 'Pad',
      capability: 'pad:noop',
      action: 'pad',
      targetType: 'changeRequest',
      outcome: 'requested',
      // A payload that pushes each pad line well past 200 bytes so
      // thousands of them blow past the 256 KB tail budget by a wide margin.
      comment: 'x'.repeat(400),
    });

    const padLines: string[] = [];
    let padBytes = 0;
    while (padBytes < TAIL_BUDGET * 4) {
      padLines.push(PAD_LINE);
      padBytes += PAD_LINE.length + 1;
    }

    const tailEntries = [];
    for (let i = 0; i < 200; i++) {
      tailEntries.push({
        id: `t-${i}`,
        timestamp: isoOffset(2),
        actor: 'Igris',
        capability: 'engineering:backend',
        action: 'dispatch',
        targetType: 'changeRequest',
        outcome: 'requested',
      });
    }

    const allLines = [...padLines, ...tailEntries];
    const file = auditFile();
    fs.writeFileSync(file, allLines.map(l => JSON.stringify(l)).join('\n') + '\n', 'utf8');
    const fileSize = fs.statSync(file).size;
    // Sanity: this file must be bigger than the tail budget so a
    // seek-from-end implementation measurably differs from a full-file
    // read.
    expect(fileSize).toBeGreaterThan(TAIL_BUDGET);

    // Spy on fs.openSync and fs.readSync. A seek-from-end implementation
    // will (a) stat the file, (b) open it, (c) read with a non-zero
    // `position` argument equal to (fileSize - tailBytes). A naive
    // readFileSync implementation will never call fs.openSync /
    // fs.readSync at all — so just observing the call is itself the
    // proof of the seek path. The position argument pins the from-end
    // direction.
    const openSpy = vi.spyOn(fs, 'openSync');
    const readSpy = vi.spyOn(fs, 'readSync');

    try {
      const g = buildActivityGraph(file, { windowHours: 24, now: new Date() });
      // Functional check: the 200 tail entries fire exactly one edge.
      expect(g.totalEntries).toBe(200);
      expect(g.edges).toHaveLength(1);
      expect(g.edges[0].from).toBe('Igris');
      expect(g.edges[0].to).toBe('Forge');

      // Structural check: openSync was called (proof we use the open
      // path, not readFileSync).
      expect(openSpy).toHaveBeenCalled();
      const openCalls = openSpy.mock.calls.filter(
        ([p]) => typeof p === 'string' && p === file,
      );
      expect(openCalls.length).toBeGreaterThan(0);

      // Structural check: readSync was called at least once with a
      // `position` argument that points near the END of the file, not
      // offset 0. Signature: (fd, buffer, offset, length, position).
      expect(readSpy).toHaveBeenCalled();
      const readCalls = readSpy.mock.calls;
      const fromEndCall = readCalls.find((args) => {
        const position = args[4];
        // position must be a number strictly greater than 0 and within
        // (fileSize - TAIL_BUDGET) .. fileSize — i.e. a backward seek.
        return (
          typeof position === 'number' &&
          position > 0 &&
          position >= fileSize - TAIL_BUDGET - 1 &&
          position <= fileSize
        );
      });
      expect(fromEndCall, 'readSync must be called with a seek position from the end of the file').toBeDefined();
    } finally {
      openSpy.mockRestore();
      readSpy.mockRestore();
    }
  });
});