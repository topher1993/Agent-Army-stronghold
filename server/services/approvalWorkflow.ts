import crypto from 'node:crypto';
import type { ChangeRequest, ChangeRequestKind } from '../../shared/types';
import { validateChangeRequestKind } from '../schemas/changeRequest';

export function createChangeRequest(input: { kind: ChangeRequestKind; title: string; rationale: string; requestedBy: string; payload: unknown; reviewers?: string[] }): ChangeRequest {
  const validationSummary = validateChangeRequestKind(input.kind);
  if (!validationSummary.ok) throw new Error(validationSummary.errors.join(', '));
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), kind: input.kind, status: 'pending_review', title: input.title, rationale: input.rationale, requestedBy: input.requestedBy, reviewers: input.reviewers || ['Igris'], payload: input.payload, validationSummary, createdAt: now, updatedAt: now };
}
export function approveChangeRequest(request: ChangeRequest, decidedBy: string, decisionReason: string): ChangeRequest {
  if (request.status !== 'pending_review') throw new Error('Only pending_review requests can be approved');
  return { ...request, status: 'approved', decidedBy, decisionReason, decidedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
export function rejectChangeRequest(request: ChangeRequest, decidedBy: string, decisionReason: string): ChangeRequest {
  if (request.status !== 'pending_review') throw new Error('Only pending_review requests can be rejected');
  return { ...request, status: 'rejected', decidedBy, decisionReason, decidedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
export function applyApprovedChangeRequest(request: ChangeRequest, actor: string): ChangeRequest {
  if (request.status !== 'approved') throw new Error('Change request must be approved before apply');
  return { ...request, status: 'applied', appliedBy: actor, appliedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}
