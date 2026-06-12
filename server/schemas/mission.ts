import type { Mission, ValidationResult } from '../../shared/types';
import { KNOWN_SPECIALISTS, MISSION_STATUSES, PRIORITIES } from '../../shared/constants';
import { containsSensitiveValue } from '../safety/redaction';

function slug(text: string) { return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'mission'; }
function now() { return new Date().toISOString(); }
function errorsFor(input: Record<string, unknown>, partial = false): string[] {
  const errors: string[] = [];
  if (containsSensitiveValue(input)) errors.push('Sensitive content is not allowed');
  if (!partial || input.title !== undefined) { if (typeof input.title !== 'string' || input.title.trim().length < 3) errors.push('title must be at least 3 characters'); }
  if (!partial || input.summary !== undefined) { if (typeof input.summary !== 'string' || input.summary.trim().length < 3) errors.push('summary must be at least 3 characters'); }
  if (!partial || input.owner !== undefined) { if (typeof input.owner !== 'string' || input.owner.trim().length < 2) errors.push('owner is required'); }
  if (input.status !== undefined && !MISSION_STATUSES.includes(input.status as never)) errors.push('invalid mission status');
  if (!partial || input.priority !== undefined) { if (!PRIORITIES.includes(input.priority as never)) errors.push('invalid priority'); }
  if (!partial || input.specialists !== undefined) {
    if (!Array.isArray(input.specialists)) errors.push('specialists must be an array');
    else for (const s of input.specialists) if (typeof s !== 'string' || (!KNOWN_SPECIALISTS.includes(s as never) && !s.startsWith('external:'))) errors.push(`unknown specialist: ${String(s)}`);
  }
  return errors;
}
export function validateMissionInput(input: unknown, partial = false): ValidationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { ok: false, errors: ['mission input must be an object'] };
  const errors = errorsFor(input as Record<string, unknown>, partial);
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}
export function missionFromInput(input: Record<string, unknown>, actor: string): Mission {
  const time = now();
  const title = String(input.title).trim();
  return {
    id: `${slug(title)}-${time.replace(/[-:.TZ]/g, '').slice(0, 14)}`,
    title,
    owner: String(input.owner).trim(),
    status: (input.status as Mission['status']) || 'planned',
    priority: input.priority as Mission['priority'],
    summary: String(input.summary).trim(),
    specialists: input.specialists as string[],
    createdAt: time,
    updatedAt: time,
    createdBy: actor,
    tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
  };
}
