# Phase D4 — Live Activity Graph ("Routing Flow")

## Feature

The Routing Flow panel visualizes governance hand-off traffic inside the
Stronghold agent army. It reads the audit log on demand via
`GET /api/activity-graph?windowHours=N`, groups entries by hand-off rule
(see `src/data/divisions.ts`), and renders a pure-SVG graph: Belion at the
top, Igris in the middle, specialists evenly spaced along the bottom,
connected by lines whose stroke width reflects activity count. Edges that
fired within the last hour get a `activity-edge--pulse` class so a CSS
keyframe animation highlights active routes. The panel polls every 60s
and offers 1h / 6h / 24h / 168h window selectors. The backend route is
read-only — activity is reconstructed from the audit log on every request,
never mutated.

## API contract

### Request

```
GET /api/activity-graph?windowHours=N
```

Headers: standard CORS origin guard (localhost-only).

`windowHours`:

- `1` … `168` (one hour .. one week) — clamped silently if out of range
- non-numeric, `NaN`, or negative — defaults to `24`
- omitted — defaults to `24`

### Response (200)

```ts
type ActivityGraph = {
  generatedAt: string;  // ISO timestamp
  divisions: Array<{ id: string; label: string; color: string }>;
  edges: Array<{
    from: string;
    to: string;
    count: number;
    lastTimestamp: string;     // ISO
    lastCapability: string;    // e.g. "engineering:backend"
    recent: boolean;           // true when lastTimestamp is within 1h of generatedAt
  }>;
  totalEntries: number;        // count of parsed audit entries inspected
  windowHours: number;         // the (clamped) window actually applied
};
```

### Errors

- `403 origin not allowed` — non-localhost origin
- `429 rate limit exceeded` — `activity-graph` family bucket is 60/min
- `500 activity graph build failed` — service threw

### Audit

Every successful read writes **one** audit entry:

```
action:      activity-graph.read
capability:  graph:read
actor:       Stronghold
targetType:  activity-graph
targetId:    main
outcome:     ok | failed
reason:      "<edges> edges across <divisions> divisions (window=<h>h)"
metadata:    { windowHours, edges, divisions, totalEntries }
```

## On-disk verification

```bash
# Service signature (returns ActivityGraph, exposes clampWindowHours)
grep -n "buildActivityGraph" server/services/activityGraph.ts
grep -n "clampWindowHours"   server/services/activityGraph.ts

# Route registration + clamping
grep -nE "activity-graph" server/index.ts

# UI panel + dashboard wiring
grep -n "ActivityGraphPanel" src/
grep -n "Routing Flow"       src/components/AgenticOsDashboard.tsx

# CSS keyframe for active-edge pulse
grep -n "activity-edge-pulse" src/styles.css
```

## Known limitations

- Plain SVG layout is force-free — nodes do not repel or re-arrange. With
  many specialists the bottom row can get cramped; vertical labels would
  help but were out of scope for Phase D4.
- Recency window is hard-coded at 1 hour (`RECENT_WINDOW_MS` in
  `server/services/activityGraph.ts`). Could be made configurable via a
  query param in a future phase.
- Edge match rules use string-prefix matching on capability names
  (`src/data/divisions.ts`). New capability namespaces require updating the
  rule list — there is no auto-discovery.
- The service reads the **last 200 audit entries** (`DEFAULT_MAX_ENTRIES`)
  before filtering by window. Configurable per call via the `maxEntries`
  option but bounded by `TAIL_BYTES` (256 KB upper bound) via
  seek-and-read-from-end — safe for arbitrarily large audit logs.

## QC verdict

_To be filled by Sentinel._