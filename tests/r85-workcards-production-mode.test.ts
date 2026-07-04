import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';

/**
 * R8.5 regression test (Tusk QC nit #1):
 * Production-mode hardening for /api/workcards.
 *
 * - X-Work-Card-Dir header must be ignored in production (NODE_ENV=production)
 * - CORS preflight must NOT advertise x-work-card-dir in production
 *
 * Tusk manually verified this at R8 final QC. This test pins the behavior
 * so future refactors don't silently regress production safety.
 */

describe('/api/workcards production-mode hardening (R8.5)', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  describe('X-Work-Card-Dir header ignored in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('returns 200 with default cards even when X-Work-Card-Dir points at a non-existent dir', async () => {
      const server = createStrongholdServer();
      const res = await server.inject({
        method: 'GET',
        url: '/api/workcards',
        headers: {
          'x-work-card-dir': 'C:/this/path/does/not/exist/anywhere',
        },
      });
      // production should ignore the override and serve from default dir;
      // default dir may or may not have cards but must not crash
      expect(res.statusCode).toBe(200);
      // body is WorkCard[]; production-mode override must NOT have been applied
      const body = JSON.parse(res.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('falls back to default work-card directory, not the override', async () => {
      const server = createStrongholdServer();
      const resWithoutOverride = await server.inject({
        method: 'GET',
        url: '/api/workcards',
      });
      const resWithOverride = await server.inject({
        method: 'GET',
        url: '/api/workcards',
        headers: { 'x-work-card-dir': 'C:/totally/different/nonexistent/dir' },
      });
      // both responses must come from the SAME default directory
      expect(JSON.stringify(resWithoutOverride.body)).toBe(JSON.stringify(resWithOverride.body));
    });
  });

  describe('CORS preflight does not advertise x-work-card-dir in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('production OPTIONS preflight does not list x-work-card-dir in allow-headers', async () => {
      const server = createStrongholdServer();
      const res = await server.inject({
        method: 'OPTIONS',
        url: '/api/workcards',
        headers: {
          origin: 'http://127.0.0.1:5174',
          'access-control-request-headers': 'x-work-card-dir',
        },
      });
      expect(res.statusCode).toBe(204);
      const allowHeaders = res.headers['access-control-allow-headers'] || '';
      // production must NOT advertise the override header
      expect(allowHeaders.toLowerCase()).not.toContain('x-work-card-dir');
      // production must still allow content-type
      expect(allowHeaders.toLowerCase()).toContain('content-type');
    });
  });

  describe('non-production behavior preserved (sanity check)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('non-prod OPTIONS preflight DOES advertise x-work-card-dir', async () => {
      const server = createStrongholdServer();
      const res = await server.inject({
        method: 'OPTIONS',
        url: '/api/workcards',
        headers: {
          origin: 'http://127.0.0.1:5174',
          'access-control-request-headers': 'x-work-card-dir',
        },
      });
      expect(res.statusCode).toBe(204);
      const allowHeaders = res.headers['access-control-allow-headers'] || '';
      // non-prod should advertise the override header for dev/test workflows
      expect(allowHeaders.toLowerCase()).toContain('x-work-card-dir');
    });
  });
});