# Phase D3 — Memory Status Panel

## Feature

A read-only audit/lint view of the Hermes `MEMORY.md` file, surfaced as a
new section on the Stronghold Dashboard below the **Routing Flow** graph.
The panel reports:

- file path (monospace, faded)
- size in bytes, section count, last-modified timestamp (relative)
- per-section breakdown: title, char count, first sentence, line range
- "Copy raw text" button for ad-hoc clipboard export
- error / retry / empty-missing-file states

The route never writes. Every read appends exactly one audit entry with
`action='memory-status.read'`, `outcome='ok'|'failed'`. The dashboard's own
visibility into the memory file is therefore auditable.

## Why this and not "memory diff"

Originally D3 was scoped as a memory **diff** viewer (side-by-side between
two snapshots of MEMORY.md). On investigation, there is **no snapshot
infrastructure** — the memory file is just the live state, last modified
2026-06-28, 1856 bytes. Without snapshots there is nothing to diff against.
Adding snapshot infrastructure is a real but separate project; this panel
delivers useful value today by reading the live file and exposing its
structure.

## API contract

### Request
```
GET /api/memory-status
Headers: Origin: http://127.0.0.1:5174 (required — localhost guard)
```

### Response (200)
```json
{
  "path": "C:\\Users\\tophe\\AppData\\Local\\hermes\\memories\\MEMORY.md",
  "exists": true,
  "sizeBytes": 1856,
  "lastModified": "2026-06-28T16:10:00.000Z",
  "sections": [
    {
      "title": "Audit governance",
      "charCount": 280,
      "firstSentence": "MiniMax M3 is the orchestrator and engineer ONLY.",
      "lineStart": 1,
      "lineEnd": 1
    },
    {
      "title": "Pitfalls",
      "charCount": 410,
      "firstSentence": "QC_REPORTS_DIR was on Desktop and silently deleted rounds.",
      "lineStart": 3,
      "lineEnd": 3
    }
  ],
  "rawText": "..."
}
```

### Error responses
- `403` — non-localhost origin
- `429` — rate limit (memory-status family, 30/min default)
- `500` — read failure (with `detail`)

### Path override
`HERMES_MEMORY_PATH` env var overrides the default `%LOCALAPPDATA%\hermes\memories\MEMORY.md`.

## On-disk verification grep recipes

```bash
grep -n "readMemoryStatus" server/services/memoryStatus.ts
grep -nE "memory-status" server/index.ts
grep -n "MemoryStatusPanel" src/components/AgenticOsDashboard.tsx
grep -n "memory-file" shared/types.ts
```

## Known limitations

- No snapshot infrastructure — diffing requires manually saving copies of
  MEMORY.md. Adding automated snapshots is a future project.
- Path is Windows-only (resolves via `%LOCALAPPDATA%`). The `defaultMemoryPath()`
  helper falls back to a posix-style path under `$HOME` for non-Windows
  environments but this is not exercised in production.
- Section detection uses the `§` delimiter pattern observed in the live
  MEMORY.md on 2026-06-28. If the memory tool's format changes, the
  parser needs updating.
- First-sentence detection stops at the first `. ` (period + space).
  Lists or abbreviations without a clear sentence boundary will fall
  back to the first line.
- 30/min rate limit is conservative; the panel polls every 60s so the
  default doesn't bind.

## Sentinel verdict

PASS — read-only, localhost-only, no new npm deps, no shell-out paths,
file fd is closed via try/finally. The bot token / Discord token /
GitHub PAT never appear in the response or audit entry.

## QC verdict

_Pending separate dispatch._
