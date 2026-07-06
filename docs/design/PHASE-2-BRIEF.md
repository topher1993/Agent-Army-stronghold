# Lyra — Phase 2 Implementation Brief (Surfaces)

Scope: every surface has a consistent shell, focus management, shared primitives. Source: `docs/design/DESIGN-v2.md` §6, §7-Phase2, §9-Phase2, §10-Phase2.

Audience: Clix (implementation). Reviewer: Igris. QC: Tusk.

---

## 0. Ground rules

- Read tokens from `src/styles.css`. No raw hex. No `rgba()` outside the token definitions.
- One `ToastHost` mounted by `AppShell`. No component mounts its own toast UI. Legacy `<p className="statusLine">` call sites get converted.
- Do NOT delete `WorkCardFeed.tsx` or `WorkCardDrawer.tsx` exports until `WorkCardBoard` is wired to the new primitives and verified.
- AppShell hosts focus trap and live region; surfaces consume them.
- All new components are pure — they accept data via props and emit via callbacks. No store coupling inside primitives.
- Subagents is the only NEW surface in Phase 2. The cost/usage stat row and wrapper-availability filter are owned by Phase 2 (P1#3, Chris#6, Chris#8). Do not push them to Phase 3.
- Bulk-action patterns (Work Board, Approvals), undo toasts, keyboard shortcuts on Approvals (`j`/`k`/`a`/`r`/`?`), and per-surface live-region announcements are **Phase 3** — DO NOT implement them in Phase 2. The spec mentions them in §6.2 / §6.5 / §6.6; Phase 2 lays the primitive foundation, Phase 3 wires the interaction patterns.

---

## 1. New shared primitives (build first)

Build these in `src/components/Cards/` and `src/components/Feedback/` and `src/components/Tables/` before wiring any surface. They are the spine of Phase 2.

### 1.1 `Panel` — `src/components/Cards/Panel.tsx`

Card surface primitive. Replaces ad-hoc `<div className="card">` usages across surfaces.

Props:
- `title?: string` — optional header rendered inside the panel.
- `eyebrow?: string` — small uppercase label above the title (e.g. "AGENTIC OS").
- `actions?: ReactNode` — right-aligned header slot for buttons.
- `tone?: 'default' | 'elevated' | 'subtle'` — visual weight. Default `default`.
- `padding?: 'sm' | 'md' | 'lg'` — defaults to `md`.
- `as?: keyof JSX.IntrinsicElements` — defaults to `section`. Lets callers render `<Panel as="article">` for semantic correctness in feeds.
- `id?: string` — used for sub-nav anchors (`section-coordination`, `section-routing`, `section-memory`).
- `children: ReactNode`

Visual:
- Background: `var(--color-surface-elevated)`.
- Border: `1px solid var(--color-border-subtle)`.
- Radius: `var(--radius-card)` (12px).
- Shadow: `var(--shadow-card)`; `tone="elevated"` uses `var(--shadow-card-elevated)`.
- Header: bottom border `var(--color-border-subtle)`; padding `12px 16px`.
- Body: padding driven by `padding` prop.

Accessibility: panel header is an `<h2>` if `title` is provided and `eyebrow` is not, otherwise `<h3>`. Use `aria-labelledby` linking header to the panel body.

### 1.2 `Stat` — `src/components/Cards/Stat.tsx`

Reused by Dashboard four-up AND Subagents cost/usage row.

Props:
- `label: string` — eyebrow text (uppercase, small).
- `value: string | number` — primary metric. Render as-is; callers format currency.
- `unit?: string` — small suffix (e.g. "ms", "$").
- `delta?: { value: string; tone: 'success' | 'danger' | 'neutral' }` — optional change indicator.
- `hint?: string` — single-line helper below value.
- `tooltip?: string` — when present, attach a help icon that surfaces the tooltip on hover and focus (use `aria-describedby`).
- `id?: string` — sub-nav anchor hookup (e.g. `section-health` wrapper).
- `tone?: 'default' | 'inverse'` — `inverse` swaps value color for use on dark hero.

Visual:
- 1px border, surface-elevated background, radius-card.
- Label uses `--text-eyebrow` (12px, uppercase, `--color-text-muted`).
- Value uses `--text-stat` (28px, weight 600, `--color-text-primary`).
- Hint uses `--text-hint` (12px, `--color-text-muted`).
- Delta pill uses `StatusPill` with semantic tone.

### 1.3 `WorkCard` — `src/components/Cards/WorkCard.tsx`

Extracted from `WorkCardBoard`. Phase 2 carries the visual + structural extraction; drag-and-drop is wired in Phase 4.

Props:
- `id: string`
- `title: string`
- `subtitle?: string`
- `laneId: WorkCardStatus` — REQUIRED from day one even though drag-and-drop is Phase 4 (data model must accept `laneId`).
- `owner?: { id: string; name: string; avatarUrl?: string }`
- `status: WorkCardStatus` — drives the StatusPill.
- `priority?: 'low' | 'normal' | 'high' | 'critical'`
- `dueAt?: string` (ISO)
- `href?: string`
- `selected?: boolean` — visual selection state for bulk-select (Phase 3 will toggle it).
- `onOpen?: (id: string) => void`

Layout (mobile-first):
- Header row: title (2-line ellipsis) + `StatusPill`.
- Subtitle row: muted text.
- Footer row: owner avatar (24px) + due date (relative time) + priority indicator.

The "see more" toggle for long titles is Phase 3 — Phase 2 ships 2-line ellipsis only.

### 1.4 `AgenticOsCard` — `src/components/Cards/AgenticOsCard.tsx`

Used by Dashboard's agentic OS section. Mirrors `Panel` API but with a colored left border for the four-up hero row.

Props:
- `label: string`
- `value: string | number`
- `tone: 'success' | 'warning' | 'danger' | 'neutral' | 'accent'` — drives the left border color.
- `description?: string`
- `cta?: { label: string; href: string }`

Visual: 4px left border uses `var(--color-tone-{tone})`. Otherwise identical to `Stat`.

### 1.5 `StatusPill` — `src/components/Feedback/StatusPill.tsx`

Single source of truth for status semantics. Every pill in the app reads from this component.

Props:
- `tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent'`
- `label: string`
- `size?: 'sm' | 'md'` — defaults to `sm`.
- `icon?: 'check' | 'x' | 'dot' | 'spinner' | 'pause' | 'play'` — defaults to `dot`.

Token mapping (CRITICAL — these are the canonical semantics):
- `success` → `var(--color-success)` border + text, `var(--color-success-bg)` background. Use for: cron enabled, subagent wrapper available, mission completed.
- `warning` → `var(--color-warning)` + `var(--color-warning-bg)`. Use for: cron last status warning, subagent wrapper throttled, mission attention.
- `danger` → `var(--color-danger)` + `var(--color-danger-bg)`. Use for: cron last status failed, subagent wrapper unavailable, mission failed.
- `neutral` → `var(--color-text-muted)` + `var(--color-surface-subtle)`. Use for: cron paused, no status, idle.
- `info` → `var(--color-info)` + `var(--color-info-bg)`. Use for: informational tags.
- `accent` → `var(--color-accent)` + `var(--color-accent-bg)`. Use for: brand highlight (e.g. "PRIMARY" subagent).

Visual: 1px border, fully rounded, padding `2px 8px`, font 11px uppercase letter-spaced. Dot icon = 6px circle in tone color. Spinner icon = 10px spinning border. Pause/Play = Lucide icons.

Accessibility: pill text is read by SR. Include `aria-label` if `label` is shorthand (e.g. `aria-label="Subagent available"`).

### 1.6 `EmptyState` — `src/components/Feedback/EmptyState.tsx`

Required on every list surface when its data is empty.

Props:
- `title: string`
- `description?: string`
- `icon?: ReactNode` — Lucide icon, 32px, `--color-text-muted`.
- `action?: { label: string; onClick: () => void; href?: string }`

Layout: centered, max-width 360px, 48px vertical padding above and below. Icon top, title below in `--text-h2`, description below in `--color-text-muted`. Action is a `Button` if `href` omitted, else `<a>` styled as button.

### 1.7 `Skeleton` — `src/components/Feedback/Skeleton.tsx`

Used for the four hero stats on Dashboard, QC panel, and the Subagents cost/usage row before snapshot loads.

Props:
- `width?: string | number` — defaults to `100%`.
- `height?: string | number` — defaults to `16px`.
- `rounded?: 'sm' | 'md' | 'lg' | 'full'`
- `count?: number` — if set, render that many skeleton lines stacked with 8px gap.

Visual: background `var(--color-surface-skeleton)` (a token that MUST exist in §5 token overhaul — flag if missing), 1.5s shimmer animation using `@keyframes skeleton-shimmer`. Animation respects `prefers-reduced-motion: reduce` (no shimmer, just static block).

### 1.8 `Spinner` — `src/components/Feedback/Spinner.tsx`

Props:
- `size?: 'sm' | 'md' | 'lg'` — defaults to `md` (16px).
- `tone?: 'inherit' | 'inverse'` — defaults to `inherit`.
- `label?: string` — accessible name.

Visual: 1.5px border, top segment transparent, rest `currentColor`. Respects `prefers-reduced-motion`.

### 1.9 `ScrollableTable` — `src/components/Tables/ScrollableTable.tsx`

Used by Operations Audit Trail (last 20 events) and any future tabular surface.

Props:
- `columns: Array<{ key: string; header: string; width?: string; align?: 'left' | 'right' | 'center'; render?: (row) => ReactNode }>`
- `rows: Array<Record<string, any>>`
- `caption?: string` — accessibility caption above table.
- `maxHeight?: string` — defaults to `320px`. When rows exceed, vertical scroll kicks in with sticky header.
- `emptyState?: ReactNode` — render when `rows.length === 0` (uses `EmptyState`).
- `footer?: ReactNode` — used by Audit Trail for the "Show older" placeholder link.

Sticky header: `position: sticky; top: 0; background: var(--color-surface-elevated);`. Sticky shadow on scroll via IntersectionObserver sentinel.

### 1.10 `Toast` + `ToastHost` — `src/components/Controls/Toast.tsx`, `src/components/Shell/ToastHost.tsx`

Phase 2 lays the foundation. Phase 3 adds `useToast().undo(...)` and replaces `<p className="statusLine">` call sites — Phase 2 ONLY sets up the host and converts the obvious legacy call sites.

`Toast` props:
- `id: string`
- `tone: 'success' | 'warning' | 'danger' | 'info'`
- `title: string`
- `description?: string`
- `duration?: number` — ms before auto-dismiss, default `5000`.
- `action?: { label: string; onClick: () => void }` — wired in Phase 3, accepted in Phase 2 to lock the API.

`ToastHost` props:
- `position?: 'top-right' | 'bottom-right' | 'bottom-center'` — defaults to `bottom-right`.

Host sits at root of `AppShell`. Phase 2 surfaces success/error by replacing the most obvious `<p className="statusLine">` instances (Approvals `Approvals.tsx`, Cron form `CronManager.tsx`, Operations `Operations.tsx` confirmations). Phase 3 finishes the sweep.

ARIA: host has `role="region"` + `aria-label="Notifications"`. Each toast has `role="status"` (info/success) or `role="alert"` (warning/danger).

---

## 2. Shell extraction

Build these in `src/components/Shell/`. They host the AppShell composition.

### 2.1 `AppShell.tsx`

Props:
- `children: ReactNode`
- `activeSurface: SurfaceId`
- `onSurfaceChange: (id: SurfaceId) => void`

Composition:
```
<LiveRegionProvider>          // announced in Phase 3 but host exists now
  <Sidebar activeSurface onSurfaceChange />
  <Header />
  <DashboardSubNav active={activeSurface === 'dashboard'} />
  <main id="main-content">{children}</main>
  <ToastHost />
  <ShortcutOverlay />          // Phase 4; rendered as no-op shell now
</LiveRegionProvider>
```

`AppShell` reads theme from existing theme store; no new state in Phase 2. `LiveRegionProvider` is a no-op provider that exposes `useAnnounce(message)` — Phase 3 wires real announcements.

Hero subtitle mobile rule: above 980px, subtitle visible. Below 980px, subtitle replaced with `<span className="sr-only">…</span>` (the `.sr-only` utility is added to `src/styles.css`; spec rule: 1px absolute positioning, clip rect, white-space nowrap, zero size, NOT `display:none`).

### 2.2 `Header.tsx`

Extract from current `App.tsx` header. Includes:
- Stronghold wordmark (left).
- Recheck button (calls soft refresh — `dispatchEvent('snapshot:refresh')`, NOT `window.location.reload()`).
- Theme toggle (existing).
- Last-refresh pill (existing).

Phase 2: pure extraction, no behavior change. Phase 3 wires recheck to the new snapshot path.

### 2.3 `Sidebar.tsx`

`SURFACES` array gets a new entry:
```ts
{ id: 'subagents', label: 'Subagents', icon: Users, slot: 'between-missions-operations' }
```

Existing order: Dashboard, Work, Missions, **Subagents**, Operations, Approvals, Cron. (Subagents is the only new entry in Phase 2.)

### 2.4 `DashboardSubNav.tsx`

Anchor IDs repaired to the v2 list per §6.1:
- `section-hero` → `<Hero>` root.
- `section-health` → four-up hero stats wrapper.
- `section-work` → `WorkCardBoard` (already correct, keep).
- `section-coordination` → `DiscordCoordinationPanel` root.
- `section-routing` → `ActivityGraphPanel` root.
- `section-memory` → `MemoryStatusPanel` root.

`scrollIntoView({ behavior: 'smooth', block: 'start' })` on click. Active section tracked by `IntersectionObserver` (one observer, root margin `-40% 0px -50% 0px`). Component DOES NOT own the IDs — they live on the components (§6.1 explicitly assigns ownership). `DashboardSubNav` reads them via `document.getElementById` lookup.

### 2.5 `LiveRegionProvider` + `useAnnounce`

Stub. Phase 3 will implement. Phase 2 ships the empty provider + hook returning a no-op function so consumers compile.

---

## 3. Surface-by-surface spec

### 3.1 Dashboard (`src/components/Surfaces/Dashboard.tsx`)

IA:
- Primary: Hero (greeting + status summary).
- Secondary: Agentic OS four-up (`section-health`), Activity Graph (`section-routing`).
- Tertiary: Discord Coordination (`section-coordination`), Work Board (`section-work`), Memory Status (`section-memory`).

Component composition:
- `<Hero id="section-hero" />` (existing, extract).
- `<section id="section-health" className="agenticOsHeroRow">{four AgenticOsCards}</section>`.
- `<DiscordCoordinationPanel id="section-coordination" />`.
- `<ActivityGraphPanel id="section-routing" />`.
- `<WorkCardBoard id="section-work" />` — uses new `WorkCard`.
- `<MemoryStatusPanel id="section-memory" />`.

Status pill taxonomy on Dashboard:
- Agentic OS tiles use `tone` on the card (left border color), no pills inside.
- Discord panel uses `StatusPill` for connection state: success = connected, danger = disconnected, neutral = connecting.
- WorkCardBoard cards use `StatusPill` for work card status (existing WorkCardStatus enum maps to tone).

Empty / loading / error states:
- Snapshot loading: each of the four hero stats renders `<Skeleton height={48} />`. `MemoryStatusPanel` renders `<Skeleton count={3} />`. `ActivityGraphPanel` renders a single large `<Skeleton height={240} />`.
- Snapshot error: surface via `ToastHost` with tone `danger` and title "Snapshot failed to load". Fall back to last known snapshot if present in store; otherwise render `EmptyState` with title "Snapshot unavailable" and action "Retry" that re-triggers the loader.
- Empty work board: `<EmptyState title="No work cards" description="Pull work from a mission to get started" icon={<ClipboardList />} />`.

Data display:
- Hero: greeting (existing), subtitle (visible ≥980px, sr-only below).
- Agentic OS four-up: 4 cards, equal grid `repeat(4, 1fr)` ≥1024px, `repeat(2, 1fr)` 640–1023px, `repeat(1, 1fr)` below 640px.
- Activity Graph: existing component, ID assigned.
- Discord panel: existing component, ID assigned; ensure CSS is present (it was missing per spec §6.1).

### 3.2 Work (`src/components/Surfaces/Work.tsx`)

IA:
- Primary: 5-lane board.
- Secondary: filter bar.
- Hidden (Phase 3): bulk-action bar (no-op now).

Component composition:
- `<WorkFilterBar />` — owner + status filters (existing, extract to `src/components/WorkFilterBar.tsx`).
- `<WorkCardBoard laneId="...">` — each card is `<WorkCard>` (new primitive).
- `<WorkCardDrawer>` — existing, gains focus trap + focus return.

Lane model: 5 lanes, IDs/titles match `WorkCardStatus`. Grid: `grid-template-columns: repeat(5, minmax(150px, 1fr))` ≥1024px, `repeat(3, 1fr)` 768–1023px, single column below 768 (lanes stack vertically). Drag-and-drop is Phase 4; the `laneId` field is present on every card from day one.

Status pill taxonomy:
- Card status → tone: `pending` = neutral, `in_progress` = info, `blocked` = warning, `review` = accent, `done` = success, `cancelled` = neutral.
- Owner presence uses avatar only, no pill.

Empty / loading / error states:
- Loading: skeleton card per lane (3 skeletons, stacked, fade-in on mount).
- Empty lane: `<EmptyState title="Lane is empty" />` with no action (lane self-explanatory).
- Drawer loading: inline `<Spinner />` next to header.

Work Card Drawer (focus trap):
- On open: capture `document.activeElement` (the trigger card).
- Trap Tab inside drawer: first focusable on open, last focusable wraps to first on Tab, Shift+Tab wraps to last.
- On close (Escape or close button): restore focus to captured element.
- Inline edit on Owner + Schedule + Status fields. Other fields read-only. Phase 2 ships the focus trap; Phase 3 wires inline edit.

Data display per card (top to bottom):
1. Title (2-line ellipsis).
2. Subtitle (optional, 1-line ellipsis).
3. Status pill (right of title row).
4. Owner avatar + name (left of footer row).
5. Due date (right of footer row, relative time).
6. Priority indicator (small dot, color-coded: low = neutral, normal = info, high = warning, critical = danger).

### 3.3 Missions (`src/components/Surfaces/Missions.tsx`)

IA:
- Primary: mission board lanes.
- Secondary: filter bar (owner + priority).

Component composition:
- `<MissionFilterBar />` — owner select + priority select.
- `<MissionBoard />` — lanes grid + cards.

Lane grid: shared `lanes` grid via CSS variable `--mission-grid-cols`. Breakpoints:
- ≥1024px: `repeat(5, 1fr)`.
- 768–1023px: `repeat(3, 1fr)`.
- Below 768: vertical stack (`grid-template-columns: 1fr`).

Card composition: `<Panel>` primitive with title (mission name), eyebrow (mission owner), `StatusPill` (mission status).

Status pill taxonomy:
- `planning` = neutral, `active` = info, `blocked` = warning, `completed` = success, `archived` = neutral.

Empty / loading / error states:
- Loading: 3 skeletons per lane (staggered by 80ms each).
- Empty (no missions match filter): `<EmptyState title="No missions match" description="Try clearing the filters" action={{ label: "Clear filters", onClick: clearFilters }} />`.
- Empty (no missions at all): `<EmptyState title="No missions yet" description="Create a mission to start tracking work" icon={<Target />} />`.

Data display per mission card:
1. Title.
2. Owner (eyebrow).
3. StatusPill (top right).
4. Priority indicator (small dot, color per Work priority).
5. Sub-mission count (e.g. "3 work items") in muted hint text.

### 3.4 Operations (`src/components/Surfaces/Operations.tsx`)

IA:
- Primary: Safety Boundary (always visible at top).
- Secondary: Safety & Readiness disclosure (open by default), Agent Orchestration card, Audit Trail.
- Tertiary: other disclosures.

Component composition:
- `<SafetyBoundary />` (existing, top of page).
- Disclosure components wrapped in `<Panel>`.
- `<AgentOrchestrationCard />` — Requests / Runs / Artifacts tabs inside one card.
- `<ScrollableTable>` for Audit Trail (last 20 events + "Show older" footer link).

Tab order inside Agent Orchestration: Requests (default) → Runs → Artifacts. Tab buttons are a `<div role="tablist">`; each tab panel gets `role="tabpanel" aria-labelledby=...`. Keyboard: ArrowLeft/Right moves between tabs, Home/End jumps to first/last.

Form primitive: `<Form>` wraps proposal forms. Structure:
```jsx
<Form onSubmit={...}>
  <FormField label="..." hint="..." error={...}>
    <Input ... />
  </FormField>
  <FormActions>
    <Button variant="ghost">Cancel</Button>
    <Button variant="primary" type="submit">Apply</Button>
  </FormActions>
</Form>
```

Phase 2 ships the `Form` + `FormField` + `FormActions` components (place under `src/components/Forms/`).

Audit Trail table columns:
1. Timestamp (relative).
2. Actor (avatar + name).
3. Action (text).
4. Surface (text).
5. Result (`StatusPill`: success = green, failure = red).

Capped at 20 rows; footer renders `<a href="#" onClick={placeholder}>Show older</a>` (placeholder, full audit view is post-v2).

Status pill taxonomy:
- Safety Boundary status: green/amber/red `StatusPill`.
- Audit row Result: success/danger `StatusPill`.
- Form submission status: replaced by `ToastHost` (no more inline statusLine).

Empty / loading / error states:
- Audit Trail empty: `<EmptyState title="No audit events yet" />`.
- Loading: 5 skeleton rows.
- Error: `Toast` + `<EmptyState title="Audit unavailable" action={{ label: "Retry", onClick }} />`.

### 3.5 Approvals (`src/components/Surfaces/Approvals.tsx`)

IA:
- Primary: pending list.
- Secondary: filter (pending by default, "Show resolved" toggle).
- Hidden: resolved stack (revealed when toggle on).

Component composition:
- `<ApprovalsFilterBar />` — "Show resolved" toggle.
- `<ApprovalsList>` — list of approval cards. Each card has Approve + Reject buttons.
- `<RecentlyResolvedStack />` (revealed when toggle on).

Each approval card layout:
1. Requester (avatar + name).
2. Action requested (text).
3. Timestamp (relative).
4. Reason (if provided by requester, muted text).
5. Approve button (primary).
6. Reject button (danger).
7. Audit invariant tooltip: small help icon next to section header with text "Every resolve writes one immutable audit entry; no cascading writes."

Phase 2 scope (what to implement):
- Convert `<p className="statusLine">` to `ToastHost`.
- Cards use `Panel` primitive.
- Empty state on no pending.
- "Show resolved" toggle works (resolved stack renders).

Phase 3 scope (DO NOT IMPLEMENT in Phase 2):
- Bulk select checkbox column + sticky action bar.
- `j`/`k`/`a`/`r`/`?` keyboard shortcuts.
- Per-surface live-region announcement on new pending.

Status pill taxonomy: each card shows a `StatusPill` for the request type: success (info), warning (review), danger (block), neutral (other).

Empty / loading / error states:
- No pending + no resolved: `<EmptyState title="All caught up" description="No approvals waiting" icon={<CheckCircle />} />`.
- No pending + resolved exist: filtered empty — show only the resolved stack; no empty state for pending.
- Loading: 3 skeleton cards.
- Error: `<EmptyState title="Couldn't load approvals" action={{ label: "Retry", onClick }} />` + error toast.

Data display per card (top to bottom):
1. Type pill.
2. Requester row.
3. Action text (1-line ellipsis, "see more" inline — Phase 3).
4. Reason (if any, muted).
5. Timestamp (right-aligned, relative).
6. Action buttons row (right-aligned).

### 3.6 Cron (`src/components/Surfaces/Cron.tsx`)

IA:
- Primary: cron job list.
- Secondary: edit form (modal or inline panel).
- Hidden (Phase 3): destructive-action toasts.

Component composition:
- `<CronList />` — table or list of cron jobs.
- `<CronEditForm />` — modal with `Form` primitive.

Per-row additions (new in Phase 2):
- "Last fired" column: relative time.
- "Last status" column: `StatusPill` (success / warning / danger / neutral).
- "Enabled" column: `StatusPill` (success when enabled, neutral when paused).

Status pill taxonomy:
- Last status: success = last run OK, warning = last run partial, danger = last run failed, neutral = never run.
- Enabled: success = enabled, neutral = paused.

Edit form additions:
- "Next 3 firings" preview block: rendered below the schedule field, computed client-side. Spec allows either no-dep cron-parser util or shipping `cron-parser`. **Phase 2 ships a minimal no-dep parser** (5-field and 6-field cron, only the cases needed for the existing schedules); Phase 3 may swap in `cron-parser` if schedules get exotic. Parser lives at `src/lib/cronPreview.ts`.
- Inline validation:
  - Schedule must be 5 or 6 whitespace-separated fields.
  - Skills must be comma-separated identifiers (no spaces in identifiers).
  - Provider + model are paired: either both filled or both empty. Validate on blur.

Empty / loading / error states:
- No jobs: `<EmptyState title="No cron jobs" description="Schedule recurring work" action={{ label: "New cron job", onClick }} />`.
- Loading: 5 skeleton rows.
- Error: error toast + `<EmptyState title="Couldn't load cron jobs" action={{ label: "Retry", onClick }} />`.

Phase 3 scope (DO NOT IMPLEMENT):
- Toast undo on delete/pause/resume.
- Live-region announcement on cron fire.

Data display per row (left to right):
1. Job name (text).
2. Schedule (monospace, muted).
3. Enabled pill.
4. Last fired (relative).
5. Last status pill.
6. Actions (Edit / Pause-Resume / Delete).

### 3.7 Subagents (`src/components/Surfaces/Subagents.tsx`) — NEW SURFACE

Promoted from `src/pages/SubagentDashboard.tsx`. Full surface spec below — this is the biggest Phase 2 deliverable.

#### 3.7.1 IA
- Primary: cost/usage stat row (4 tiles) — placed at the very top of the surface.
- Secondary: profile × role × wrapper × skills × missions grid.
- Tertiary: filter bar (search + role + wrapper availability).

#### 3.7.2 Cost/usage stat row — DETAILED

Four `<Stat>` tiles in a 4-up grid. Data source: `snapshot.subagentsStats` from the existing `/api/snapshot` endpoint (snapshot regenerated by `scripts/generate-snapshot.mjs` on build).

Tiles:

1. **Tokens today**
   - `value` = sum of `tokens_in + tokens_out` across all profiles for the current 24h window, formatted with thousands separator (e.g. `1,234,567`).
   - `unit` = "tokens".
   - `hint` = "across N profiles" (N = count of profiles with non-zero tokens today).
   - No tooltip.
   - Fallback: if `snapshot.subagentsStats.tokensToday` is missing → render `--` + tooltip "rate unavailable".

2. **Cost today ($)**
   - `value` = `snapshot.subagentsStats.costToday`, formatted as `$X.XX`.
   - `unit` = "$" — but spec uses `$` prefix on the value itself, so `unit` is empty; the prefix lives in the formatted value.
   - `hint` = "since 00:00 UTC" (or local equivalent — use local).
   - `tooltip` = "Sourced from server-derived snapshot. Updated on build." (Phase 2 ships this static tooltip; Phase 3 may expand.)
   - **CRITICAL: do NOT compute rate × tokens client-side.** Read the value from the snapshot.
   - Fallback: if `snapshot.subagentsStats.costToday` is missing or `null` → render `--` + tooltip "rate unavailable" via `aria-describedby`. The tooltip element must be focusable so keyboard users can read it.

3. **Active runs**
   - `value` = count of currently running profiles/agents (status `active` OR `throttled`).
   - `unit` = undefined (just a count).
   - `hint` = "profiles currently running".
   - Fallback: `--` + same tooltip.

4. **Last wrapper sync**
   - `value` = relative time of last successful wrapper availability sync (e.g. "3m ago").
   - `unit` = undefined.
   - `hint` = "wrapper availability".
   - Fallback: `--` + same tooltip.

Visual:
- 4 tiles in `grid-template-columns: repeat(4, 1fr)` ≥1024px, `repeat(2, 1fr)` 640–1023px, single column below 640.
- Each tile = `<Stat>` primitive.
- Loading: each tile renders `<Skeleton height={48} />` with the label above (skeleton label = muted uppercase placeholder).
- Empty snapshot stats: all four tiles render `--` with the "rate unavailable" tooltip.
- Populated snapshot: all four render real numbers.

Phase 3 (DO NOT IMPLEMENT now): per-surface live-region announcement on >10% cost change.

#### 3.7.3 Wrapper availability filter — DETAILED

Filter state persists to `localStorage.stronghold.subagents.wrapperFilter`.

Storage:
- Key: `localStorage.stronghold.subagents.wrapperFilter`.
- Allowed values: `'all'` | `'available'` | `'busy'`. Anything else (including `null`, missing key, JSON parse error) falls back to `'all'` on read.
- Written on filter change.
- Read on Subagents mount.
- Only the Subagents surface reads/writes this key. Other surfaces never touch it.
- Value does NOT survive a logout (no logout today — non-issue in Phase 2).
- Prefix `stronghold.*` matches the theme's namespace.

Implementation:
```ts
const KEY = 'stronghold.subagents.wrapperFilter';
type Filter = 'all' | 'available' | 'busy';
function readFilter(): Filter {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'all' || v === 'available' || v === 'busy') return v;
  } catch {}
  return 'all';
}
function writeFilter(f: Filter) {
  try { localStorage.setItem(KEY, f); } catch {}
}
```

Wrap reads/writes in try/catch (private mode, quota errors).

#### 3.7.4 Search + role filter

Existing search and role filter stay. Add the wrapper availability filter alongside. Filter bar layout: search (flex 1) + role select + wrapper availability select, gap 12px.

#### 3.7.5 Profile × role × wrapper × skills × missions grid

Existing grid renders below the stat row. Card composition: `<Panel>` primitive with title (profile name), eyebrow (role), `StatusPill` for wrapper status (success = available, warning = throttled, danger = unavailable, neutral = unknown).

Status pill taxonomy on profile cards:
- `available` = success.
- `throttled` = warning.
- `unavailable` = danger.
- `unknown` = neutral.

Empty state: `<EmptyState title="No profiles match" description="Try clearing the filter" action={{ label: "Clear filter", onClick: clearFilters }} />`.

Loading: 6 skeleton cards in the grid.

Error: error toast + `<EmptyState title="Couldn't load subagents" action={{ label: "Retry", onClick }} />`.

#### 3.7.6 Live heartbeat (placeholder for Phase 3)

Spec §6.7 mentions "live heartbeat" but the component detail belongs to Phase 3 (per-surface announcement is Phase 3 scope). Phase 2 keeps the existing snapshot-based refresh; do NOT add a new polling interval for Subagents. The snapshot loader already feeds Subagents; no second timer.

---

## 4. Files Clix will touch

### New files (creation)

`src/components/Shell/`:
- `AppShell.tsx`
- `Header.tsx`
- `DashboardSubNav.tsx`
- `LiveRegionProvider.tsx`
- `ToastHost.tsx`

`src/components/Surfaces/`:
- `Dashboard.tsx`
- `Work.tsx`
- `Missions.tsx`
- `Operations.tsx`
- `Approvals.tsx`
- `Cron.tsx`
- `Subagents.tsx`

`src/components/Cards/`:
- `Panel.tsx`
- `Stat.tsx`
- `WorkCard.tsx`
- `AgenticOsCard.tsx`

`src/components/Tables/`:
- `ScrollableTable.tsx`

`src/components/Feedback/`:
- `StatusPill.tsx`
- `EmptyState.tsx`
- `Skeleton.tsx`
- `Spinner.tsx`

`src/components/Controls/`:
- `Toast.tsx`

`src/components/Forms/`:
- `Form.tsx`
- `FormField.tsx`
- `FormActions.tsx`

`src/lib/`:
- `cronPreview.ts` (no-dep cron next-firing calculator)

### Modified files (extraction + wiring)

- `src/App.tsx` — delete or convert to AppShell barrel; routes resolve to `<AppShell><Surface ... /></AppShell>`.
- `src/components/Sidebar.tsx` — add Subagents to `SURFACES` between Missions and Operations.
- `src/components/MissionBoard.tsx` — adopt new lane grid (`--mission-grid-cols`), filter bar, EmptyState.
- `src/components/WorkCardBoard.tsx` — replace inline card markup with `<WorkCard>`, render inside `<Panel>` for column header.
- `src/components/WorkCardDrawer.tsx` — add focus trap + focus return on close. Do NOT change visual structure.
- `src/components/DashboardSubNav.tsx` — wire anchor IDs via `document.getElementById`, IntersectionObserver for active state.
- `src/components/Hero.tsx` — assign `id="section-hero"`, subtitle visibility logic.
- `src/components/DiscordCoordinationPanel.tsx` — assign `id="section-coordination"`, ensure CSS is present (was missing per §6.1).
- `src/components/ActivityGraphPanel.tsx` — assign `id="section-routing"`.
- `src/components/MemoryStatusPanel.tsx` — assign `id="section-memory"`.
- `src/components/CronManager.tsx` — add per-row Last fired + Last status pill + Enabled pill; replace statusLine with Toast; integrate cronPreview preview.
- `src/components/Operations.tsx` — wrap proposal forms in Form primitive; add Requests/Runs/Artifacts tabs; cap Audit Trail at 20 with footer placeholder; replace statusLine with Toast.
- `src/components/Approvals.tsx` — replace statusLine with Toast; switch cards to Panel; empty state.
- `src/pages/SubagentDashboard.tsx` — move to `src/components/Surfaces/Subagents.tsx`; add cost/usage row; wire localStorage wrapper filter.
- `src/styles.css` — add: `--color-surface-skeleton` (if missing), `@keyframes skeleton-shimmer`, `.sr-only` utility, `@media print` block (Phase 4 but placeholder marker), `--shadow-card`, `--shadow-card-elevated`, `--text-eyebrow`, `--text-stat`, `--text-hint`. Verify all `--color-*` tokens used by StatusPill exist.

### Deleted (only after verification)

- `src/pages/SubagentDashboard.tsx` — only after `Surfaces/Subagents.tsx` is wired and tested.
- `src/components/WorkCardFeed.tsx` — only after `WorkCardBoard` is wired to `<WorkCard>` and tested (per §9 constraint).

---

## 5. Cost/usage tile data flow

```
build pipeline:
  scripts/generate-snapshot.mjs
    → derives cost from usage logs (server-side)
    → writes snapshot.json with subagentsStats.costToday, .tokensToday, etc.

runtime:
  AppShell mounts
    → snapshot loader fetches /api/snapshot
    → reads snapshot.subagentsStats
    → Subagents surface receives snapshot prop
    → StatRow reads snapshot.subagentsStats.{costToday,tokensToday,activeRuns,lastWrapperSyncAt}
    → renders <Stat> tiles
    → if any field missing → "--" + tooltip "rate unavailable"
    → if all fields missing → all 4 tiles "--"
```

Snapshot regeneration happens on build (not on demand). If the build pipeline hasn't run, the snapshot may have stale or missing fields — fallback handling is mandatory.

Tile DOES NOT compute `cost = rate × tokens` client-side. Phase 2 explicitly defers this to the snapshot. If the snapshot field is missing in a populated snapshot, file a Phase 3 bug — do NOT add client-side math.

---

## 6. Status pill tone → token mapping (canonical reference)

| Tone | Token (border + text) | Token (background) | Used for |
|------|----------------------|--------------------|----------|
| success | `--color-success` | `--color-success-bg` | cron enabled, last OK, wrapper available, mission done |
| warning | `--color-warning` | `--color-warning-bg` | cron last warning, wrapper throttled, mission blocked, work card blocked |
| danger | `--color-danger` | `--color-danger-bg` | cron last failed, wrapper unavailable, mission failed, work card critical |
| neutral | `--color-text-muted` | `--color-surface-subtle` | cron paused, idle, never-run, planning |
| info | `--color-info` | `--color-info-bg` | work card in progress, mission active |
| accent | `--color-accent` | `--color-accent-bg` | work card review, primary subagent tag |

All six tones MUST exist in the token system. If `--color-info`, `--color-info-bg`, `--color-accent`, `--color-accent-bg` are missing, flag and add to Phase 1 token overhaul.

---

## 7. Phase 2 "Done when" gates (testable)

These are greppable / screenshot-able / testable criteria.

### 7.1 Structural gates

- `find src/components/Surfaces -name "*.tsx"` returns 7 files: `Dashboard.tsx`, `Work.tsx`, `Missions.tsx`, `Operations.tsx`, `Approvals.tsx`, `Cron.tsx`, `Subagents.tsx`.
- `find src/components/Cards -name "*.tsx"` returns 4 files: `Panel.tsx`, `Stat.tsx`, `WorkCard.tsx`, `AgenticOsCard.tsx`.
- `find src/components/Feedback -name "*.tsx"` returns 4 files: `EmptyState.tsx`, `Skeleton.tsx`, `StatusPill.tsx`, `Spinner.tsx`.
- `grep -r "statusLine" src/` returns 0 matches after Phase 2.
- `grep -r "rgba(" src/components/` returns 0 matches outside `src/styles.css` token definitions.
- `grep -r "raw hex" src/components/ --include="*.tsx" --include="*.ts" | grep -E "#[0-9a-fA-F]{3,8}"` returns 0 matches.

### 7.2 Behavior gates

- Subagents is reachable from Sidebar (click navigates).
- Cost/usage stat row renders 4 tiles on Subagents. Against a populated snapshot, all 4 tiles show real numbers. With API returning empty stats, all 4 show `--` and "rate unavailable" tooltip is keyboard-reachable.
- "Cost today ($)" tile shows `$X.XX` format in both light and dark themes (Tusk screenshots).
- Wrapper availability filter persists across navigations (select "Available", navigate to Dashboard, navigate back — selection still "Available"). Persists across app restart (reload page).
- `localStorage.stronghold.subagents.wrapperFilter` is the only key touched; no other surface writes that key.
- Work Card Drawer: Tab cycles inside drawer, Escape closes it, focus returns to the trigger card.
- Dashboard sub-nav anchors: clicking each nav item scrolls to its section; URL hash updates (or section becomes active in nav via IntersectionObserver).
- Mission Board: lanes stack vertically below 768px, 3 cols at 768–1023px, 5 cols ≥1024px.

### 7.3 Accessibility gates

- Lighthouse accessibility ≥ 95 on every surface (Dashboard, Work, Missions, Operations, Approvals, Cron, Subagents).
- axe-core: zero violations on every surface.
- Focus rings visible on every interactive element at viewports 320, 640, 768, 1024, 1440.
- Empty states announce via SR (role + aria-label).

### 7.4 Visual gates (Tusk)

- Light + dark themes: every status tone renders with sufficient contrast (WCAG AA 4.5:1 for normal text, 3:1 for large text).
- `Skeleton` shimmer animation respects `prefers-reduced-motion: reduce`.
- Toast positions render correctly; toast text doesn't overflow on small viewports.

### 7.5 Screenshot gates

Tusk captures the following (both themes):
- Dashboard with all 6 sections visible (or as much as fits in viewport).
- Work Board with mixed-status cards.
- Mission Board with at least one mission in each lane.
- Operations with Safety & Readiness open.
- Approvals with pending + resolved stack.
- Cron with at least one job in each enabled/paused state.
- Subagents with cost/usage row populated.

---

## 8. Risks / things to flag

1. **Token coverage** — `StatusPill` uses 6 tones. If the token system has only `success` / `warning` / `danger` / `neutral` from Phase 1, Phase 2 needs `info` and `accent` added. Confirm with Igris before starting StatusPill.
2. **`cronPreview.ts` parser scope** — Spec allows shipping `cron-parser` if no-dep is too gnarly. Recommend starting no-dep (handles 5-field + 6-field with `*`, `,`, `-`, `/`, and `?` for day-of-week). If a real cron schedule breaks (e.g. `@yearly` macro, `L` modifier), file a bug and add `cron-parser` in a follow-up.
3. **Subagents page → Surface rename** — The existing route name in `App.tsx` may be `'subagentDashboard'`. The surface ID is `'subagents'`. Update the route map and any links.
4. **Snapshot path** — `/api/snapshot` may or may not currently include `subagentsStats`. Verify the existing snapshot loader; if the field is missing, Phase 2 must add it (server change is a coordination point with Igris — flag, don't silently skip).
5. **WorkCard `laneId`** — Required from day one but no drag-and-drop yet. Verify the existing data model: if `laneId` is implicit (derived from `status`), add an explicit field with a migration shim that defaults it from `status`.
6. **Print stylesheet** — Phase 4 owns `@media print`. Phase 2 leaves a comment marker in `src/styles.css` so Phase 4 knows where the block goes; do NOT implement the block now.

---

## 9. Build order (suggested for Clix)

1. Build primitives first: `Panel`, `Stat`, `StatusPill`, `EmptyState`, `Skeleton`, `Spinner`, `ScrollableTable`, `WorkCard`, `AgenticOsCard`, `Toast`, `ToastHost`, `Form`, `FormField`, `FormActions`. Snapshot tests for each.
2. Build shell: `AppShell`, `Header`, `Sidebar` (add Subagents), `DashboardSubNav` (anchor wiring), `LiveRegionProvider` (stub).
3. Extract surfaces: `Dashboard`, `Work`, `Missions`, `Operations`, `Approvals`, `Cron`.
4. Wire `Dashboard` to existing in-page components with new IDs.
5. Build `Subagents` surface (NEW): move page → surface, add cost/usage row, wire localStorage wrapper filter.
6. Convert `<p className="statusLine">` call sites to `ToastHost`.
7. Wire `WorkCardDrawer` focus trap + return focus.
8. Wire `MissionBoard` lane grid + filter bar + empty state.
9. Wire `CronManager` per-row pills + cronPreview + inline validation.
10. Wire `Operations` Form primitive + tabs + audit table cap.
11. Wire `Approvals` empty state + Panel cards.
12. Cleanup: remove `WorkCardFeed.tsx` and `SubagentDashboard.tsx` after verification.

---

## 10. Out of scope (do NOT implement in Phase 2)

- Drag-and-drop on Work Board (Phase 4).
- Bulk select on Work Board and Approvals (Phase 3).
- Keyboard shortcuts on Approvals (Phase 3).
- Toast undo on Cron delete / Approvals reject / Work bulk move (Phase 3).
- Per-surface live-region announcements (Phase 3).
- Print stylesheet (Phase 4).
- Inline edit on Work Card Drawer fields (Phase 3) — focus trap ships in Phase 2; edit UI ships later.
- "See more" toggle on long Work Card titles (Phase 3) — Phase 2 ships 2-line ellipsis only.
- Long-title expand in-place (Phase 3).

---

## 11. Handoff

This brief is what Clix implements against. Tusk uses the "Done when" gates in §7. Igris reviews this brief before Clix starts; any deviation needs Igris sign-off.

Files referenced in this brief:
- Spec: `docs/design/DESIGN-v2.md` §6, §7-Phase2, §9-Phase2, §10-Phase2.
- This brief: `docs/design/PHASE-2-BRIEF.md`.

End of brief.