// FEATURE — Discord #agent-army read-only consumer (Phase D1).
//
// The discordFeed service is the READ-ONLY consumer of Discord REST API
// channel history. The Stronghold dashboard uses it to surface the last
// few messages of the #agent-army channel so the operator can see what each
// division is doing without opening Discord.
//
// These tests inject a fake `fetch` so we can simulate 200 / 401 / 429 /
// timeout responses deterministically without touching Discord.
//
// Required coverage per the Phase D1 brief:
//   - parses a sample Discord API response into the normalized shape (no leaks
//     of raw API fields like `edited_timestamp`, `mentions`, `attachments`, etc.)
//   - throws 'UNAUTHORIZED' on 401
//   - throws 'RATE_LIMITED' with retry_after on 429
//   - times out after 5s

import { describe, expect, it, vi } from 'vitest';
import { fetchRecentAgentArmyMessages } from '../server/services/discordFeed';

const SAMPLE_PAYLOAD = [
  {
    id: '1234567890',
    timestamp: '2026-06-28T12:34:56.000+00:00',
    edited_timestamp: null,
    content: 'Igris: kicking off Phase D1 routing map',
    author: {
      id: '111',
      username: 'igris_bot',
      global_name: 'Igris',
      discriminator: '0',
      avatar: null,
      bot: false,
    },
    attachments: [],
    mentions: [],
    pinned: false,
    type: 0,
  },
  {
    id: '1234567891',
    timestamp: '2026-06-28T12:35:30.000+00:00',
    edited_timestamp: null,
    content: 'Auto-bot dispatch complete — 4 agents enqueued',
    author: {
      id: '222',
      username: 'auto_bot',
      global_name: null,
      discriminator: '0',
      avatar: null,
      bot: true,
    },
    attachments: [{ id: 'a1', filename: 'log.txt' }],
    mentions: [{ id: '999', username: 'someone' }],
    pinned: false,
    type: 0,
  },
];

function makeFakeFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return vi.fn(impl) as unknown as typeof fetch;
}

describe('discordFeed service (Phase D1)', () => {
  it('parses a sample Discord API response into the normalized shape with no raw-field leaks', async () => {
    const fakeFetch = makeFakeFetch(async () => new Response(JSON.stringify(SAMPLE_PAYLOAD), { status: 200, headers: { 'content-type': 'application/json' } }));
    const result = await fetchRecentAgentArmyMessages(20, { fetchImpl: fakeFetch, token: 'test-token', channelId: 'C1' });
    expect(result).toHaveLength(2);
    // Normalized keys — no raw Discord fields leak out.
    expect(result[0]).toEqual({
      id: '1234567890',
      timestamp: '2026-06-28T12:34:56.000+00:00',
      author: { id: '111', username: 'igris_bot', displayName: 'Igris' },
      content: 'Igris: kicking off Phase D1 routing map',
      isBot: false,
    });
    expect(result[1]).toEqual({
      id: '1234567891',
      timestamp: '2026-06-28T12:35:30.000+00:00',
      author: { id: '222', username: 'auto_bot', displayName: 'auto_bot' },
      content: 'Auto-bot dispatch complete — 4 agents enqueued',
      isBot: true,
    });
    // Confirm no raw field leakage across the full payload.
    const json = JSON.stringify(result);
    expect(json).not.toContain('edited_timestamp');
    expect(json).not.toContain('attachments');
    expect(json).not.toContain('mentions');
    expect(json).not.toContain('global_name');
    expect(json).not.toContain('discriminator');
    expect(json).not.toContain('avatar');
    expect(json).not.toContain('pinned');
    expect(json).not.toContain('"type"');
  });

  it('falls back to username when global_name is null', async () => {
    const payload = [{
      id: 'm1',
      timestamp: '2026-06-28T00:00:00.000+00:00',
      content: 'hi',
      author: { id: 'a', username: 'plain_user', global_name: null, bot: false },
    }];
    const fakeFetch = makeFakeFetch(async () => new Response(JSON.stringify(payload), { status: 200 }));
    const result = await fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 't', channelId: 'C' });
    expect(result[0].author.displayName).toBe('plain_user');
    expect(result[0].isBot).toBe(false);
  });

  it('throws a tagged error with code UNAUTHORIZED on 401', async () => {
    const fakeFetch = makeFakeFetch(async () => new Response('{"message":"401: Unauthorized", "code": 0}', { status: 401 }));
    await expect(fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 'bad', channelId: 'C' }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('throws a tagged error with code RATE_LIMITED and retryAfter on 429', async () => {
    const fakeFetch = makeFakeFetch(async () => new Response('rate limited', { status: 429, headers: { 'retry-after': '7' } }));
    try {
      await fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 't', channelId: 'C' });
      throw new Error('expected to throw');
    } catch (err) {
      const e = err as Error & { code?: string; retryAfter?: number };
      expect(e.code).toBe('RATE_LIMITED');
      expect(e.retryAfter).toBe(7);
    }
  });

  it('throws a tagged error with code DISCORD_FAILURE including status on other HTTP errors', async () => {
    const fakeFetch = makeFakeFetch(async () => new Response('boom', { status: 500 }));
    try {
      await fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 't', channelId: 'C' });
      throw new Error('expected to throw');
    } catch (err) {
      const e = err as Error & { code?: string; status?: number };
      expect(e.code).toBe('DISCORD_FAILURE');
      expect(e.status).toBe(500);
    }
  });

  it('throws a tagged TIMEOUT error after the configured timeout when the fetch never resolves', async () => {
    // Fake fetch that hangs until its AbortSignal fires — same shape as the
    // production AbortController wiring, just controllable.
    const fakeFetch = makeFakeFetch((_input, init) => new Promise<Response>((_, reject) => {
      const signal = (init as RequestInit | undefined)?.signal as AbortSignal | undefined;
      if (!signal) return reject(new Error('expected AbortSignal'));
      signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    }) as Promise<Response>);
    try {
      await fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 't', channelId: 'C', timeoutMs: 50 });
      throw new Error('expected to throw');
    } catch (err) {
      const e = err as Error & { code?: string };
      expect(e.code).toBe('TIMEOUT');
    }
  });

  it('uses a 5000ms timeout by default (verified via vi.useFakeTimers)', async () => {
    // Verify the DEFAULT_TIMEOUT_MS constant in the service is 5000ms by
    // driving setTimeout under fake timers. We register a fetch that
    // resolves only when its AbortSignal fires, then advance fake time past
    // 5s and assert the service rejected with TIMEOUT.
    vi.useFakeTimers();
    try {
      const fakeFetch = makeFakeFetch((_input, init) => new Promise<Response>((_, reject) => {
        const signal = (init as RequestInit | undefined)?.signal as AbortSignal | undefined;
        if (!signal) return reject(new Error('expected AbortSignal'));
        signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      }) as Promise<Response>);
      const pending = fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 't', channelId: 'C' });
      // Attach a noop catch so the unhandled-rejection guard does not fire.
      pending.catch(() => { /* expected */ });
      // Push past the 5s default.
      await vi.advanceTimersByTimeAsync(5_100);
      await expect(pending).rejects.toMatchObject({ code: 'TIMEOUT' });
    } finally {
      vi.useRealTimers();
    }
  });

  it('returns an empty array when the channel has no messages', async () => {
    const fakeFetch = makeFakeFetch(async () => new Response('[]', { status: 200 }));
    const result = await fetchRecentAgentArmyMessages(10, { fetchImpl: fakeFetch, token: 't', channelId: 'C' });
    expect(result).toEqual([]);
  });

  it('uses Discord REST API v10 with Bot authorization header', async () => {
    const fakeFetch = makeFakeFetch(async () => new Response('[]', { status: 200 }));
    await fetchRecentAgentArmyMessages(15, { fetchImpl: fakeFetch, token: 'MY_TOKEN_xyz', channelId: 'C99' });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    const [url, init] = (fakeFetch as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[0];
    expect(url).toBe('https://discord.com/api/v10/channels/C99/messages?limit=15');
    expect(init.headers).toMatchObject({ Authorization: 'Bot MY_TOKEN_xyz' });
  });
});