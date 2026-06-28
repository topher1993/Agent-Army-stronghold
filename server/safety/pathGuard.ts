import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPROVED_WRITE_TARGETS } from '../../shared/constants';
import { containsSensitiveValue } from './redaction';

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(here, '..', '..');
const approved = new Set<string>(APPROVED_WRITE_TARGETS);

function normalizeRel(target: string): string {
  return target.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function approvedDataPath(kind: 'missions' | 'tasks' | 'changeRequests' | 'audit' | 'agentRequests' | 'agentRuns' | 'agentArtifacts' | 'agentRunLog' | 'approvals'): string {
  const map = { missions: 'data/missions.json', tasks: 'data/tasks.json', changeRequests: 'data/change-requests.json', audit: 'data/audit-log.jsonl', agentRequests: 'data/agent-requests.json', agentRuns: 'data/agent-runs.json', agentArtifacts: 'data/agent-artifacts.json', agentRunLog: 'data/agent-runs.jsonl', approvals: 'data/approvals.json' } as const;
  return assertApprovedWritePath(map[kind]);
}

export function assertApprovedWritePath(target: string): string {
  if (containsSensitiveValue(target)) throw new Error(`Sensitive path denied: ${target}`);
  if (/^\\\\/.test(target) || /^[A-Za-z]:/.test(target)) {
    throw new Error(`Absolute or UNC paths are not approved: ${target}`);
  }
  const rel = normalizeRel(target);
  if (!approved.has(rel)) throw new Error(`Write target is not approved: ${target}`);
  const resolved = path.resolve(PROJECT_ROOT, rel);
  const projectWithSep = PROJECT_ROOT.endsWith(path.sep) ? PROJECT_ROOT : PROJECT_ROOT + path.sep;
  if (!(resolved === PROJECT_ROOT || resolved.startsWith(projectWithSep))) throw new Error(`Path escape denied: ${target}`);
  const parent = path.dirname(resolved);
  if (fs.existsSync(parent)) {
    const realParent = fs.realpathSync(parent);
    if (!realParent.startsWith(fs.realpathSync(PROJECT_ROOT))) throw new Error(`Symlink/junction escape denied: ${target}`);
  }
  return resolved;
}
