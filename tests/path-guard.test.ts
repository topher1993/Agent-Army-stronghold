import { describe, expect, it } from 'vitest';
import { approvedDataPath, assertApprovedWritePath } from '../server/safety/pathGuard';

describe('Phase 2 path guard', () => {
  it('allows exact approved Stronghold data files', () => {
    expect(assertApprovedWritePath('data/missions.json')).toContain('data');
    expect(assertApprovedWritePath('data/tasks.json')).toContain('tasks.json');
    expect(assertApprovedWritePath('data/change-requests.json')).toContain('change-requests.json');
    expect(assertApprovedWritePath('data/audit-log.jsonl')).toContain('audit-log.jsonl');
  });

  it('denies path traversal, alternate targets, and sensitive paths', () => {
    expect(() => assertApprovedWritePath('../secrets.env')).toThrow(/not approved|sensitive|escape/i);
    expect(() => assertApprovedWritePath('data/../package.json')).toThrow(/not approved|escape/i);
    expect(() => assertApprovedWritePath('data/token.json')).toThrow(/sensitive|not approved/i);
    expect(() => assertApprovedWritePath('C:/Users/tophe/AppData/Local/hermes/cron/jobs.json')).toThrow(/not approved|escape/i);
  });

  it('resolves approved paths inside the project root', () => {
    const p = approvedDataPath('missions');
    expect(p.replaceAll('\\', '/').endsWith('data/missions.json')).toBe(true);
  });
});
