// FEATURE — Discord #agent-army read-only consumer (Phase D1).
//
// The discordFeed service is the ONLY surface in Stronghold that talks to
// Discord. It is strictly READ-ONLY (GET /channels/{id}/messages) and never
// mutates Discord state. The dashboard consumes it through
// GET /api/discord/agent-army?limit=N, which wraps this function with the
// existing localhost origin guard + rate limiter + audit log.
//
// Injection pattern (matches cronService.ts):
//   - The default implementation calls the global `fetch`.
//   - Tests inject a fake via the `fetchImpl` option. The wrapper helper
//     `setDiscordFeedFetchForTests` lets tests rebind the global fetch for
//     routes that hit the service indirectly.
//
// Error model:
//   - 401 -> Error { code: 'UNAUTHORIZED' }
//   - 429 -> Error { code: 'RATE_LIMITED', retryAfter: <seconds> }
//   - any other non-2xx -> Error { code: 'DISCORD_FAILURE', status }
//   - timeout -> Error { code: 'TIMEOUT' }
//
// SECURITY:
//   - Bot token is read from env (DISCORD_BOT_TOKEN) and is NEVER logged.
//   - Channel id is read from env (DISCORD_HOME_CHANNEL) and is the only
//     channel this service can read. There is no caller-controlled channel
//     parameter (the dashboard route accepts `limit`, not `channel`).

export type DiscordFeedMessage = {
  id: string;
  timestamp: string;
  author: { id: string; username: string; displayName: string };
  content: string;
  isBot: boolean;
};

export type DiscordFeedError = Error & {
  code: 'UNAUTHORIZED' | 'RATE_LIMITED' | 'DISCORD_FAILURE' | 'TIMEOUT';
  status?: number;
  retryAfter?: number;
};

export type FetchRecentOptions = {
  fetchImpl?: typeof fetch;
  token?: string;
  channelId?: string;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DISCORD_API_BASE = 'https://discord.com/api/v10';

function tagError(message: string, code: DiscordFeedError['code'], extras: Partial<DiscordFeedError> = {}): DiscordFeedError {
  const err = new Error(message) as DiscordFeedError;
  err.code = code;
  if (extras.status !== undefined) err.status = extras.status;
  if (extras.retryAfter !== undefined) err.retryAfter = extras.retryAfter;
  return err;
}

/**
 * Map a raw Discord REST message into the normalized Stronghold shape.
 * Internal-only helper; exported for tests.
 *
 * Only the documented fields are kept:
 *   - id, timestamp, content
 *   - author.{id, username, displayName}
 *   - isBot (derived from author.bot)
 *
 * displayName resolution per the brief:
 *   - prefer global_name (modern Discord display name)
 *   - fall back to username (works for older accounts + bots without a
 *     global_name set)
 */
export function normalizeDiscordMessage(raw: unknown): DiscordFeedMessage {
  const m = raw as {
    id?: unknown;
    timestamp?: unknown;
    content?: unknown;
    author?: {
      id?: unknown;
      username?: unknown;
      global_name?: unknown;
      bot?: unknown;
    };
  };
  if (!m || typeof m !== 'object') {
    throw tagError('discord: message is not an object', 'DISCORD_FAILURE', { status: 502 });
  }
  const a = m.author ?? {};
  const authorId = typeof a.id === 'string' ? a.id : '';
  const username = typeof a.username === 'string' ? a.username : '';
  const globalName = typeof a.global_name === 'string' && a.global_name.length > 0 ? a.global_name : null;
  const displayName = globalName || username;
  return {
    id: typeof m.id === 'string' ? m.id : '',
    timestamp: typeof m.timestamp === 'string' ? m.timestamp : '',
    author: { id: authorId, username, displayName },
    content: typeof m.content === 'string' ? m.content : '',
    isBot: Boolean(a.bot),
  };
}

/**
 * Fetch the most recent N messages from the configured #agent-army channel.
 *
 * NOTE: `token` and `channelId` resolve from env if not passed; tests pass
 * them explicitly. Production callers (the Stronghold route) pass nothing
 * and let the env-derived defaults win.
 */
export async function fetchRecentAgentArmyMessages(
  limit: number = 20,
  options: FetchRecentOptions = {},
): Promise<DiscordFeedMessage[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.floor(Number.isFinite(limit) ? limit : 20)));
  const token = options.token ?? process.env.DISCORD_BOT_TOKEN;
  const channelId = options.channelId ?? process.env.DISCORD_HOME_CHANNEL;
  if (!token) throw tagError('discord: DISCORD_BOT_TOKEN not set', 'DISCORD_FAILURE', { status: 500 });
  if (!channelId) throw tagError('discord: DISCORD_HOME_CHANNEL not set', 'DISCORD_FAILURE', { status: 500 });

  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(`${DISCORD_API_BASE}/channels/${encodeURIComponent(channelId)}/messages?limit=${safeLimit}`, {
      method: 'GET',
      headers: { Authorization: `Bot ${token}` },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    // AbortController surfaces as a DOMException with name 'AbortError'.
    const name = (err as { name?: string })?.name;
    if (name === 'AbortError') {
      throw tagError(`discord: fetch timed out after ${timeoutMs}ms`, 'TIMEOUT');
    }
    throw tagError(`discord: fetch failed: ${(err as Error).message ?? String(err)}`, 'DISCORD_FAILURE', { status: 502 });
  }
  clearTimeout(timer);

  if (response.status === 401) {
    throw tagError('discord: bot token rejected (401)', 'UNAUTHORIZED', { status: 401 });
  }
  if (response.status === 429) {
    // Discord's rate-limit headers: `retry-after` is seconds (decimal string).
    const ra = response.headers.get('retry-after');
    const retryAfter = ra ? Number(ra) : NaN;
    throw tagError('discord: rate limited (429)', 'RATE_LIMITED', { status: 429, retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined });
  }
  if (!response.ok) {
    throw tagError(`discord: HTTP ${response.status}`, 'DISCORD_FAILURE', { status: response.status });
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (err) {
    throw tagError(`discord: response was not JSON: ${(err as Error).message}`, 'DISCORD_FAILURE', { status: 502 });
  }
  if (!Array.isArray(raw)) {
    throw tagError('discord: response was not an array', 'DISCORD_FAILURE', { status: 502 });
  }
  return raw.map(normalizeDiscordMessage);
}