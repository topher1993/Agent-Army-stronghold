// FEATURE — Phase D4 Activity Graph service.
//
// buildActivityGraph() reads the audit log and groups entries by hand-off
// rule (see src/data/divisions.ts). The function is strictly read-only:
// it never writes to the audit log, the data/ tree, or any other file.
//
// Output shape:
//   {
//     generatedAt: ISO,
//     divisions: Array<{ id, label, color }>,
//     edges:      Array<{ from, to, count, lastTimestamp, lastCapability, recent }>,
//     totalEntries: number,
//     windowHours:  number
//   }
//
// Performance:
//   - We cap input to the last 200 lines (newest first) to keep the cost
//     bounded. 200 entries is enough to cover several hours of Stronghold
//     activity at typical operator pace (and a full day during a busy phase).
//   - For each entry, we run `matchHandoffRules(actor, capability)`. The
//     table has ~20 rules; total work is O(N × R) where N ≤ 200.
//
// Determinism:
//   - edges[] is sorted by (from, to) lexicographically so two identical
//     runs produce identical JSON. This makes the API response trivially
//     diffable and keeps test snapshots stable.
//   - recency is computed against the `now` injection so tests are
//     deterministic. Production passes `new Date()`.

import fs from 'node:fs';
import { DIVISIONS, matchHandoffRules } from '../../src/data/divisions';

export type ActivityGraphDivision = {
  id: string;
  label: string;
  color: string;
};

export type ActivityGraphEdge = {
  from: string;
  to: string;
  count: number;
  lastTimestamp: string;
  lastCapability: string;
  /** True when lastTimestamp is within 1 hour of `now`. */
  recent: boolean;
};

export type ActivityGraph = {
  generatedAt: string;
  divisions: ActivityGraphDivision[];
  edges: ActivityGraphEdge[];
  totalEntries: number;
  windowHours: number;
};

export type BuildActivityGraphOptions = {
  windowHours: number;
  /** Injected for deterministic tests; defaults to `new Date()`. */
  now?: Date;
  /** Maximum number of audit entries to inspect (default 200). */
  maxEntries?: number;
};

const DEFAULT_MAX_ENTRIES = 200;
const RECENT_WINDOW_MS = 60 * 60_000;

type RawAuditLine = {
  id?: string;
  timestamp?: string;
  actor?: string;
  capability?: string;
  action?: string;
  targetType?: string;
};

export function buildActivityGraph(
  auditLogPath: string,
  options: BuildActivityGraphOptions,
): ActivityGraph {
  const windowHours = clampWindowHours(options.windowHours);
  const now = options.now ?? new Date();
  const maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  const cutoffMs = now.getTime() - windowHours * 60 * 60_000;
  const recentCutoffMs = now.getTime() - RECENT_WINDOW_MS;

  const lines = readTail(auditLogPath, maxEntries);
  // totalEntries is the count of parsed entries inside the tail we
  // actually inspected, regardless of whether they fell inside the
  // window. This makes it useful as a denominator: "X entries inspected,
  // Y edges fired". Unparseable lines are excluded.
  const totalEntries = lines.length;
  // Track in-window entries separately so the UI can show "X entries in
  // the selected window" without a second pass.
  let inWindow = 0;

  // Edge accumulator: key "from->to"
  const edgeMap = new Map<string, ActivityGraphEdge>();

  for (const entry of lines) {
    const ts = parseTimestamp(entry.timestamp);
    if (ts === null) continue; // unparseable -> skip
    if (ts < cutoffMs) continue; // outside window -> skip
    inWindow += 1;

    const actor = entry.actor;
    const capability = entry.capability;
    if (!actor || !capability) continue;
    const rules = matchHandoffRules(actor, capability);
    if (rules.length === 0) continue;

    const isoTs = new Date(ts).toISOString();
    for (const rule of rules) {
      const key = `${rule.from}->${rule.to}`;
      const existing = edgeMap.get(key);
      if (!existing) {
        edgeMap.set(key, {
          from: rule.from,
          to: rule.to,
          count: 1,
          lastTimestamp: isoTs,
          lastCapability: capability,
          recent: ts >= recentCutoffMs,
        });
      } else {
        existing.count += 1;
        // Always update `lastTimestamp`, `lastCapability`, and `recent`
        // if THIS entry's timestamp is more recent than the stored one.
        // We can't rely on processing order to imply newest-first, so we
        // compare timestamps explicitly. (Older entries for the same edge
        // are correctly ignored.)
        const existingMs = new Date(existing.lastTimestamp).getTime();
        if (ts > existingMs) {
          existing.lastTimestamp = isoTs;
          existing.lastCapability = capability;
          existing.recent = ts >= recentCutoffMs;
        }
      }
    }
  }

  const edges = Array.from(edgeMap.values()).sort((a, b) => {
    if (a.from < b.from) return -1;
    if (a.from > b.from) return 1;
    if (a.to < b.to) return -1;
    if (a.to > b.to) return 1;
    return 0;
  });

  const divisions: ActivityGraphDivision[] = DIVISIONS.map(d => ({
    id: d.id,
    label: d.label,
    color: d.color,
  }));

  return {
    generatedAt: now.toISOString(),
    divisions,
    edges,
    totalEntries,
    windowHours,
  };
}

/**
 * Read the last `maxEntries` JSONL lines from `path`. Returns parsed objects
 * (best-effort; malformed lines are silently dropped). Returns [] for
 * missing files or empty files.
 *
 * We read the whole file (it's small) and slice from the end rather than
 * doing a streaming tail — keeps the implementation simple and the test
 * surface tiny.
 */
function readTail(path: string, maxEntries: number): RawAuditLine[] {
  let text: string;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  if (!text) return [];
  const allLines = text.split(/\r?\n/).filter(Boolean);
  const slice = allLines.slice(Math.max(0, allLines.length - maxEntries));
  // Reverse so the newest entry is processed first; this lets the FIRST
  // write of an edge pin `recent` to the most-recent timestamp without
  // needing a second pass.
  slice.reverse();
  const out: RawAuditLine[] = [];
  for (const line of slice) {
    try {
      out.push(JSON.parse(line) as RawAuditLine);
    } catch {
      // Skip malformed lines — the audit log is best-effort input.
    }
  }
  return out;
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
}

function clampWindowHours(value: number): number {
  if (!Number.isFinite(value)) return 24;
  const n = Math.floor(value);
  if (n < 1) return 1;
  if (n > 168) return 168;
  return n;
}