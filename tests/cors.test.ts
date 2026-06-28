import { describe, expect, it } from 'vitest';
import { createStrongholdServer } from '../server/index';

const ALLOWED_ORIGIN = 'http://127.0.0.1:5174';

describe('CORS localhost-only lockdown (P2 fix #1)', () => {
  it('echoes the explicit allow-listed origin on a regular GET (no wildcard)', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/health', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,OPTIONS');
    expect(res.headers['access-control-allow-headers']).toBe('content-type');
  });

  it('handles OPTIONS preflight from the allowed origin', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'OPTIONS', url: '/api/health', headers: { origin: ALLOWED_ORIGIN } });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-methods']).toBe('GET,POST,OPTIONS');
  });

  it('rejects preflight from a disallowed origin with 403 and no allow-origin header', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'OPTIONS', url: '/api/health', headers: { origin: 'http://evil.example.com' } });
    expect(res.statusCode).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    const body = JSON.parse(res.body);
    expect(body.error).toBe('origin not allowed');
    expect(body.allowedOrigin).toBeUndefined();
  });

  it('rejects a regular request from a disallowed origin with 403', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/health', headers: { origin: 'http://127.0.0.1:9999' } });
    expect(res.statusCode).toBe(403);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('does NOT reflect an arbitrary origin back (prevents CORS reflection attacks)', async () => {
    const server = createStrongholdServer();
    const evil = 'http://attacker.tld';
    const res = await server.inject({ method: 'GET', url: '/api/health', headers: { origin: evil } });
    expect(res.statusCode).toBe(403);
    // The reflected origin must NEVER appear in the response, regardless of header name case.
    expect(JSON.stringify(res.headers)).not.toContain(evil);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('falls back to a literal allow-listed origin when no Origin header is present (non-browser caller)', async () => {
    const server = createStrongholdServer();
    const res = await server.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('preserves response shape and status codes for the allowed origin', async () => {
    const server = createStrongholdServer();
    const health = await server.inject({ method: 'GET', url: '/api/health', headers: { origin: ALLOWED_ORIGIN } });
    expect(health.statusCode).toBe(200);
    const body = JSON.parse(health.body);
    expect(body.ok).toBe(true);
    expect(body.phase).toBe(2);
    expect(body.host).toBe('127.0.0.1');
    const notFound = await server.inject({ method: 'POST', url: '/api/command', headers: { origin: ALLOWED_ORIGIN } });
    expect(notFound.statusCode).toBe(404);
  });
});
