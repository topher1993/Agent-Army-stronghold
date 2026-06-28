import { ENGINEERING_DIVISION_ROSTER } from './divisions';

export const MISSION_STATUSES = ['planned', 'active', 'blocked', 'review', 'complete', 'cancelled'] as const;
export const TASK_STATUSES = ['todo', 'active', 'blocked', 'review', 'done', 'cancelled'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const KNOWN_SPECIALISTS = ['Belion', ...ENGINEERING_DIVISION_ROSTER.filter(entry => entry.name !== 'Igris').map(entry => entry.name), 'Igris', 'Cipher', 'Nova', 'Titan'] as const;
export const POLICY_VERSION = 'stronghold-phase-2-policy-v1';
export const APPROVED_WRITE_TARGETS = [
  'data/missions.json',
  'data/tasks.json',
  'data/change-requests.json',
  'data/audit-log.jsonl',
  'public/data/stronghold-snapshot.json',
  'data/agent-requests.json',
  'data/agent-runs.json',
  'data/agent-artifacts.json',
  'data/agent-runs.jsonl',
  'data/approvals.json',
] as const;
