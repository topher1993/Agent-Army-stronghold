import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../server/safety/rateLimiter';

describe('Phase 3 rate limiter', () => {
  it('limits dispatch attempts per actor', () => {
    const limiter = createRateLimiter({ maxPerWindow: 2, windowMs: 60000 });
    expect(limiter.check('Chris').allowed).toBe(true);
    expect(limiter.check('Chris').allowed).toBe(true);
    expect(limiter.check('Chris').allowed).toBe(false);
  });
});
