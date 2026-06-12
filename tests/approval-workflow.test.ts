import { describe, expect, it } from 'vitest';
import { createChangeRequest, approveChangeRequest, applyApprovedChangeRequest } from '../server/services/approvalWorkflow';

describe('Phase 2 approval workflow', () => {
  it('requires proposal before approval and approval before apply', () => {
    const request = createChangeRequest({ kind: 'mission.create', title: 'New mission', rationale: 'needed', requestedBy: 'Chris', payload: { title: 'New mission' } });
    expect(request.status).toBe('pending_review');
    expect(() => applyApprovedChangeRequest(request, 'Igris')).toThrow(/approved/i);
    const approved = approveChangeRequest(request, 'Igris', 'safe mission update');
    expect(approved.status).toBe('approved');
    const applied = applyApprovedChangeRequest(approved, 'Igris');
    expect(applied.status).toBe('applied');
  });
});
