import type { Task, ValidationResult } from '../../shared/types';
import { KNOWN_SPECIALISTS, PRIORITIES, TASK_STATUSES } from '../../shared/constants';
import { containsSensitiveValue } from '../safety/redaction';
function slug(text: string) { return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'task'; }
function now() { return new Date().toISOString(); }
function errorsFor(input: Record<string, unknown>, partial = false): string[] {
  const errors: string[] = [];
  if (containsSensitiveValue(input)) errors.push('Sensitive content is not allowed');
  if (!partial || input.missionId !== undefined) { if (typeof input.missionId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,}$/.test(input.missionId)) errors.push('valid missionId is required'); }
  if (!partial || input.title !== undefined) { if (typeof input.title !== 'string' || input.title.trim().length < 3) errors.push('title must be at least 3 characters'); }
  if (input.status !== undefined && !TASK_STATUSES.includes(input.status as never)) errors.push('invalid task status');
  if (!partial || input.priority !== undefined) { if (!PRIORITIES.includes(input.priority as never)) errors.push('invalid priority'); }
  if (!partial || input.specialists !== undefined) {
    if (!Array.isArray(input.specialists)) errors.push('specialists must be an array');
    else for (const s of input.specialists) if (typeof s !== 'string' || (!KNOWN_SPECIALISTS.includes(s as never) && !s.startsWith('external:'))) errors.push(`unknown specialist: ${String(s)}`);
  }
  return errors;
}
export function validateTaskInput(input: unknown, partial = false): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['task input must be an object'] };
  const errors = errorsFor(input as Record<string, unknown>, partial);
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}
export function taskFromInput(input: Record<string, unknown>, actor: string): Task {
  const time = now();
  const title = String(input.title).trim();
  return {
    id: `${slug(title)}-${time.replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    missionId: String(input.missionId),
    title,
    description: input.description ? String(input.description) : undefined,
    status: (input.status as Task['status']) || 'todo',
    owner: input.owner ? String(input.owner) : undefined,
    specialists: input.specialists as string[],
    priority: input.priority as Task['priority'],
    createdAt: time,
    updatedAt: time,
    createdBy: actor,
    dueAt: input.dueAt ? String(input.dueAt) : undefined,
    blockedReason: input.blockedReason ? String(input.blockedReason) : undefined,
  };
}
