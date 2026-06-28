// FEATURE 1 — Approvals (audit-log only) service
//
// Right-rail approval cards want a lightweight approve/reject path that
// resolves the card and appends an audit entry. The CR workflow in
// server/services/approvalWorkflow.ts is full-lifecycle (pending → approved
// → applied) and tied to data/change-requests.json — overkill for an
// audit-log-only card. This module owns the smaller shape used by the right
// rail.
//
// Persistence: data/approvals.json — one record per card, status=pending by
// default. The route writes back via atomicWriteJson (random tmp + rename),
// matching the pattern used elsewhere in the storage layer.
//
// Concurrency (P0 fix):
//   Two concurrent callers used to be able to both read status='pending',
//   both compute an updated record, and both atomicWriteJson — last rename
//   wins, and BOTH callers returned {ok:true}. The route would then append
//   TWO audit entries for the same id (one per caller) because it trusted
//   the service's return value. We now serialize mutations through an
//   in-process promise chain keyed by absolute path. After each write we
//   re-read the file once and assert the on-disk status matches what we
//   wrote. A second concurrent caller will, after the chain resolves,
//   observe status != 'pending' and short-circuit with {ok:false, 409,
//   current}. This is single-flight per file; the server is single-process
//   so no cross-process lock is needed.
//
// Validation lives in the route (id charset, reason length). Service-level
// invariants are pure: every exported function is deterministic given its
// inputs (modulo the chain tail, which is the contract we want).

import path from 'node:path';
import { readJsonArray, atomicWriteJson } from './storage';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ApprovalRecord = {
  id: string;
  title: string;
  status: ApprovalStatus;
  payload?: unknown;
  requestedBy?: string;
  createdAt: string;
  updatedAt: string;
  decidedBy?: string;
  decisionReason?: string;
  decidedAt?: string;
};

// In-process single-flight mutex keyed by absolute path. Each call chains
// onto the existing tail promise for that path. When the tail resolves the
// next caller re-reads the file, so a concurrent caller that lost the race
// sees the now-resolved status and 409s. This is the in-process variant of
// the brief's "atomic lock" — simpler than fs.openSync('.lock', 'wx') with
// retry and correct for the single-process Stronghold server.
//
// We store Promise<void> (not Promise<T>) because the chain is only used to
// serialize; the actual return value of each call is delivered to its own
// caller. Errors propagate to the caller that threw them.
const fileLocks: Map<string, Promise<void>> = new Map();

function withFileLock<T>(file: string, fn: () => Promise<T> | T): Promise<T> {
  const key = path.resolve(file);
  const prev = fileLocks.get(key) ?? Promise.resolve();
  const next = prev.then(() => fn(), () => fn());
  // Swallow rejections on the chain tail so one failing call does not
  // poison subsequent callers — the caller of fn() receives the original
  // error via its own promise anyway.
  const tail = next.then(() => undefined, () => undefined);
  fileLocks.set(key, tail);
  // Best-effort cleanup: once the tail settles, drop the entry if it is
  // still ours. This prevents the Map from growing unboundedly under long
  // uptimes if the same path is resolved many times.
  tail.finally(() => {
    if (fileLocks.get(key) === tail) fileLocks.delete(key);
  });
  return next;
}

export function listApprovals(file: string): ApprovalRecord[] {
  return readJsonArray<ApprovalRecord>(file);
}

export function findApproval(file: string, id: string): ApprovalRecord | undefined {
  return listApprovals(file).find(a => a.id === id);
}

/**
 * Resolve an approval with a per-file in-process mutex and a post-write
 * re-read verification. Returns one of:
 *  - { ok: true, record }    — mutation succeeded and is now persisted AND
 *                              the on-disk status matches what we wrote.
 *  - { ok: false, status: 404 } — id was unknown.
 *  - { ok: false, status: 409, current } — id was already resolved, either
 *                              observed before the write or detected by the
 *                              post-write re-read.
 *
 * The post-write re-read is the load-bearing piece: even if the in-process
 * mutex were ever bypassed (e.g. a future multi-process deployment), the
 * re-read catches any drift between our in-memory record and the file the
 * next caller will see. Inside a single process the mutex makes the re-read
 * trivially true; outside one it still narrows the window.
 */
export function resolveApproval(file: string, id: string, decision: 'approved' | 'rejected', actor: string, reason: string | undefined): Promise<{ ok: true; record: ApprovalRecord } | { ok: false; status: 404 } | { ok: false; status: 409; current: ApprovalRecord }> {
  return withFileLock(file, () => {
    const records = readJsonArray<ApprovalRecord>(file);
    const index = records.findIndex(r => r.id === id);
    if (index < 0) return { ok: false, status: 404 } as const;
    const current = records[index];
    if (current.status !== 'pending') return { ok: false, status: 409, current } as const;
    const now = new Date().toISOString();
    const updated: ApprovalRecord = {
      ...current,
      status: decision,
      decidedBy: actor,
      decisionReason: reason,
      decidedAt: now,
      updatedAt: now,
    };
    records[index] = updated;
    atomicWriteJson(file, records);
    // Post-write re-read verification. If the file on disk disagrees with
    // what we just wrote, treat the write as lost (e.g. another process
    // overwrote us) and return 409 with whatever is there now.
    const after = readJsonArray<ApprovalRecord>(file);
    const persisted = after.find(r => r.id === id);
    if (!persisted || persisted.status !== decision) {
      return { ok: false, status: 409, current: persisted ?? current } as const;
    }
    return { ok: true, record: persisted } as const;
  });
}
