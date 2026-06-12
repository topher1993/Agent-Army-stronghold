import { describe, expect, it } from 'vitest';
import { artifactToChangeRequestPayload } from '../server/services/agentArtifactService';

describe('Phase 3 artifact bridge', () => {
  it('creates a Phase 2 change-request payload instead of applying artifacts directly', () => {
    const payload = artifactToChangeRequestPayload({ id: 'a1', requestId: 'r1', runId: 'run1', kind: 'plan', content: 'Add task: review safety', redactionApplied: true, createdAt: new Date().toISOString(), requiresHumanApply: true }, 'Chris');
    expect(payload.kind).toBe('task.create');
    expect(payload.status).toBe('pending_review');
    expect(JSON.stringify(payload)).toContain('Artifact a1');
  });
});
