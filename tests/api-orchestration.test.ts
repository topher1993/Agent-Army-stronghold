import { describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';

describe('Phase 3 orchestration API', () => {
  it('exposes orchestration health and denies command endpoints', async () => {
    const server = createStrongholdServer();
    const health = await server.inject({ method: 'GET', url: '/api/orchestration/health' });
    expect(health.statusCode).toBe(200);
    const body = JSON.parse(health.body);
    expect(body.phase).toBe(3);
    expect(body.dispatchGate).toBe('approval-required');
    expect((await server.inject({ method: 'POST', url: '/api/execute', body: {} })).statusCode).toBe(404);
  });
});
