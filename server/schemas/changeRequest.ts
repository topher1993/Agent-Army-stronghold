import type { ChangeRequestKind, ValidationResult } from '../../shared/types';
const kinds = ['mission.create', 'mission.update', 'task.create', 'task.update', 'assignment.update'];
export function validateChangeRequestKind(kind: unknown): ValidationResult {
  return typeof kind === 'string' && kinds.includes(kind as ChangeRequestKind) ? { ok: true, errors: [] } : { ok: false, errors: ['invalid change request kind'] };
}
