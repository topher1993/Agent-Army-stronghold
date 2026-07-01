# Phase E2 — Mission Control UX Redesign Proposal

**Status:** Design proposal only. **Do not implement until reviewed.**
**Author:** Belion (orchestrator) on behalf of Chris
**Date:** 2026-06-28
**Supersedes:** N/A — extends Phase E (Linear-style UI rebuild, 8bf6463)

---

## 1. Executive Summary

Replace the current "data-dense 3-column dashboard" with a **mission-control hierarchy** built on three reading layers:

| Layer | Time-to-find | Content |
|-------|--------------|---------|
| **0 — Status banner** | ≤ 1 s | System health, active alerts count, AI ops heartbeat |
| **1 — Active operations** | ≤ 2 s | Agent hierarchy, active missions, pending approvals |
| **2 — Detail & history** | on demand | Audit log, memory snapshot, cron manager, resource usage |

The redesign **keeps the Linear-style base from Phase E** (near-black, Inter, 8 px radii, semi-transparent borders, violet accent) and overlays an **operator-monitor semantics layer** inspired by Grafana and Datadog: monospace numerics, status-color tokens, restrained iconography, semantic spacing.

The redesign does **not** go back to the old "neon sci-fi" aesthetic. That aesthetic directly contradicted the Phase E goal of reducing visual noise and caused the original "ui/ux is unpleasant" feedback in the first place.

---

## 2. Reading-Layer Architecture (the core idea)

The dashboard currently presents all panels at the same visual weight. The eye has nowhere to land first. The redesign establishes an explicit priority order using **size, contrast, and position** — not loud colors.

### Layer 0 — Status Banner (top, full width, ~64 px)

A single horizontal strip at the very top of the page. Always visible. Always the first thing the eye lands on.

**Contents (left → right):**
- System status pill: `HEALTHY` (green) / `DEGRADED` (yellow) / `CRITICAL` (red) / `OFFLINE` (grey). Computed from agent health + alert center.
- Active alerts count: `🔴 0  🟡 2  🔵 7` — colored dots + counts. Click → opens Alert Center drawer.
- AI ops heartbeat: small purple pulse icon + `OPS · 3 active`. Click → expands Active Missions panel.
- Right side: timestamp `06:28:2026 18:23Z` + theme toggle (light/dark) + kill-switch confirm.

**Why it works:** Grafana's status bar + Datadog's alert ribbon, applied to a Linear surface. One glance = one status.

### Layer 1 — Active Operations (above the fold, 2-column responsive)

Two cards side-by-side, occupying the top half of the viewport:

**Card 1.1 — Agent Hierarchy** (replaces current right-rail Cron Manager)

A live tree visualization of the agent army:

```
Belion (Coordinator)
├── Igris (Engineering)        ●  active
├── Beru (Learning)            ●  active
├── GREED (Financial)          ●  idle
├── Kaisel (Tool Division)     ●  active
├── Tusk (QC)                  ◐  busy (1 QC in flight)
└── Sensei (Japanese Tutor)    ●  active
```

- Each node: name + role chip + status dot (green/yellow/red/grey/purple)
- Hover: shows current task, last activity, queue depth
- Click: expands to show that agent's open work items, recent audit entries, health
- Status semantics: green=idle/ready, yellow=busy/long-running, red=error/stuck, purple=AI-ops, grey=offline/paused
- Source: live `/api/agents/registry` + `/api/agents/:id/health` (new endpoints, see §6)

**Card 1.2 — Active Missions** (replaces current "Open Work Items")

A compact list of in-flight work, sorted by priority then age:

- Each row: priority chip (P0 red / P1 yellow / P2 blue / P3 grey) + plan name + assigned agent avatar + ETA
- Default: shows 5 most urgent. "Show all (N)" expands inline.
- Top of card: filter chips by status (active/blocked/waiting)

### Layer 2 — Detail & History (below the fold, accessible in ≤ 3 clicks)

These panels collapse by default. They are not the first thing you should see. They are the things you look up when you need them.

- **Activity Timeline** (replaces current activity table): vertical timeline with icons + semantic color dots. Each event: relative time + actor + action icon + target. Hover: full payload. Default: last 20 events. "Load more" extends.
- **Resource Usage**: grid of 5 small KPI tiles (GPT, MiniMax, OpenRouter, Local GPU, Queue). Numbers in monospace. Sparkline per tile. **[Needs backend — see §6]**
- **Alert Center**: drawer that opens from clicking the Layer 0 alert count. Lists Critical → Warning → Info. Each entry: severity icon + timestamp + source + description + action button (Acknowledge, View, Mute).
- **Cron / Schedule Manager**: collapsed into a "Schedules" tab. Default view: count + next-run timeline. Expand: full CRUD list.
- **Memory Snapshot**: collapsed into a drawer triggered from a "MEM" pill in Layer 0. Shows the current MEMORY.md in a read-only code panel with section anchor nav.
- **Discord Coordination**: stays in its current section but de-emphasized (grey header, smaller font).

### Why this order

The brief asks for "Critical alerts ≤ 1 s, Active missions ≤ 2 s, Agent health ≤ 3 s". The current layout forces the user to **scan the entire page** to find any of those — they are at the same visual weight as "Audit Trail" and "Open Work Items".

After the redesign:

| Target | Current time-to-find | New time-to-find |
|--------|---------------------|-------------------|
| Critical alert | 5-10 s (scanning) | ≤ 1 s (banner) |
| Active mission | 5-10 s | ≤ 2 s (Layer 1) |
| Agent health | 8-15 s | ≤ 3 s (Layer 1 hierarchy) |
| Audit log | 2-3 s | on demand (Layer 2) |

Cognitive load estimate: current page has **14 visually distinct regions**. New layout has **3 layers, 6 surface regions at rest**. Roughly 60% reduction in regions competing for attention. (Target was ≥ 40%.)

---

## 3. Design System Refinements (extensions to Phase E)

Phase E established the base. This proposal adds operator-monitor semantics on top.

### Spacing — 8 px grid

All margins, paddings, and gaps must be a multiple of 8 px: `8, 16, 24, 32, 48, 64`. The current styles.css uses some `13px`, `17px`, `22px` values from older code — these are non-conformant and should be normalized.

### Semantic color tokens (per brief)

| Token | Color | Use |
|-------|-------|-----|
| `--semantic-healthy` | `#10b981` (emerald) | Status OK, tests pass, agent ready |
| `--semantic-info` | `#3b82f6` (blue) | Informational events, neutral notifications |
| `--semantic-warning` | `#f59e0b` (amber) | Warnings, degraded states, slow jobs |
| `--semantic-critical` | `#ef4444` (red) | Errors, P0/P1 alerts, kill switch |
| `--semantic-ai` | `#a855f7` (purple) | AI ops specifically (LLM calls, model load) |
| `--accent` | `#7170ff` (violet, unchanged) | Primary interactive — keep distinct from semantic-ai |

The semantic-ai purple is deliberately **different** from accent violet to avoid confusion: violet = "I click this", purple = "AI did a thing". This matches the brief's "Purple = AI Operations" rule.

### Status pill semantics

- **Background**: tinted (8% opacity of semantic color)
- **Text**: full saturation of semantic color
- **Border**: 1px at 16% opacity of semantic color
- **No glow, no animation** unless active (then a 2 px subtle pulse on red/yellow only)

### Iconography

Linear uses icons sparingly. Grafana uses them pervasively for status. We adopt Grafana's pattern: every status/state in Layer 0 and Layer 1 has an icon. Icons are 14-16 px, single-color (semantic), inline SVG. No emoji.

Proposed icon set (lucide or heroicons):
- agent: `user`, `user-check`, `user-x`, `user-cog`
- mission: `target`, `circle-dot`, `loader`
- alert: `bell`, `triangle-alert`, `circle-check`, `info`
- resource: `cpu`, `zap`, `cloud`, `database`, `list-ordered`
- nav: `chevron-down`, `chevron-right`, `x`, `panel-left`

(No new npm dep needed — inline SVGs or existing icon set. Confirm during implementation.)

### Card elevation (replacing borders)

The brief says "replace excessive borders with whitespace and card elevation". Three elevation tiers:

1. **Tier 0 (canvas)**: `--bg-canvas`, no border. Background of page.
2. **Tier 1 (panel)**: `--bg-panel`, no border, `box-shadow: 0 1px 2px rgba(0,0,0,.4)`. The default card.
3. **Tier 2 (elevated)**: `--bg-elevated`, `box-shadow: 0 4px 12px rgba(0,0,0,.5)`. For popovers, drawers, modals.

**No 1 px white border on cards.** The Phase E system uses `rgba(255,255,255,0.08)` borders everywhere — this is "Linear-style" but it becomes visually noisy when many cards stack. Replacing with **whitespace + shadow** reduces visual noise.

**Exception**: Layer 0 status banner keeps a bottom border (`1px solid var(--border-subtle)`) for separation. Drawers/modals keep a `1px solid var(--border)` for affordance.

### Responsive layout

Per brief:

| Breakpoint | Grid | Behavior |
|------------|------|----------|
| Desktop ≥ 1280 px | 12-col | Layer 1 = 7+5 split, Layer 2 = 4+4+4 |
| Tablet 768-1279 px | 6-col | Layer 1 = full-width stacked, Layer 2 = 3+3 |
| Mobile < 768 px | stacked | All cards full-width, Layer 0 collapses to icon-only status |

The current layout already collapses to single-column on mobile; the redesign formalizes this with explicit breakpoints.

---

## 4. Component Hierarchy

```
<App>
└── <MissionControl> (new top-level page wrapper)
    ├── <StatusBanner> (Layer 0 — always visible)
    │   ├── <HealthPill>           (system status)
    │   ├── <AlertCount>           (Critical/Warning/Info dots)
    │   ├── <AiOpsHeartbeat>       (AI ops pulse)
    │   └── <TopRight>             (timestamp, theme toggle, kill switch)
    │
    ├── <ActiveOperations> (Layer 1 — above the fold)
    │   ├── <AgentHierarchy>       (live tree, expandable nodes)
    │   │   ├── <AgentNode>        (per agent: name, role, status)
    │   │   └── <AgentDetail>      (popover on click)
    │   └── <ActiveMissions>       (P0-P3 sorted list)
    │       └── <MissionRow>       (priority + plan + agent + ETA)
    │
    ├── <DetailLayer> (Layer 2 — below the fold, default collapsed except Activity)
    │   ├── <ActivityTimeline>     (replaces activity table; icons + colors)
    │   ├── <ResourceUsageGrid>    (5 KPI tiles, needs backend)
    │   ├── <AlertCenterDrawer>    (opens from Layer 0 click)
    │   ├── <CronManager>          (collapsed tab, full CRUD on expand)
    │   ├── <MemorySnapshotDrawer> (read-only MEMORY.md view)
    │   └── <DiscordCoordination>  (de-emphasized but preserved)
    │
    └── <OperationsTab> (existing tab content — unchanged)
```

**Reuses**: `<StatusBanner>`, `<AgentHierarchy>`, `<ActiveMissions>`, `<ActivityTimeline>`, `<ResourceUsageGrid>`, `<AlertCenterDrawer>` are **new** in Phase E2. The right-rail panels (ApprovalQueue, AuditTrail, CronManager) become **drawer contents** instead.

---

## 5. UX Rationale

### Why Layer 0 status banner (not a separate page)

Putting status on a separate page means the user has to navigate to see it. The whole point of "≤ 1 s to critical alerts" is that the user *sees* the dashboard in the corner of their monitor and immediately knows if something is wrong. Separating it defeats the purpose.

### Why tree visualization for agents (not a list)

The brief lists 6 agents today. Tomorrow it lists 60. A flat list doesn't scale. A tree (Belion → 6 children → grandchildren) scales because each level is bounded. Linear and GitHub both use tree views for hierarchical data; the pattern is proven.

### Why timeline (not table) for activity

The current activity table is dense monospace. It optimizes for "look up a specific row" (power-user). For "what just happened?" (operator), a timeline with icons and color is faster to scan. The table can still be available behind a "raw view" toggle for the power-user case.

### Why collapsible drawers (not right rail)

The right rail is fixed. It forces every user to look at Cron and Memory every time, regardless of whether they care. Drawers are opt-in: open when you need them, gone when you don't. Matches Linear's pattern of "details on demand".

### Why keep Linear-style + add semantic color (not go full Grafana)

Grafana is built for dense multi-graph dashboards. Stronghold is not that — it's a control plane. Linear-style with semantic color gives us 80% of Grafana's readability with 20% of the visual noise.

### Why "AI ops" purple is separate from accent violet

Accent violet = "interactive UI element". Semantic AI purple = "AI is doing something". If both were the same color, users would conflate "click me" with "this is AI". Datadog does this separation (their primary blue ≠ their AI feature color).

---
## 6. Backend Requirements

Several features in this proposal need backend work **before** UI can render real data. Honest split:

### UI-only (built in same phase)

- Status banner layout (renders with live data from new endpoints below)
- Layer 1 AgentHierarchy + ActiveMissions
- Layer 2 reorganization (drawers, tabs)
- ActivityTimeline re-render
- Responsive grid
- Test coverage for new components

### Backend (built in same phase)

- **Resource Usage widget** — `/api/resource-usage` returning `{ gpt: N/A, minimax: N/A, openrouter: N/A, localGpu: {utilization, memUsed, memTotal}, queue: {size, oldest} }`
  - Local GPU: `nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=json` parsed server-side, 5s refresh
  - Queue size: derived from pending approvals + active cron jobs + plan runner queue
  - Provider usage (GPT/MiniMax/OpenRouter) stubbed as `null` with "not yet tracked" tooltip
- **Agent Hierarchy live data** — `/api/agents/registry` returns actual 6-agent roster; `/api/agents/:id/health` derives heartbeat from audit-log.jsonl (last activity per actor) + plan runner queue depth
- **Alert Center** — `/api/alerts` returns `{ critical: [...], warning: [...], info: [...] }`
  - Critical: P0/P1 audit events, kill-switch armed, failed test runs
  - Warning: P2 events, slow jobs (>10 min), degraded agents (no activity 1h+)
  - Info: P3 events, agent heartbeats, job completions
  - Persisted in `data/alerts.jsonl`; rotated daily; never pruned to zero (keep last 30 days)

### Single phase scope (per Chris 2026-06-28)

**Phase E2 — Mission Control UX Redesign** delivers all of the above as one coordinated release:
1. Design tokens refactor (semantic colors, 8 px grid, elevation tiers)
2. Layer 0 StatusBanner (live data)
3. Layer 1 AgentHierarchy + ActiveMissions (live data)
4. Layer 2 reorganization (drawers, ActivityTimeline)
5. Resource Usage grid (local GPU live, others stubbed)
6. Alert Center drawer + backend
7. Responsive breakpoints (1280/768/<768)
8. Virtualization where needed (likely ActiveMissions, ActivityTimeline)
9. Test coverage + QC routing

Estimated effort: 3-4 days, single PR. Memory rule: full-app UI audits drive INLINE, not via subagent, so Igris will be tightly scoped to backend wiring while orchestrator drives the UI audit inline.

After merge: this proposal becomes the implementation record.

---

## 7. Discrepancies With the Brief (flagged for review)

The brief as written contains a few items that don't match the current state of Stronghold. Flagging here so we resolve before implementation:

1. ✅ **Agent list mismatch — RESOLVED.** Brief lists 5 agents (Igris/Kaisel/Beru/Greed/Iron); actual Stronghold registry has 6. **Hierarchy uses the actual 6: Belion → Igris, Beru, GREED, Kaisel, Tusk, Sensei.** Iron remains in v2 docs as Operations Commander but is not in the Stronghold division roster.

2. **"Military command-center aesthetic" vs Phase E Linear rebuild.** Phase E explicitly replaced the military/sci-fi aesthetic with Linear-style (commit 8bf6463). Reverting to military contradicts that decision. **Proposal: keep Linear + add operator-monitor overlay** (semantic colors, monospace numerics, status pills). Confirm with user.

3. **"Replace excessive borders with whitespace and card elevation".** Phase E used semi-transparent borders as the Linear-style card pattern. The brief now says to remove borders and use elevation (shadow) instead. This is a refinement of Phase E, not a contradiction — but it changes the visual character. Confirm acceptable.

4. **"Cron Manager collapsible" + "Memory Snapshot drawer".** Current Cron Manager is in the right rail; Memory Status is a section. Proposal moves both to drawers/tabs. This is a UX change that reduces their prominence — confirm user wants this (vs leaving them visible).

5. **Resource Usage data sources.** Several sources (GPT/MiniMax/OpenRouter usage) are not currently tracked anywhere in Stronghold. Showing empty tiles is worse than not showing them. **Proposal: implement local GPU first, stub provider usage with "N/A" + tooltip explaining "not yet tracked"** until backend work is done.

6. **"50+ agents and 100+ scheduled jobs" scalability.** Current components handle 19 skills, 6 cron jobs, 6 divisions without performance issues. Scaling to 100+ agents requires virtualization (windowed lists, not rendering 100 DOM nodes). This is a non-trivial change. **Proposal: target 100 agents with virtualization (`@tanstack/react-virtual` or similar); note this adds an npm dep**, which per memory rule requires flagging.

---

## 8. What This Proposal Does NOT Change

- **Existing QC routing** (Igris implements → Sentinel reviews → GPT-5.5 QC → Chris).
- **Audit log format or schema**.
- **Existing API contracts** (`/api/health`, `/api/activity-graph`, `/api/memory-status`, `/api/discord/agent-army`, `/api/approvals`, `/api/cron/*`).
- **Phase E visual base** (fonts, colors, radii, shadows) — only refines borders → elevation and adds semantic color tokens.
- **Tests that exist today** — all 204/204 must keep passing.

---

## 9. Decision Points for Chris

Before I (or anyone) implements this, I need answers to:

1. ✅ **Hierarchy scope**: **6 actual agents** (Belion → Igris, Beru, GREED, Kaisel, Tusk, Sensei) — confirmed by Chris 2026-06-28. Brief's 5-agent list (incl. Iron) was incorrect.
2. ✅ **Aesthetic direction**: **(A) Linear + operator-monitor overlay** — confirmed by Chris 2026-06-28. Keep Phase E Linear base; add semantic colors, monospace numerics, status pills, Grafana-style banner. No return to military aesthetic.
3. ✅ **Resource Usage backend priority**: **(A) Local GPU first; stub the other 4 tiles with "N/A — not yet tracked" + tooltip** — confirmed by Chris 2026-06-28. Phase E2 ships with one live tile + four explanatory stubs.
4. **Phasing decision: ALL-OR-NOTHING** — confirmed by Chris 2026-06-28. Do NOT split into E2.1/E2.2/E2.3 sub-phases. Build UI shell + backend wiring + Alert Center as a single coordinated phase. QC at end.
5. ✅ **Approval to add `@tanstack/react-virtual`** — confirmed by Chris 2026-06-28. First new npm dependency since project start. Flagged for QC review (license, bundle size, maintenance).

If you don't have answers right now, **the default-judgement move per memory rule is "lowest-risk, highest-info-density status move that doesn't lock anything in"** — which means: **don't implement, hold the proposal for review, idle until Chris responds**.

---

## 10. References

- Phase E Linear-style rebuild: commit `8bf6463`, doc implicit in `src/styles.css` (Linear design tokens).
- Agent registry: `docs/agent-army-v2/agent-army-v2-index.md`.
- Current dashboard architecture: `docs/architecture.md`.
- Reference designs (from `popular-web-designs` skill): Linear, Vercel, Grafana, Datadog, GitHub Actions.
- Memory rule on full-app UI audits: drive INLINE, not via subagent.
- Memory rule on deliverables: never on Desktop; saved to `<repo>/docs/`.

---

**End of proposal.** Awaiting Chris review before any implementation begins.
