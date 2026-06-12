import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendAuditEvent, readAuditEvents } from '../server/services/auditLog';

describe('Phase 2 audit log', () => {
  it('appends redacted audit events as JSONL', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-audit-'));
    const file = path.join(dir, 'audit-log.jsonl');
    appendAuditEvent(file, { actor: 'Chris', capability: 'mission:update', action: 'propose', targetType: 'mission', outcome: 'requested', metadata: { token: 'abc123', safe: 'ok' } });
    const text = fs.readFileSync(file, 'utf8');
    expect(text).toContain('mission:update');
    expect(text).toContain('[REDACTED]');
    expect(text).not.toContain('abc123');
    expect(readAuditEvents(file)).toHaveLength(1);
  });
});
