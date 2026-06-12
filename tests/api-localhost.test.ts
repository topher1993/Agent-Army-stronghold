import { describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';

describe('Phase 2 localhost API', () => {
  it('serves health and rejects unknown command routes', async () => {
    const server = createStrongholdServer();
    const health = await server.inject({ method: 'GET', url: '/api/health' });
    expect(health.statusCode).toBe(200);
    expect(JSON.parse(health.body).host).toBe('127.0.0.1');
    const command = await server.inject({ method: 'POST', url: '/api/command', body: {} });
    expect(command.statusCode).toBe(404);
  });
});
