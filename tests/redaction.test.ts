import { describe, expect, it } from 'vitest';
import { containsSensitiveValue, redactDeep } from '../server/safety/redaction';

describe('Phase 2 redaction', () => {
  it('redacts sensitive keys and nested values', () => {
    const redacted = redactDeep({ nested: { api_key: 'sk-test-1234567890', safe: 'ok' }, notes: ['password=hello', 'mission'] });
    const asText = JSON.stringify(redacted);
    expect(asText).toContain('[REDACTED]');
    expect(asText).not.toContain('sk-test');
    expect(asText).not.toContain('password=hello');
    expect(asText).toContain('mission');
  });

  it('detects sensitive input before persistence', () => {
    expect(containsSensitiveValue({ title: 'normal task' })).toBe(false);
    expect(containsSensitiveValue({ title: 'token=abc123' })).toBe(true);
    expect(containsSensitiveValue({ client_secret: 'abc123' })).toBe(true);
  });
});
