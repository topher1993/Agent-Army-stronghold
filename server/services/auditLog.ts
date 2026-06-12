import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AuditEvent } from '../../shared/types';
import { POLICY_VERSION } from '../../shared/constants';
import { redactDeep } from '../safety/redaction';

export type AuditInput = Omit<AuditEvent, 'id' | 'timestamp' | 'policyVersion' | 'redactionApplied'> & Partial<Pick<AuditEvent, 'id' | 'timestamp' | 'policyVersion' | 'redactionApplied'>>;
export function makeAuditEvent(input: AuditInput): AuditEvent {
  return {
    id: input.id || crypto.randomUUID(),
    timestamp: input.timestamp || new Date().toISOString(),
    policyVersion: input.policyVersion || POLICY_VERSION,
    redactionApplied: true,
    ...input,
    metadata: redactDeep(input.metadata || {}) as Record<string, unknown>,
  };
}
export function appendAuditEvent(file: string, input: AuditInput): AuditEvent {
  const event = makeAuditEvent(input);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(event) + '\n', 'utf8');
  return event;
}
export function readAuditEvents(file: string): AuditEvent[] {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as AuditEvent);
}
