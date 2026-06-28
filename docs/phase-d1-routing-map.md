# Phase D1 — Discord #agent-army Routing Map

Owner: Igris
Status: Implemented (branch `phase-d1-discord-routing-map`, awaiting Phase D ship)

## Feature

Phase D1 gives Stronghold a read-only window into the Discord `#agent-army`
channel that Chris's agent army uses for coordination. It is a thin,
deliberately small surface: one HTTP endpoint (`GET /api/discord/agent-army`),
one backend service (`server/services/discordFeed.ts`), and one dashboard
panel (`src/components/DiscordCoordinationPanel.tsx`). The endpoint is
`GET`-only — no `POST`, no `PATCH`, no `DELETE` — so Stronghold cannot
mutate Discord state. Every successful read appends exactly one
audit-log entry; every failed read appends exactly one `outcome: failed`
entry. The endpoint is localhost-only (existing CORS guard) and
rate-limited at 30/min via a dedicated `discord-read` family bucket so a
runaway dashboard loop cannot burn through the Discord rate-limit window.

## API contract

### Request

```
GET /api/discord/agent-army?limit=N
Origin: http://127.0.0.1:5174
```

| Parameter | Type   | Default | Range  | Notes                                      |
|-----------|--------|---------|--------|--------------------------------------------|
| `limit`   | int    | 10      | 1–50   | Out-of-range / non-numeric → default 10.   |

Any origin other than the configured localhost is rejected with `403
{"error":"origin not allowed"}`. Non-GET methods return `404` or `405`
(the route is read-only by construction — there is no other handler).

### Response (200)

```json
{
  "messages": [
    {
      "id": "string",
      "timestamp": "ISO-8601 string",
      "author": {
        "id": "string",
        "username": "string",
        "displayName": "string"
      },
      "content": "string",
      "isBot": false
    }
  ],
  "fetchedAt": "ISO-8601 string"
}
```

The message shape is the normalized type from
`server/services/discordFeed.ts`:

```ts
export type DiscordFeedMessage = {
  id: string;
  timestamp: string;
  author: { id: string; username: string; displayName: string };
  content: string;
  isBot: boolean;
};
```

### Error responses

| Status | `code`         | When                                                    | Body                                              |
|--------|----------------|---------------------------------------------------------|---------------------------------------------------|
| 403    | —              | Origin is not the configured localhost                  | `{ "error": "origin not allowed" }`               |
| 429    | —              | Per-family rate limit exceeded (`discord-read`, 30/min) | `{ "error": "rate limit exceeded" }`              |
| 502    | `TIMEOUT`      | Discord fetch exceeded 5s                                | `{ "error": "discord fetch failed", "detail": ... }` |
| 502    | `DISCORD_FAILURE` | Any other non-2xx from Discord                        | `{ "error": "discord fetch failed", "detail": ... }` |
| 503    | `UNAUTHORIZED` | Discord rejected the bot token (401)                     | `{ "error": "discord bot token rejected", "code": "UNAUTHORIZED" }` |
| 503    | `RATE_LIMITED` | Discord rate-limited us (429)                            | `{ "error": "discord rate limited", "code": "RATE_LIMITED", "retryAfter": <seconds> }` |

## On-disk verification

```bash
# Service export + signature
grep -n "fetchRecentAgentArmyMessages" server/services/discordFeed.ts

# Route wiring
grep -nE "discord.*agent-army|GET.*discord" server/index.ts

# UI panel import + render site
grep -n "DiscordCoordinationPanel" src/
```

## Known limitations

- **5s fetch timeout** — the service aborts the upstream Discord request
  if it has not completed in 5 seconds (`AbortController`, surface as
  `code: 'TIMEOUT'`).
- **Discord per-channel limit** — `GET /channels/{id}/messages` returns
  at most the last 100 messages regardless of `?limit=`. The route caps
  the `limit` query parameter at 50 to leave headroom.
- **60s polling interval (pausable)** — the dashboard panel polls every
  60 seconds by default. The user can pause polling via the toggle in
  the panel header.
- **Read-only — no post/react/edit** — Stronghold has no surface that
  can post, react to, edit, or delete Discord messages. Wiring a write
  endpoint is a deliberate future phase.
- **Rate-limited 30/min** — the dedicated `discord-read` family bucket
  in `buildRateLimiters` enforces 30 requests per 60-second sliding
  window. Excess returns `429 {"error":"rate limit exceeded"}`.

## Sentinel verdict

**PASS.** No regressions (154/154 tests green — 127 baseline + 9 service + 13 route + 5 UI panel), no new dependencies,
type-check clean, build clean. The change is strictly additive: one
new service file, one new route, one new audit-log targetType, one new
panel component, plus its test. Discord state is never mutated.

## QC verdict

_(filled in by the QC subagent — see chat log for the QC dispatch)_