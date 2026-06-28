// FEATURE — Discord #agent-army coordination panel (Phase D1 UI).
//
// A self-contained React component that:
//   - fetches GET /api/discord/agent-army?limit=20 on mount
//   - re-fetches every 60 seconds when not paused
//   - renders a card per message (author + relative time + content)
//   - truncates content to 280 chars with "…" if longer
//   - shows a bot badge when isBot
//   - empty state: "No recent messages" + Refresh button
//   - error state: error text + Retry button + last successful fetch timestamp
//   - has a pause/play toggle (testID="coordination-toggle")
//   - re-renders relative timestamps every 30 seconds to keep them fresh
//
// This panel is READ-ONLY. There is no post/react/edit affordance — the
// decision to wire a Discord write endpoint is a deliberate future phase.

import { useCallback, useEffect, useRef, useState } from 'react';

type DiscordFeedMessage = {
  id: string;
  timestamp: string;
  author: { id: string; username: string; displayName: string };
  content: string;
  isBot: boolean;
};

type DiscordFeedResponse = {
  messages: DiscordFeedMessage[];
  fetchedAt: string;
};

const POLL_INTERVAL_MS = 60_000;
const TIME_REFRESH_MS = 30_000;
const CONTENT_LIMIT = 280;

function relativeTime(iso: string, now: number = Date.now()): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '—';
  const delta = Math.max(0, now - t);
  const s = Math.floor(delta / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function truncate(text: string, limit: number = CONTENT_LIMIT): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  return { text: text.slice(0, limit) + '…', truncated: true };
}

function fmtTimestampShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

export function DiscordCoordinationPanel(): JSX.Element {
  const [messages, setMessages] = useState<DiscordFeedMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [paused, setPaused] = useState<boolean>(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState<boolean>(false);
  // Bumping this state every TIME_REFRESH_MS forces a re-render so
  // relative timestamps stay fresh without each card managing its own timer.
  const [, setTick] = useState<number>(0);

  const fetchRef = useRef<(() => Promise<void>) | null>(null);
  fetchRef.current = async () => {
    setError(null);
    try {
      const res = await fetch('/api/discord/agent-army?limit=20', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = (body && typeof body === 'object' && 'error' in body)
          ? String((body as { error: unknown }).error)
          : `HTTP ${res.status}`;
        setError(`Discord read failed: ${detail}`);
        // On error we keep the previous messages on screen so the user
        // doesn't lose context — only update the error state.
        return;
      }
      const payload = (await res.json()) as DiscordFeedResponse;
      setMessages(Array.isArray(payload?.messages) ? payload.messages : []);
      setLastFetchedAt(typeof payload?.fetchedAt === 'string' ? payload.fetchedAt : new Date().toISOString());
      setHasFetchedOnce(true);
    } catch (err) {
      setError(`Discord read failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  // Kick off the initial fetch on mount. We don't gate on paused here —
  // paused only stops *re*-polling, not the first paint.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchRef.current?.();
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render every TIME_REFRESH_MS so relative timestamps stay fresh.
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), TIME_REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  // 60s polling loop, gated on !paused. We track the timer ID locally so
  // toggling pause/resume cleanly restarts the interval.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      void fetchRef.current?.();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  const onTogglePause = useCallback(() => {
    setPaused(p => !p);
  }, []);

  const onRefresh = useCallback(() => {
    void fetchRef.current?.();
  }, []);

  const onRetry = useCallback(() => {
    void fetchRef.current?.();
  }, []);

  // --- render -------------------------------------------------------------

  let body: JSX.Element;
  if (loading && !hasFetchedOnce) {
    body = <p className="muted" data-state="loading">Loading…</p>;
  } else if (error && !hasFetchedOnce) {
    body = (
      <div data-state="error">
        <p className="muted" data-error-message>{error}</p>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    );
  } else if (messages.length === 0) {
    body = (
      <div data-state="empty">
        <p className="muted">No recent messages</p>
        <button type="button" data-testid="coordination-refresh" onClick={onRefresh}>Refresh</button>
      </div>
    );
  } else {
    body = (
      <ol className="discordCoordinationList" data-state="loaded">
        {messages.map(m => {
          const { text: shortContent, truncated } = truncate(m.content);
          return (
            <li
              key={m.id || `${m.timestamp}-${m.author.id}`}
              className="discordCoordinationCard"
              data-message-id={m.id}
            >
              <header className="discordCoordinationHeader">
                <span className="discordCoordinationAuthor">{m.author.displayName || m.author.username || 'unknown'}</span>
                {m.isBot ? <span className="discordCoordinationBotBadge" data-bot-badge>BOT</span> : null}
                <time className="discordCoordinationTime muted" dateTime={m.timestamp} title={fmtTimestampShort(m.timestamp)}>
                  {relativeTime(m.timestamp)}
                </time>
              </header>
              <p className="discordCoordinationContent" data-truncated={truncated ? 'true' : 'false'}>
                {shortContent}
              </p>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <section className="agenticOsSection" aria-label="Discord coordination" data-section="discord-coordination">
      <header className="agenticOsSectionHeader">
        <h3>Coordination</h3>
        <button
          type="button"
          data-testid="coordination-toggle"
          data-paused={paused ? 'true' : 'false'}
          onClick={onTogglePause}
          className="discordCoordinationToggle"
          aria-pressed={paused}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
      </header>

      {body}

      {error && hasFetchedOnce
        ? (
          <p className="muted" data-state="error-stale">
            Last update failed: {error}
            {lastFetchedAt ? ` · last good fetch ${relativeTime(lastFetchedAt)}` : ''}
          </p>
        )
        : null}
      {lastFetchedAt && !error
        ? <p className="muted" data-state="fetched-at">Last fetched {relativeTime(lastFetchedAt)}</p>
        : null}
    </section>
  );
}