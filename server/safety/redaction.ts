const SENSITIVE_MARKERS = ['.env', 'secret', 'token', 'oauth', 'credential', 'credentials', 'cookie', 'key', 'api_key', 'password', 'auth', 'session', 'refresh', 'access', 'client_secret', 'bearer'];
const SECRET_VALUE_PATTERNS = [/\b(token|password|secret|api[_-]?key|client_secret)\s*[:=]\s*[^\s,;]+/i, /sk-[A-Za-z0-9_-]{8,}/, /AIza[0-9A-Za-z_-]{20,}/, /ghp_[0-9A-Za-z]{20,}/];

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_MARKERS.some(marker => lower.includes(marker));
}

export function containsSensitiveValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return SENSITIVE_MARKERS.some(marker => lower.includes(marker)) || SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value));
  }
  if (Array.isArray(value)) return value.some(containsSensitiveValue);
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).some(([key, nested]) => isSensitiveKey(key) || containsSensitiveValue(nested));
  }
  return false;
}

export function redactDeep<T>(value: T): T | string {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (containsSensitiveValue(value)) return '[REDACTED]';
    return value;
  }
  if (Array.isArray(value)) return value.map(item => redactDeep(item)) as T;
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = isSensitiveKey(key) ? '[REDACTED]' : redactDeep(nested);
    }
    return out as T;
  }
  return value;
}

export const SENSITIVE_MARKER_COUNT = SENSITIVE_MARKERS.length;
