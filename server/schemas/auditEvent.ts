import type { AuditEvent, ValidationResult } from '../../shared/types';
export function validateAuditEvent(event: AuditEvent): ValidationResult {
  const errors: string[] = [];
  if (!event.id) errors.push('id required');
  if (!event.timestamp) errors.push('timestamp required');
  if (!event.actor) errors.push('actor required');
  if (!event.capability) errors.push('capability required');
  return errors.length ? { ok: false, errors } : { ok: true, errors: [] };
}
