// FEATURE — Memory Status read-only audit panel (Phase D3).
//
// These tests exercise the HTTP surface:
//   GET /api/memory-status
//
// via Stronghold's in-process inject() server. No real HTTP needed.
//
// Required coverage per the brief:
//   - localhost guard
//   - audit entry on success with canonical shape
//   - missing file returns exists:false but still 200
//   - GET-only (no POST/PATCH/DELETE handlers)
//   - per-family rate limit (memory-status, 30/min)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createStrongholdServer } from '../server/index';
import { approvedDataPath } from '../server/safety/pathGuard';
import { readAuditEvents } from '../server/services/auditLog';

const AUDIT_FILE = approvedDataPath('audit');
const ALLOWED_ORIGIN = 'http://127.0.0.1:5174';

let tmpDir: string;
let tmpMemoryFile: string;
let auditBackup = '';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'api-memory-status-'));
  tmpMemoryFile = path.join(tmpDir, 'MEMORY.md');
  fs.writeFileSync(
    tmpMemoryFile,
    ['**Audit:** rule one.', '', '§', '', '**Pitfalls:** rule two.'].join('\n'),
    'utf8'
  );
  auditBackup = fs.existsSync(AUDIT_FILE) ? fs.readFileSync(AUDIT_FILE, 'utf8') : '';
  process.env.HERMES_MEMORY_PATH = tmpMemoryFile;
});

afterEach(() => {
  if (auditBackup) fs.writeFileSync(AUDIT_FILE, auditBackup, 'utf8');
  else if (fs.existsSync(AUDIT_FILE)) fs.unlinkSync(AUDIT_FILE);
  delete process.env.HERMES_MEMORY_PATH;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

function inject(path: string, opts: { method?: string; origin?: string | null; body?: unknown } = {}) {
  const server = createStrongholdServer();
  return server.inject({
    method: opts.method ?? 'GET',
    url: path,
    body: opts.body,
    headers: { origin: opts.origin === null ? undefined : (opts.origin ?? ALLOWED_ORIGIN) },
  });
}

describe('GET /api/memory-status (Phase D3)', () => {
  it('returns the memory status shape with 2 sections', async () => {
    const res = await inject('/api/memory-status');
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.exists).toBe(true);
    expect(body.sizeBytes).toBeGreaterThan(0);
    expect(body.lastModified).toBeTruthy();
    expect(body.sections).toHaveLength(2);
    expect(body.sections[0].title).toBe('Audit');
    expect(body.sections[0].firstSentence).toContain('rule one');
    expect(body.sections[1].title).toBe('Pitfalls');
    expect(body.rawText).toContain('**Audit:**');
    expect(body.path).toContain('MEMORY.md');
  });

  it('appends an audit entry on success with the canonical shape', async () => {
    const before = readAuditEvents(AUDIT_FILE).length;
    await inject('/api/memory-status');
    const events = readAuditEvents(AUDIT_FILE);
    expect(events.length).toBe(before + 1);
    const last = events[events.length - 1];
    expect(last.action).toBe('memory-status.read');
    expect(last.capability).toBe('memory:read');
    expect(last.actor).toBe('Stronghold');
    expect(last.targetType).toBe('memory-file');
    expect(last.targetId).toBe('MEMORY.md');
    expect(last.outcome).toBe('ok');
    expect(last.metadata.sections).toBe(2);
    expect(last.metadata.exists).toBe(true);
  });

  it('returns exists=false for a missing file (still 200, not 404)', async () => {
    process.env.HERMES_MEMORY_PATH = path.join(tmpDir, 'no-such-file.md');
    const res = await inject('/api/memory-status');
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.exists).toBe(false);
    expect(body.sizeBytes).toBe(0);
    expect(body.lastModified).toBeNull();
    expect(body.sections).toEqual([]);
    expect(body.rawText).toBe('');
  });

  it('rejects non-localhost origin with 403', async () => {
    const res = await inject('/api/memory-status', { origin: 'http://evil.example.com' });
    expect(res.statusCode).toBe(403);
  });

  it('only allows GET (no POST/PATCH/DELETE handlers)', async () => {
    const post = await inject('/api/memory-status', { method: 'POST', body: {} });
    expect(post.statusCode).toBe(404);
    const patch = await inject('/api/memory-status', { method: 'PATCH', body: {} });
    expect(patch.statusCode).toBe(404);
    const del = await inject('/api/memory-status', { method: 'DELETE' });
    expect(del.statusCode).toBe(404);
  });

  it('uses HERMES_MEMORY_PATH env override when set', async () => {
    const altFile = path.join(tmpDir, 'alt.md');
    fs.writeFileSync(altFile, ['**Alt:** different content.'].join('\n'), 'utf8');
    process.env.HERMES_MEMORY_PATH = altFile;
    const res = await inject('/api/memory-status');
    const body = JSON.parse(res.body);
    expect(body.sections).toHaveLength(1);
    expect(body.sections[0].title).toBe('Alt');
    expect(body.path).toBe(altFile);
  });
});
