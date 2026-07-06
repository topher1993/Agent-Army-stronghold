---
version: v2.1 (Phase 0 discovery + design — Tusk YELLOW addressed)
name: Stronghold Dashboard Overhaul — DESIGN-v2
status: v2.1 patch complete, pending Igris re-review and Tusk re-QC
previous-version: v2 (held YELLOW verdict on 2026-07-06; 11 P1 + 5 P2 issues all closed in v2.1)
audited-on: 2026-07-06 (audit claims 9/9 verified by Tusk)
patched-on: 2026-07-06
patched-by: Lyra (design only — no code changed)
audit-scope: Stronghold dashboard (`src/App.tsx`, `src/components/*`, `src/pages/*`, `src/styles.css`, `index.html`)
replaces: docs/design/DESIGN.md (kept as historical / Phase 47 spec — do NOT delete)
---

# Stronghold Dashboard Overhaul — DESIGN-v2

## 0. How to read this doc

This is the Phase 0 discovery audit plus the v2 design contract for the Stronghold
dashboard overhaul. Section 1 is the honest audit. Sections 2–8 are the v2 spec
that Clix implements and Tusk QC's. Section 9 is the Clix implementation brief.
Section 10 is the Tusk QC brief. Section 11 lists trade-offs / open questions.

Lyra owns this doc. Clix implements. Tusk reviews. Igris commits.

If a section says "we ship" it means: keep what is currently working. If it says
"we rebuild" it means: replace the current implementation with the v2 contract
in this doc. If it says "v2 net-new" it means: introduce behavior that does not
exist today.

---

## 1. Discovery audit

### 1.1 What's working today

Surfaces we keep as-is or polish in place:

- **App shell layout (`src/App.tsx` + `src/components/Sidebar.tsx`)**: persistent
  left sidebar (244px expanded / 60px collapsed), mobile hamburger at <720px,
  hamburger-driven slide-in drawer with backdrop, focus returning to the
  trigger on close. The shell is sound; Phase 47 added this without breaking
  the previous layout.
- **Hero (`src/components/Hero.tsx`)**: title block + GUARDED ribbon +
  refresh button + 5-up meta strip (Owner / Coordinator / Backend / Kill Switch
  / Generated). Clean, scannable, gets the four operator signals in one
  viewport.
- **Agentic OS dashboard panel (`src/components/AgenticOsDashboardPanel.tsx`)**:
  4-up hero stats (TESTS / BUILD / AUDIT / CRON), QC sparkline (7-round
  polyline), two-column "Open Work Items" + "Activity table". Status pills are
  consistent (`.status.live`, `.status.warn`, `.status.placeholder`). Live
  status pill + Recheck button up top.
- **Work Card Board (`src/components/WorkCardBoard.tsx`)**: 5-lane kanban
  (planned / active / blocked / review / complete), owner + risk filters,
  horizontal scroll on narrow viewports, click-to-open detail drawer.
  Filtering and grouping are pure functions, unit-testable.
- **Work Card Drawer (`src/components/WorkCardDrawer.tsx`)**: read-only
  frontmatter view, Escape-to-close, full-screen mobile sheet (drawer becomes
  `100vw` via the `.workCardDrawerBackdrop` flex centering at <720px).
- **Approval Queue (`src/components/ApprovalQueue.tsx`)**: pending → approve /
  reject with optional reason textarea, optimistic disable + spinner,
  resolved banner, "Recently resolved" stack. Audit-log only.
- **Cron Manager (`src/components/CronManager.tsx`)**: live list from
  `/api/cron`, snapshot fallback when offline, pause/resume/edit/delete with
  confirm step, create + edit forms. Same optimistic-with-toast pattern as
  approvals.
- **Activity Graph panel (`src/components/ActivityGraphPanel.tsx`)**: SVG
  hand-off graph (Belion top / Igris middle / specialists bottom), edge
  pulse animation for edges <1h, window selector (1h / 6h / 24h / 168h),
  self-contained polling.
- **Subagent Dashboard (`src/pages/SubagentDashboard.tsx`)**: search +
  role filter, joined view of profiles × roster × missions, accessible
  card grid.

### 1.2 What's broken (must fix in v2)

These are real defects in the current implementation, ordered by impact:

1. **Theme toggle is functionally inert.** `ThemeToggle.tsx` writes
   `data-theme="light|dark"` to `<html>` and sets `colorScheme`. A grep for
   `data-theme=` in `src/styles.css` returns zero hits. There is no
   `[data-theme="light"]` or `[data-theme="dark"]` selector anywhere in the
   cascade. The toggle button looks like it works; it does not. The user
   cannot reach a light theme in the running app.

2. **Remote font (Inter via Google Fonts) in `index.html`.** The current
   `<head>` does:
   `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;510;590;600&display=swap" rel="stylesheet" />`.
   This (a) violates the no-remote-font rule the existing DESIGN.md calls out,
   (b) blocks first paint on network, (c) makes the bundle non-deterministic.
   The DESIGN.md system-font fallback already specifies
   `--font-sans 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`
   which is what the cascade falls back to anyway.

3. **No theme-init script before first paint.** The DESIGN.md spec explicitly
   requires the inline script in `<head>` that reads `localStorage` /
   `prefers-color-scheme` and sets `data-theme` before the stylesheet loads.
   It is missing. As a result, even when we fix issue (1) above, light-mode
   users will see a flash of dark.

4. **`index.html` hard-codes `<meta name="color-scheme" content="dark" />`.**
   That tells the browser to render native form controls and scrollbars in
   dark regardless of theme. Must become conditional on theme.

5. **DashboardSubNav anchors are 5/6 dead links.** `DashboardSubNav.tsx`
   exports anchor IDs `section-hero`, `section-health`, `section-work`,
   `section-coordination`, `section-routing`, `section-memory`. A grep of the
   codebase for those `id=` attributes finds only `section-work` (in
   `WorkCardBoard.tsx`). The other five buttons call `scrollIntoView` on a
   `null` target — silent failure. The user clicks "Coordination" and
   nothing happens.

6. **`DiscordCoordinationPanel` has zero CSS.** The component renders with
   classes `discordCoordinationList`, `discordCoordinationCard`,
   `discordCoordinationHeader`, `discordCoordinationContent`,
   `discordCoordinationAuthor`, `discordCoordinationBotBadge`,
   `discordCoordinationTime`, `discordCoordinationToggle`. None of these
   exist in `src/styles.css`. The panel renders as a bare `<ol>` of `<li>`s
   with no padding, no spacing, no message-meta styling — visually broken on
   the dashboard surface.

7. **Parallel token namespaces in active use today.**
   `src/pages/SubagentDashboard.css` reads `--color-canvas`, `--color-surface`,
   `--color-surface-elevated`, `--color-border`, `--color-border-subtle`,
   `--color-text-tertiary`, `--color-accent-text`, `--color-accent-bg`,
   `--space-2`, `--space-3`, `--space-4`, `--shadow-card`, `--radius-sm`,
   `--radius-lg`, `--text-micro`. None of these are defined in
   `src/styles.css`; they exist only in `docs/design/DESIGN.md` (the proposed
   spec, never implemented). The main stylesheet instead uses `--bg-canvas`,
   `--bg-panel`, `--bg-elevated`, `--bg-hover`, `--text-primary`,
   `--text-secondary`, `--accent`, `--accent-bg`. Two systems, neither
   complete, neither documented in the same place.

8. **Hero subtitle and read-only badge hidden at <980px without sr-only
   fallback.** `@media (max-width: 980px) { .subtitle { display: none; } }`.
   Screen-reader users on a narrow viewport lose the description of the
   dashboard entirely. Same for `.readOnlyBadge` (now `.heroGuarded`).

9. **`Recheck` button calls `window.location.reload()`.** This is a full
   page reload — it wipes scroll position, blows away the user's place on
   the dashboard, and forces a re-fetch of the snapshot from disk. The
   user expectation for a "Recheck" affordance on a live data panel is a
   soft refresh, not a hard reload.

10. **`MissionBoard` lanes use `repeat(5, minmax(150px, 1fr))` with no
    breakpoint below 720px and no scroll affordance above.** At ~768–980px
    the five lanes get ~150–170px each, which is below readable width for
    mission cards. The board does not collapse to a single column until
    <720px (mobile floor) — there is no "tablet" state.

11. **Work Card Drawer lacks focus trap.** It has Escape-to-close and
    `aria-modal="true"` but no focus is moved into the drawer on open, no
    Tab is trapped inside, and focus is not returned to the trigger card
    on close. Keyboard-only users land on `<body>` after close.

12. **Cron Manager form fields have no client-side validation surface.**
    Required fields rely on native HTML `required` + `minLength`. The
    server enforces schedule syntax and skill allowlist; the user sees the
    error only after submit. No inline error UI, no schedule preview, no
    "next 3 firings" hint.

13. **Activity table is hard-capped to 5 rows with no "show more" link.**
    Recent activity is sliced to 5 with no drill-down surface. Users
    searching for older entries have nowhere to go.

14. **Sidebar status dot uses a CSS `@keyframes sidebarPulse` infinite
    animation.** Reduced-motion users will still see the pulse unless we
    guard the keyframe with `@media (prefers-reduced-motion: no-preference)`.
    The DESIGN.md spec requires the reduced-motion reset to kill infinite
    animations, but the current keyframe runs unchecked.

15. **No keyboard shortcut surface.** No `/` to focus search, no `g d` /
    `g w` to jump surfaces, no `?` to open a shortcut overlay. Power
    users on the approvals queue or cron manager must mouse to every
    button.

16. **Sidebar surfaces list has no Subagents entry.** `pages/SubagentDashboard.tsx`
    exists and is exported, but `Sidebar.tsx`'s `SURFACES` array never
    references it, and `App.tsx`'s `renderSurface` switch has no `subagents`
    case. The subagents view is unreachable from the app shell.

17. **`agenticOsWorkCardTitle` and other titles can clip to a single line
    without a "see more" affordance.** `white-space: nowrap;
    text-overflow: ellipsis;` is applied directly, so titles longer than
    the card width silently truncate.

18. **Cron list uses an external `cronRow` / `cronActions` / `cronSchedule`
    class group that does not reuse the new `.row` / `.actions` / `.muted`
    primitives.** It rebuilds the row layout instead of reusing shared
    atoms — a minor code-smell, but a real source of drift risk.

### 1.3 What's missing (v2 net-new)

- A real, working light theme with full token coverage.
- A keyboard-shortcut overlay (`?` to open).
- Bulk-select + bulk-action on the Work Card Board (checkbox column,
  Shift-click range select, action bar that slides up).
- Drag-to-reorder / drag-between-lanes on the Work Card Board.
- Inline edit on a Work Card (open drawer → click a field → edit → save).
- A real Subagents surface wired into the sidebar.
- An empty-state library (one `EmptyState` component used by every list
  surface: Work, Missions, Approvals, Cron, Activity, Discord).
- A toast surface (`Toast` + `ToastHost` in AppShell) that every
  success/error message routes through. Today, every component has its
  own `<p className="statusLine">` and they drift.
- A loading-state library (`Skeleton`, `SkeletonRow`, `SkeletonCard`).
- A "Last refresh" pill on every live panel (currently the dashboard has
  one; Work, Activity, Discord, Memory each have their own timestamp
  formats).
- A status-pill legend somewhere in the help/footer that maps colors to
  semantic meaning (live / warn / placeholder / danger / accent).

### 1.4 Surface-by-surface audit

#### Dashboard
- **Primary signal (where the eye should land first):** the four
  Agentic OS hero stats (TESTS / BUILD / AUDIT / CRON). These four
  numbers are the operator's morning coffee.
- **Secondary signals (where the eye should land next):** the QC sparkline
  trend line, the three "Open Work Items" cards, the five recent activity
  rows, the Discord coordination feed.
- **Current state:** layout is correct; CSS coverage is complete; theme is
  dark-only.
- **Broken in current state:** subtitle hidden on mobile (a11y), Hero
  Recheck button is a hard reload, sub-nav anchors mostly dead, Discord
  panel unstyled.
- **v2 fix list:** fix theme, fix Recheck, fix sub-nav anchors, style
  Discord, add skeleton loaders for the snapshot fetch, add toast
  surface for the "snapshot unavailable" error path.

#### Work
- **Primary signal:** Work Card Board lanes (5 status columns) with
  click-to-open drawer.
- **Secondary signals:** owner + risk filters; lane counts; status pills;
  risk left-border accent on each card.
- **Current state:** functional, scannable, filters work, drawer works,
  horizontal scroll on narrow viewports.
- **Broken in current state:** no bulk-select, no drag, no inline edit,
  drawer has no focus trap, card title clips without a "see more".
- **v2 fix list:** focus trap in drawer, bulk-select action bar, drag
  affordances (or explicit "no drag yet — coming soon" empty state),
  inline edit on drawer fields, character-count + "see more" on long
  titles.

#### Missions
- **Primary signal:** Mission Board lanes.
- **Current state:** five lanes, native `<details>` per mission, very
  minimal styling. No filter, no sort, no priority ordering.
- **Broken in current state:** 5-column grid breaks at 768–980px tablet
  width. No "no missions" empty state when snapshot has none.
- **v2 fix list:** switch to shared `lanes` grid with a 1024 breakpoint
  collapse; add a filter bar (owner / priority); reuse the shared
  `EmptyState`.

#### Operations
- **Primary signal:** Safety Boundary notice (always-on, top of page) +
  Mission/Task/Work-Card proposal forms (collapsed under disclosures by
  default).
- **Secondary signals:** Audit Trail (last 8 events), Agent Orchestration
  (requests / runs / artifacts), Safety & Readiness, Operator Notes.
- **Current state:** functional; forms work; audit displays; orchestration
  loads requests/runs/artifacts.
- **Broken in current state:** every form is its own `<section class="panel">`
  with its own `<h2>` and submit button. There is no shared form layout,
  no shared validation, no shared "submitting…" spinner. Operator Notes
  is a static `<ul>` — that's fine for now but should be promoted to a
  real onboarding surface or removed.
- **v2 fix list:** wrap operations in a shared form layout; route all
  error/success messages through the toast surface; collapse-by-default
  Safety & Readiness only; remove Operator Notes in favor of an inline
  helper strip.

#### Approvals
- **Primary signal:** pending cards with title + requester + status + two
  buttons.
- **Secondary signals:** "Add reason" inline textarea (collapsed),
  recently-resolved stack (collapsed).
- **Current state:** functional; approve/reject + reason + banner + 409
  conflict handling.
- **Broken in current state:** no keyboard shortcuts (no `a` to approve,
  no `r` to reject with reason); no filter by requester; no bulk-approve.
- **v2 fix list:** keyboard shortcuts (`a`, `r`, `j`/`k` to navigate),
  filter by requester, document the audit-only invariant in a help
  tooltip.

#### Cron
- **Primary signal:** the job list (sorted by name) with per-row
  Pause/Resume/Edit/Delete.
- **Secondary signals:** "+ New" button at top; create/edit form (modal
  inline); per-row confirm-on-delete.
- **Current state:** live list, snapshot fallback, all CRUD, optimistic
  busy states, confirm step on delete.
- **Broken in current state:** no schedule preview ("next 3 firings"),
  no client-side validation, no last-run timestamp, no "enabled/disabled"
  pill (only the Pause/Resume button label hints at state).
- **v2 fix list:** add a "Last fired" + "Last status" pill per row;
  compute and show the next 3 cron firings on edit; add inline validation
  for schedule + skills; promote the enable/disable state to a real pill.

#### Subagents
- **Primary signal:** profile × role × wrapper × skills × missions grid.
- **Secondary signals:** search + role filter, wrapper-availability pill.
- **Current state:** reachable only by direct import — not wired to the
  sidebar.
- **Broken in current state:** not in `SURFACES`, not in
  `renderSurface`, no entry in the App.tsx switch.
- **v2 fix list:** add Subagents to `SURFACES`; add a `subagents` case to
  the switch; promote it to a real surface ID; add an icon; verify the
  sidebar status dot does not break for the new surface.

### 1.5 Visual hierarchy and status semantics

#### Where the eye should go first (per surface)

- **Dashboard:** the four hero stats → the QC sparkline → the Open Work
  Items → the Activity table.
- **Work:** the lane column headers → the risk-left-bordered cards inside.
- **Missions:** the lane column headers → the mission cards.
- **Operations:** the Safety Boundary notice → the first open disclosure.
- **Approvals:** the topmost pending card's title → its two buttons.
- **Cron:** the "+ New" button → the topmost job row's Pause/Resume.
- **Subagents:** the search input → the first card.

#### Status color semantics (token contract)

Today the codebase has these status colors with inconsistent semantics:

- `.status.live` / `.status.ok` / `.status.success` — all map to emerald
  `--success-emerald` (`#10b981`).
- `.status.warn` — yellow `--warn` (`#f7c948`).
- `.status.danger` (used inline) — `#ff8787`.
- `.status.placeholder` — indigo `--accent` (used for empty/awaiting
  states).
- `.status.planned` / `.status.active` / `.status.review` /
  `.status.blocked` / `.status.complete` — mapped inconsistently.

v2 collapse to one semantic set:

- `--color-success-strong` — "everything is fine, this is live, healthy,
  operational". Used for: live pills, ok indicators, success buttons.
- `--color-success` — same family, darker tone for normal text on light
  surfaces.
- `--color-warning` — "needs attention but not blocking". Used for: warn
  pills, find-y badges, paused cron jobs.
- `--color-danger` — "blocking or destructive". Used for: failed tests,
  red risk badges, the Delete button.
- `--color-accent` — "placeholder or accent state". Used for: placeholder
  pills, planned status, primary CTAs.
- `--color-text-tertiary` — "neutral, no signal". Used for: muted text,
  timestamps, secondary metadata.

This collapse is intentional: today every component picks its own color
for "warn" or "ok". After v2, each component picks a token; the tokens
own the color; the components own the meaning.

### 1.6 Interaction gaps

Beyond WCAG AA and the existing keyboard affordances:

- **No bulk operations anywhere.** Approvals queue and Work Card Board
  are the obvious targets.
- **No drag anywhere.** Work Card lanes are visual groupings only; moving
  a card between lanes is not possible. Drag-and-drop is in scope for
  v2 phase 4 (Polish) but the data model needs to be ready for it.
- **No inline edit anywhere.** Opening a work card in the drawer shows
  frontmatter but every field is read-only.
- **No keyboard shortcuts anywhere.** No global `?`, no `/`, no `g d`.
- **No command palette.** Power users cannot type "cron" to jump to the
  Cron surface.
- **No undo on destructive actions.** Deleting a cron job is one click
  past the confirm step; no toast undo.
- **No copy-to-clipboard on IDs.** Work Card IDs, mission IDs, agent
  target names — all need a one-click copy.
- **No density toggle.** Some surfaces (Dashboard hero stats, Activity
  table) beg for a "compact" mode.

### 1.7 Accessibility audit (beyond WCAG AA)

WCAG AA is the floor; we ship the following on top:

- **Visible focus ring everywhere.** Current focus rings are 2px accent
  outline with 2px offset — good. Must survive the v2 token migration.
- **All interactive elements reachable by keyboard.** Today: sidebar
  items, hero refresh, work-card filter selects, work-card cards,
  drawer, approval buttons, cron buttons. Sub-nav links yes. Hero
  Recheck yes. Discord toggle yes. Agent Orchestration buttons yes.
  No surface fails keyboard reachability today, but no surface offers
  shortcuts either.
- **Visible labels on all icon-only buttons.** Theme toggle, sidebar
  collapse, hamburger, drawer close, Recheck — all have `aria-label`.
  Good.
- **No `aria-hidden` on functional elements.** Verified — all `aria-hidden`
  usage is decorative.
- **`prefers-reduced-motion` coverage.** The DESIGN.md spec requires the
  global reset. The current styles.css does not implement it. The
  `sidebarPulse` keyframe runs unchecked; the `activity-edge-pulse`
  keyframe runs unchecked. v2 ships the global reset plus per-keyframe
  guards.
- **Color is not the only signal.** Status pills carry text (`live`,
  `warn`, `placeholder`, `blocked`, etc.) — good. Risk badges carry
  text (`green`, `yellow`, `red`). v2 keeps this rule.
- **Focus trap on modals and drawer.** Work Card Drawer does not trap
  focus. Cron form (when inline) does not trap focus. v2 fixes both.
- **Live-region announcements.** Polling panels (Work Card Board,
  Discord, Activity, Memory, Approvals) update silently. Screen-reader
  users get no "new activity" announcement. v2 adds a polite live region
  on the AppShell that announces "N new items" when data changes.
- **Forced colors / Windows High Contrast.** Current styles use rgba
  borders and translucent backgrounds. v2 adds `@media
  (forced-colors: active)` overrides for borders and pill backgrounds.
- **Touch target sizing.** All buttons hit `min-height: 40px` on mobile
  (from the @media 980px block). On desktop some pill rows are 28–32px
  tall — borderline. v2 enforces `min-height: 32px` on desktop
  interactive elements and `min-height: 44px` on touch.

### 1.8 Information architecture

Where the eye should land first, per surface, is summarized in 1.4.
The architectural decision baked into v2:

- **Sidebar is the only between-surface navigation.** It owns the six
  surfaces (Dashboard / Work / Missions / Operations / Approvals /
  Cron) plus Subagents (v2 net-new).
- **Dashboard sub-nav is in-page only.** Anchor jumps inside the
  Dashboard surface. v2 repairs the dead anchors (1.2 #5) and renames
  them to match what actually exists on the page.
- **Hero is the only persistent header.** It does not repeat on other
  surfaces; it is a Dashboard primitive.
- **Approvals and Cron were promoted out of Operations in Phase 47.**
  They stay promoted. Operations keeps the proposal forms, audit,
  orchestration, safety.
- **Subagents moves from orphan page to first-class surface.** v2 wires
  it in.

---

## 2. v2 Direction

Linear-style minimal: warm gray surfaces, restrained indigo accent,
modern system sans, soft cards, clear hierarchy. Two themes — **light**
and **dark** — sharing one semantic token namespace. No remote fonts.
No JS-driven color decisions before first paint. The dashboard is the
landing surface; the sidebar is the navigation primitive; every other
surface is a peer.

We rebuild the token system, we ship a working theme toggle, we wire
the dead sub-nav anchors, we style the Discord panel, we promote
Subagents to a real surface, and we add the interaction primitives
(bulk, drag-ready data model, inline edit, keyboard shortcuts) in the
order specified in §7.

The design intent of Phase 47 (the previous spec) is preserved: warm
cream light surface, restrained indigo accent, four-up hero stats,
five-lane Work Board, persistent sidebar, drawer for detail, two-column
Dashboard split. We do not redesign from zero — we fix what's broken
and ship the missing primitives.

---

## 3. Token system overhaul

### 3.1 One namespace, no parallel systems

We collapse `--bg-*`, `--text-*`, and the proposed `--color-*` into one
canonical set of semantic tokens. The `SubagentDashboard.css` partial
implementation of `--color-*` is reconciled; the main stylesheet's
`--bg-*` / `--text-*` is renamed; everything reads from the same
namespace.

### 3.2 Token table — light

All values from the existing DESIGN.md Phase 47 spec, kept verbatim
because they cleared WCAG AA in that audit:

```
--color-canvas            #f7f5f1
--color-surface           #fffdfa
--color-surface-elevated  #f1eee8
--color-surface-hover     #ebe6dc
--color-border            #ded8cd
--color-border-subtle     #ebe5da
--color-text              #1f2328
--color-text-muted        #4f5660
--color-text-tertiary     #68707c
--color-text-quaternary   #858c96
--color-accent            #5e6ad2
--color-accent-text       #4a55b8
--color-accent-hover      #4f59c8
--color-accent-bg         #eceeff
--color-success           #0f7a3b
--color-success-strong    #10b981
--color-warning           #94610f
--color-danger            #c2413d
--container-max           1600px
```

Contrast commitments (carried forward from DESIGN.md):
- `--color-text-muted` on `--color-surface-elevated` = 6.40:1 (AA pass).
- `--color-accent-text` on `--color-canvas` = 5.88:1 (required for
  normal accent text).
- `--color-accent` on cream = 4.32:1; UI-only (buttons, borders, icons,
  chips, large text where 3:1 UI/large-text rule applies).
- White on `--color-accent` button fill = 4.70:1.
- `--color-success-strong` for dots, graphs, borders; `--color-success`
  for normal success text in light mode.

### 3.3 Token table — dark

```
--color-canvas            #0d0e10
--color-surface           #151619
--color-surface-elevated  #1d1f23
--color-surface-hover     #28282c
--color-border            rgba(255,255,255,.10)
--color-border-subtle     rgba(255,255,255,.05)
--color-text              #f7f8f8
--color-text-muted        #d0d6e0
--color-text-tertiary     #9aa1ad
--color-text-quaternary   #62666d
--color-accent            #7170ff
--color-accent-text       #b8b6ff
--color-accent-hover      #828fff
--color-accent-bg         rgba(113,112,255,.16)
--color-success           #27a644
--color-success-strong    #10b981
--color-warning           #f7c948
--color-danger            #ff8787
--container-max           1600px
```

### 3.4 Spacing, radii, shadows, type

Carried forward from DESIGN.md, unchanged:

```
--space-1 4px     --space-2 8px     --space-3 12px    --space-4 16px
--space-6 24px    --space-8 32px    --space-12 48px

--radius-sm 4px   --radius-md 8px   --radius-lg 12px  --radius-xl 16px
--radius-pill 9999px

--shadow-card            light: 0 1px 2px rgba(15,23,42,.04), 0 4px 12px rgba(15,23,42,.06)
                        dark:  0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.5)
--shadow-card-elevated   light: 0 2px 4px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.10)
                        dark:  0 2px 4px rgba(0,0,0,.5), 0 16px 48px rgba(0,0,0,.58)

--font-sans   'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif
--font-mono   ui-monospace, SFMono-Regular, Menlo, Consolas, monospace

--text-display   clamp(2rem, 4.5vw, 3rem) / 600 / 1.05 / -0.02em
--text-heading   1.5rem / 600 / 1.75rem
--text-body      1rem / 400 / 1.5
--text-caption   0.875rem / 400 / 1.4
--text-micro     0.75rem / 500 / 1.3
```

#### 3.4.1 Layout tokens

```
--container-max  1600px
```

`--container-max` caps body content width on the 1920px ultra-wide
viewport and centers it (`max-width: var(--container-max); margin:
0 auto;`) so the dashboard does not turn into a single-line ribbon
at 4K. Same value in light and dark — not theme-dependent.

### 3.5 Theme rules

- Use `data-theme="light|dark"` on `document.documentElement`. No
  exceptions.
- Theme init script MUST run in `<head>` before the stylesheet:

```html
<script>
  (function(){
    var t=localStorage.getItem('stronghold.theme');
    var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    var d=t||s;
    document.documentElement.setAttribute('data-theme',d);
    document.documentElement.style.colorScheme=d;
  })();
</script>
```

- CSS variables are defined once on `:root` for light, then overridden
  inside `html[data-theme="dark"]`. Components read tokens; they do not
  read raw values. (Today this is the rule; v2 enforces it.)
  **Clarification for Clix:** `:root` is the light default block. No
  dark-specific values may sit in `:root`. The
  `html[data-theme="dark"]` block must redefine every variable it
  needs to change. Otherwise a `dark` value silently leaks into the
  light theme during the cascade resolve.
- `<meta name="color-scheme">` must be removed or made conditional. v2
  uses the inline script to set `document.documentElement.style.colorScheme`
  instead, so the browser matches the active theme for native controls.
- Theme toggle in the header is the only theme switch. `aria-label`
  reads "Switch to light/dark theme"; `aria-pressed` reflects current
  state. Persists to `localStorage.stronghold.theme`.
- Reduced-motion is strict:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

v2 also wraps infinite-pulse keyframes in
`@media (prefers-reduced-motion: no-preference)` so the animation is
only defined for users who tolerate motion.

### 3.6 Removal of parallel namespaces (HARD RENAME, NO ALIASES)

Per Chris's Phase 0 decision: **hard rename, no dual-namespace shipping
window.** The old `--bg-*` and `--text-*` names are removed in the same
commit that introduces `--color-*`. There is no release where both names
exist. Clix must not ship any `--bg-canvas { --color-canvas: var(--bg-canvas) }`
back-compat aliases. The Phase 1 grep gate (see §9) is
`grep -E '(--bg-|--text-)' src/styles.css` returning **zero hits**, and
that gate is the only "Done when" criterion for the rename — no alias
period of grace, no follow-up cleanup commit, no `// TODO remove later`.

The following tokens are renamed in `src/styles.css`:

| Old name (in styles.css) | New name |
| --- | --- |
| `--bg-canvas` | `--color-canvas` |
| `--bg-panel` | `--color-surface` |
| `--bg-elevated` | `--color-surface-elevated` |
| `--bg-hover` | `--color-surface-hover` |
| `--text-primary` | `--color-text` |
| `--text-secondary` | `--color-text-muted` |
| `--text-tertiary` | `--color-text-tertiary` |
| `--text-quaternary` | `--color-text-quaternary` |
| `--accent` | `--color-accent` |
| `--accent-hover` | `--color-accent-hover` |
| `--accent-bg` | `--color-accent-bg` |
| `--success` | `--color-success` |
| `--success-emerald` | `--color-success-strong` |
| `--warn` | `--color-warning` |

`SubagentDashboard.css` already reads `--color-*` / `--space-*` from
the proposed token system; once the main stylesheet defines those names
the file just works. v2 also adds `--text-micro` and `--shadow-card` to
the global token table since `SubagentDashboard.css` already references
them.

### 3.7 Index.html cleanup

- Remove the Google Fonts `<link>` tags and the two `<link rel="preconnect">` tags.
- Add the theme init script in `<head>` before the stylesheet
  (`src/styles.css`).
- Remove `<meta name="color-scheme" content="dark" />`. The inline script
  sets `colorScheme` on `documentElement` to match the resolved theme.

---

## 4. Component inventory (v2)

### 4.0 Directory map: Shell vs Surfaces vs Controls vs Feedback vs Cards

The `src/components/` tree splits by **layer of responsibility**, not by
surface. Clix should not place a surface component under `Shell/` or a
shell primitive under `Surfaces/`. The split:

```
src/components/
├── Shell/         # Persistent layout, global mounts, cross-surface plumbing.
│                  # Owns AppShell, Sidebar, Header, DashboardSubNav, ToastHost,
│                  # ShortcutOverlay, LiveRegionHost. Hosted once, app-wide.
│                  # Must NOT contain any per-surface UI.
│
├── Surfaces/      # The seven top-level surfaces (page-equivalents).
│                  # Owns Dashboard, Work, Missions, Subagents, Operations,
│                  # Approvals, Cron. Each file ≈ one route. Reads primitives,
│                  # composes Panels and Cards, talks to the API client.
│                  # Must NOT contain reusable atoms.
│
├── Controls/      # Low-level interactive atoms with state (button, input).
│                  # Owns Button, ThemeToggle, Input, Select, Textarea,
│                  # Checkbox, **Toast** (the Toast *component*, not the host).
│                  # Toast is an atom; ToastHost (Shell) is its portal.
│
├── Feedback/      # Stateless UI affordances for empty/loading/pill/spinner/
│                  # shortcut-overlay-display. Owns Skeleton, EmptyState,
│                  # StatusPill, Spinner, ShortcutOverlayDisplay.
│
├── Cards/         # Composite presentational units (Stat, Panel, WorkCard).
│                  # Reused across surfaces. Owns Panel, Stat, WorkCard,
│                  # WorkCardDrawer, AgenticOsCard.
│
└── Tables/        # Data-dense read-only grids. Owns ScrollableTable.
```

**Toast vs ToastHost split — explicit (P1#11):**
- `src/components/Controls/Toast.tsx` — the **Toast component (primitive)**.
  Stateless UI for a single message: tone, title, body, optional action
  button. Knows nothing about the global queue.
- `src/components/Shell/ToastHost.tsx` — the **ToastHost portal**. Mounted
  once in `AppShell`. Owns the queue (`useToastStore`), renders all
  active Toasts via a React portal at `<body>` end. AppShell mounts
  exactly one `ToastHost`; no other component mounts its own toast UI.

A Clix reading just §4's original list will miss this distinction —
the Controls/Toast + Shell/ToastHost pair is a deliberate two-file
architecture, not a typo.

---

App shell:
- `src/components/Shell/AppShell.tsx` — was `src/App.tsx`. Hosts the
  sidebar, mobile hamburger, theme toggle in the header, the toast host,
  the live-region announcer, and the active surface renderer.
- `src/components/Shell/Sidebar.tsx` — persistent on desktop, drawer on
  mobile. 244/60px. Surfaces list grows to seven: Dashboard, Work,
  Missions, Subagents, Operations, Approvals, Cron.
- `src/components/Shell/Header.tsx` — title + GUARDED ribbon + theme
  toggle. Refresh button stays on Dashboard surface.
- `src/components/Shell/DashboardSubNav.tsx` — in-page anchor jump bar,
  repaired anchor IDs (see §6).

Surfaces (the seven):
- `src/components/Surfaces/Dashboard.tsx`
- `src/components/Surfaces/Work.tsx`
- `src/components/Surfaces/Missions.tsx`
- `src/components/Surfaces/Subagents.tsx`
- `src/components/Surfaces/Operations.tsx`
- `src/components/Surfaces/Approvals.tsx`
- `src/components/Surfaces/Cron.tsx`

Shared primitives:
- `src/components/Controls/Button.tsx` — variants: primary, secondary,
  ghost, subtle, danger. Sizes: sm, md, lg.
- `src/components/Controls/ThemeToggle.tsx` — exists today; ships in v2.
- `src/components/Controls/Input.tsx` — text, search, email, number;
  with label, hint, error slot.
- `src/components/Controls/Select.tsx` — native `<select>` styled with
  tokens.
- `src/components/Controls/Textarea.tsx` — character count, autosize
  optional.
- `src/components/Controls/Checkbox.tsx` — for bulk-select.
- `src/components/Controls/Toast.tsx` + `src/components/Shell/ToastHost.tsx`
  — single source of truth for success/error/info messages.
- `src/components/Feedback/Skeleton.tsx` — line, card, table-row
  variants.
- `src/components/Feedback/EmptyState.tsx` — single empty-state component
  reused by every list surface.
- `src/components/Feedback/StatusPill.tsx` — collapses today's `.status`
  classes into one component with a `tone` prop
  (`success | warning | danger | accent | neutral`).
- `src/components/Feedback/Spinner.tsx` — inline, prefers-reduced-motion
  aware.

Cards:
- `src/components/Cards/Stat.tsx` — for the four hero stats and the
  Cron / Audit meta tiles.
- `src/components/Cards/Panel.tsx` — the surface card primitive.
- `src/components/Cards/WorkCard.tsx` — used by the Work Card Board and
  the Dashboard "Open Work Items" section.
- `src/components/Cards/WorkCardDrawer.tsx` — focus trap + return focus.
- `src/components/Cards/AgenticOsCard.tsx` — generic section card.

Tables:
- `src/components/Tables/ScrollableTable.tsx` — sticky first column on
  mobile, full layout on desktop. Used by Activity, Audit, Discord,
  Cron if needed.

Design tokens:
- `src/design/tokens.ts` — TS mirror of the CSS variables, for typed
  consumers (sparkline colors, chart strokes).
- `src/design/theme.ts` — `readTheme()`, `applyTheme(theme)`, used by
  ThemeToggle and tests.

Stylesheet:
- `src/styles.css` — CSS variables, reset/base rules, utility classes,
  and shared primitive styles. Component styling belongs in
  component-adjacent CSS modules or co-located CSS, not in global rules.
- `src/pages/SubagentDashboard.css` — keeps its small surface of
  styles; reads from the global token namespace (no changes needed).

### 4.1 Button variants — explicit, opt-in

- `.btn-primary` — accent fill, white text, hover darker. Default CTA.
- `.btn-secondary` — **CRITICAL: must be visually distinguishable on every
  surface, including light.** Concretely:
  `background-color: var(--color-surface)` (an opaque surface token,
  NOT `transparent`),
  `border: 1px solid var(--color-accent-text)` (a visible border),
  `color: var(--color-accent-text)` (the accent label color).
  V1 had `.btn-secondary { background: transparent; color: var(--text-secondary); }`
  which was effectively invisible against the cream canvas. That is the
  bug we are fixing. Clix must not regress to "transparent fill" for
  any reason.
- `.btn-ghost` — no fill, no border, surface-hover on hover.
- `.btn-subtle` — surface fill, surface-hover on hover. Used inside
  cards for nav-like actions.
- `.btn-danger` — danger fill, white text, hover darker. Used for
  destructive actions (Delete, Reject).
- All variants: hover token; active presses 1px; disabled is opacity +
  not-allowed; loading is `aria-busy="true"` with inline Spinner;
  focus-visible is the global 2px accent outline with 2px offset.
- Icon-only controls require `aria-label`.
- The v2 implementation removes the global
  `button:not(.ghost):not(.subtle):not(.secondary)` primary rule from
  `src/styles.css` and the `!important` overrides in `.sidebar` and
  `.workCardBoard` that exist solely to defeat it.

**Sample button-variant CSS (P1#6 — copy-paste reference for Clix):**

```css
/* ── Button primitive — every variant sets explicit fill + border + color ── */

.btn-primary {
  background-color: var(--color-accent-bg);
  border: 1px solid var(--color-accent-bg);
  color: #ffffff;
}
.btn-primary:hover { background-color: var(--color-accent-hover); border-color: var(--color-accent-hover); }

.btn-secondary {
  background-color: var(--color-surface);    /* NOT transparent */
  border: 1px solid var(--color-accent-text);
  color: var(--color-accent-text);
}
.btn-secondary:hover {
  background-color: var(--color-surface-hover);
  border-color: var(--color-accent-hover);
  color: var(--color-accent-hover);
}

.btn-ghost {
  background-color: transparent;
  border: 1px solid transparent;
  color: var(--color-text-muted);
}
.btn-ghost:hover { background-color: var(--color-surface-hover); color: var(--color-text); }

.btn-subtle {
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-muted);
}
.btn-subtle:hover { background-color: var(--color-surface-hover); color: var(--color-text); }

.btn-danger {
  background-color: var(--color-danger);
  border: 1px solid var(--color-danger);
  color: #ffffff;
}
.btn-danger:hover { filter: brightness(0.92); }
```

Visual sanity check: every variant above must render a distinct chip
on a cream `--color-canvas` *and* on the near-black dark
`--color-canvas`. The exact bug class — "this button is invisible
against this background" — must not be possible from this CSS.

### 4.2 Status pill collapse

Today the codebase has `.status.live`, `.status.ok`, `.status.success`,
`.status.warn`, `.status.danger`, `.status.placeholder`,
`.status.planned`, `.status.active`, `.status.blocked`,
`.status.review`, `.status.complete`. v2 collapses to:

```
<StatusPill tone="success">live</StatusPill>
<StatusPill tone="warning">warn</StatusPill>
<StatusPill tone="danger">danger</StatusPill>
<StatusPill tone="accent">placeholder</StatusPill>
<StatusPill tone="neutral">muted</StatusPill>
```

The CSS backing the pill is one rule set; the tone prop picks the
token. Work-card status (planned / active / blocked / review / complete)
maps to the same five tones via a small lookup table.

### 4.3 Toast surface

One `ToastHost` mounted in `AppShell`. Components call
`useToast().show({ tone, title, body, action })`. Replaces today's
ad-hoc `<p className="statusLine">` and `<p className="statusLine danger">`
patterns in ApprovalQueue, CronManager, DiscordCoordinationPanel,
Hero, DashboardSubNav, and MemoryStatusPanel.

---

## 5. Responsive rules

Breakpoints (fixed):

- 360px — mobile floor. Content must not break below this width.
- 768px — drawer boundary. Persistent sidebar → drawer.
- 1024px — desktop grid boundary. Two-column hero + dashboard grids
  become available.

Below 768 (mobile):
- Sidebar becomes a slide-in drawer; hamburger trigger visible.
- Hero stats become single column.
- Work Card Board lanes stack vertically.
- Cron list stacks vertically; the form goes full-width.
- Approval cards stack vertically; reason textarea goes full-width.
- Tables scroll horizontally with first column sticky (or cardify for
  <5 rows).

At 768–1023 (tablet):
- Two-column grids are allowed only when content has room.
- Mission Board lanes collapse from 5 to 3 to 2 as the viewport narrows.
- Work Card Board lanes stay at 5 (with horizontal scroll) but card
  density is reduced.

At 1024+ (desktop):
- Persistent sidebar and multi-column dashboard grids.
- Two-column "Open Work Items + Activity" stays.

Test viewports (P2#3 + Chris#10): **360, 768, 1024, 1440, 1920.**
The 1920px ultra-wide is a stress-test for two-column grids, the
Dashboard hero, and the Work Board 5-up layout. Anything that
overflows or becomes visually unbalanced at 1920 is a layout bug,
not a "we don't test here" answer. The `<body>` content is capped
at `--container-max: 1600px; margin: 0 auto;` so the dashboard
does not turn into a single-line ribbon at 4K — but every surface
must still look intentional at exactly 1920.

Drawer behavior (sidebar, work card, cron form, agent orchestration
form):
- Uses `--shadow-card-elevated`.
- Traps focus while open.
- Closes on Escape and backdrop click.
- Returns focus to the trigger on close.

---

## 6. Surface-by-surface v2 spec

### 6.0 Print stylesheet (Chris#5, OWNED Phase 4)

The dashboard ships a `@media print` stylesheet so an operator can
print a Work Board view, an Approvals queue, or a Cron Manager list
without the polished chrome. Behaviour:

- Hide the `Shell/Sidebar`, `Shell/Header`, `Shell/DashboardSubNav`,
  the `ToastHost`, the bulk-action bar, the `ShortcutOverlay`, the
  `LiveRegionHost`, and all buttons that are no-ops on paper
  (theme toggle, refresh button, hamburger).
- Expand `--color-surface-elevated` to opaque white so cards render
  on paper with no translucent backgrounds.
- Drop all `box-shadow`, all `backdrop-filter`, all
  `@keyframes` animation. Force colour-scheme to light.
- Add a `letterhead` block at the top of the printed page:
  "Stronghold" + the active surface title + the date + the
  snapshot timestamp from "Last refresh" pill. Right-aligned
  footer: page N of M.
- URLs behind each Work Card / Approval / Cron row render as
  parenthetical `(cmd://work/<id>)` text so a printed snapshot
  still maps back to the digital record.
- Approvals queue: also render a "Resolved" stack below the
  pending list (currently collapsed in the live UI).
- Implementation lives entirely in `src/styles.css` under a
  `@media print { ... }` block at the bottom of the file — no
  new component, no new file. Just one stylesheet block, gated
  by the standard `print` media query.

### 6.1 Dashboard

- Hero stays at the top.
- DashboardSubNav anchors repaired. v2 IDs:
  `section-hero`, `section-health`, `section-work`,
  `section-coordination`, `section-routing`, `section-memory`. The
  components now own the IDs:
  - `section-hero` → `<Hero>` gets `id="section-hero"`.
  - `section-health` → the four-up hero stats wrapper
    (`<section class="agenticOsHeroRow">`) gets
    `id="section-health"`.
  - `section-work` → already on `WorkCardBoard`. Stays.
  - `section-coordination` → `DiscordCoordinationPanel` root gets
    `id="section-coordination"`.
  - `section-routing` → `ActivityGraphPanel` root gets
    `id="section-routing"`.
  - `section-memory` → `MemoryStatusPanel` root gets
    `id="section-memory"`.
- Recheck button calls a soft refresh, not `window.location.reload()`.
- Discord panel gets the missing CSS (see §6.5).
- Snapshot-fetch path uses `Skeleton` for the four hero stats and the
  QC panel; errors surface through the toast host.

### 6.2 Work

- Lane data model stays 5-lane; lane IDs and titles match the WorkCardStatus
  type.
- Filter bar gains a "Bulk select" toggle that switches cards into
  checkbox mode. Selecting cards reveals a sticky action bar at the
  bottom of the viewport with: Approve-all, Reject-all, Change status,
  Assign owner, Clear selection.
- Drag-and-drop between lanes is wired in v2 phase 4 (Polish). The data
  model must accept a `laneId` on each card from day one so we don't
  have to refactor to enable it later.
- Work Card Drawer gains focus trap, focus return on close, and inline
  edit on Owner + Schedule + Status fields. Other fields are read-only.
- Long titles show a 2-line ellipsis with a "see more" toggle that
  expands the card in-place (no drawer needed).

### 6.3 Missions

- Switch from `repeat(5, minmax(150px, 1fr))` to a shared `lanes` grid
  with breakpoints at 768 (3 cols) and 1024 (5 cols). Below 768, lanes
  become vertical stack.
- Add a filter bar: owner + priority. Empty state when no missions
  match.
- Mission card reuses `Panel` primitive + `StatusPill`.

### 6.4 Operations

- Wrap the proposal forms in a shared `Form` primitive (label + hint +
  error slot + actions row).
- Safety Boundary stays at the top, always visible.
- Safety & Readiness disclosure stays open by default; the rest are
  closed.
- Agent Orchestration: requests / runs / artifacts move into three
  tabs inside one card. Tab order is Requests (default) / Runs /
  Artifacts.
- Audit Trail is a `ScrollableTable` capped at the last 20 events with
  a "Show older" link to the full audit view (out of scope for v2; the
  link is a placeholder).
- Operator Notes is removed in favor of an inline helper strip in each
  disclosure ("Proposals require approval before apply — see Safety &
  Readiness above").

### 6.5 Approvals

- **Bulk-action parity with Work Card Board (P1#7 + Chris#7, OWNED Phase 3):**
  Approvals adopts the same bulk-select pattern as the Work Board.
  - Each pending card gains a checkbox column; selecting ≥1 card reveals
    a sticky action bar at the bottom of the viewport with:
    **Approve selected**, **Reject selected with reason**, **Clear
    selection**.
  - Range-select: Shift-click selects from the last-clicked to the
    clicked card.
  - The action bar uses `position: fixed; bottom: 16px;` with
    `--shadow-card-elevated`, identical to Work Board's bulk bar so
    users have one mental model.
  - Bulk approve / reject routes through the same `ToastHost` as single
    approve / reject. One toast per bulk action summarises
    "Approved N requests" / "Rejected N requests (M with reason)".
  - Audit invariant preserved: each resolved request still writes one
    immutable audit entry; bulk is N single writes inside one
    transaction, NOT one bulk write.
- **Keyboard shortcuts (primary interaction, NOT inline row edit):**
  `j` / `k` to navigate between pending cards (focus the row, not a
  button), `a` to approve the focused card, `r` to reject the focused
  card. `r` opens the reason textarea automatically (focus jumps to
  textarea; Enter submits or Shift+Enter inserts a newline; Escape
  cancels the reason and refocuses the card). `?` opens the shortcut
  overlay. **There is no "row-level edit-in-place" UI for approve /
  reject — the keyboard IS the inline interface.** Cards expose
  Approve / Reject buttons for mouse users; the keyboard is for power
  users. Both code paths share the same `approve(requestId, reason?)`
  store action so audit semantics are identical.
- Filter: pending only by default; "Show resolved" toggle reveals the
  Recently Resolved stack.
- All success/error messages route through the toast host; the
  inline `statusLine` element is removed.
- Audit-only invariant surfaced as a help icon next to the section
  header with a tooltip explaining "Every resolve writes one immutable
  audit entry; no cascading writes."
- **Per-surface live-region announcement (Chris#11, Phase 4 polish but
  announced Phase 3):** when a new pending request arrives via polling,
  the AppShell live region announces "1 new approval pending" (or "N
  new approvals pending"). The Approvals surface subscribes to the
  same live-region host via a `useAnnounceOnChange('approvals')`
  hook. This is per-surface, not the generic "N new activity entries"
  counter — the announcement names the surface the user is on, if
  active.

### 6.6 Cron

- Add per-row "Last fired" + "Last status" pill. Status pill uses the
  StatusPill component (success / warning / danger / neutral).
- Add "Enabled" pill next to each row (success when enabled, neutral
  when paused).
- Edit form: add a "Next 3 firings" preview computed client-side from
  the schedule string (uses a small cron-parser util, no extra
  dependency if avoidable; if not, ship `cron-parser`).
- Inline validation: schedule must be 5 or 6 fields; skills must be
  comma-separated identifiers; provider + model are paired (both or
  neither).
- All success/error messages route through the toast host.
- **Per-surface live-region announcement (Chris#11):** when a cron
  job fires, the live region announces
  "<jobName> fired <human relative time> ago (status: success / failed)"
  — throttled to once per minute when multiple jobs fire in the same
  window so the announcer does not spam screen-reader users.
- **Toast undo on ALL destructive actions (P2#1 + Chris#12,
  OWNED Phase 3):** every destructive surface action surfaces a toast
  with an "Undo" action that persists for 10 seconds. Concretely:
  - Cron delete → toast "Deleted <jobName>. Undo" → restores the job.
  - Cron pause / resume → toast "<jobName> paused / resumed. Undo" →
    flips the state back.
  - Approvals reject → toast "Rejected <requester>. Undo" → un-rejects.
  - Work Card Board bulk move between lanes → toast
    "Moved N cards to <lane>. Undo" → returns cards to origin lane.
  - All undo paths share a single `useToast().undo(...)` API:
    `useToast().show({ tone, title, action: { label: 'Undo', onClick } })`.
    The undo toast takes precedence over a transient success toast;
    they do not stack.

### 6.7 Subagents

- Promote from `pages/SubagentDashboard.tsx` to
  `src/components/Surfaces/Subagents.tsx`.
- Add to `Sidebar.tsx`'s `SURFACES` array with icon (Lucide "users" or
  similar). Slot between Missions and Operations.
- Add `case 'subagents'` to `App.tsx`'s `renderSurface` switch (will
  move to `AppShell.tsx` after the §4 refactor).
- Search + role filter stay. Add a "Wrapper availability" filter.
- **Wrapper availability filter persistence — localStorage (Chris#8):**
  the filter state persists across navigations and across app
  restarts via `localStorage.stronghold.subagents.wrapperFilter`.
  Not URL params. The sidebar nav state changes surface; the filter
  is part of the Subagents surface's own UX. The key is namespaced
  under the same `stronghold.*` prefix the theme uses. The filter
  does NOT survive a logout (no logout today), and the value is one
  of `'all' | 'available' | 'busy'` — anything else falls back to
  `'all'` on read.
- Card reuses `Panel` primitive + `StatusPill` for the wrapper-status
  pill.
- Empty state when no profiles match the filter.
- **Cost/usage tile (P1#3 + Chris#6, OWNED Phase 2):** the Subagents
  surface opens with a 4-up stat row at the top of the page,
  mirroring the Dashboard's four hero stats but scoped to agent
  economics:
  - **Tokens today** — sum of `tokens_in + tokens_out` across all
    profiles for the current 24-hour window.
  - **Cost today ($)** — formatted as `$X.XX`, sourced from the
    server-derived `/api/subagents/stats` snapshot payload (field
    `snapshot.subagentsStats.costToday`). The snapshot is
    regenerated by `scripts/generate-snapshot.mjs` on build; the
    tile reads from that snapshot, not from a client-side
    rate × tokens calculation. If the payload omits the field,
    the tile shows `--` and a tooltip "rate unavailable".
  - **Active runs** — count of currently running profiles / agents
    (status `active` or `throttled`).
  - **Last wrapper sync** — relative time of the last successful
    wrapper availability sync, e.g. "3m ago".
  - The four tiles reuse the `Stat` card primitive from
    `src/components/Cards/Stat.tsx` and the `StatusPill` from
    `src/components/Feedback/StatusPill.tsx`. Below the stat row,
    the existing profile × role × wrapper × skills × missions grid
    renders unchanged.
- **Per-surface live-region announcement (Chris#11):** when the cost
  / usage snapshot refreshes and the "Cost today ($)" stat changes
  by more than 10% (either direction), the live region announces
  "Subagent cost updated to $<X.XX>". This keeps screen-reader users
  informed without spamming small fluctuations.

---

## 7. Phase 1–4 scope recommendations

### Phase 1 — Foundation (token system + theme)

Goal: every surface renders correctly in both light and dark, theme
toggle works, sub-nav anchors are real, parallel token namespaces are
collapsed, no remote fonts, no first-paint flash.

Scope:
- Replace `:root` and add `html[data-theme="dark"]` blocks in
  `src/styles.css` with the §3.2 + §3.3 token tables.
- Rename all `--bg-*` / `--text-*` references to `--color-*`; add
  aliases for one release if needed (do not — keep the rename hard).
- Remove the Google Fonts `<link>` from `index.html`.
- Add the theme init script to `index.html` `<head>`.
- Remove the hard-coded `<meta name="color-scheme" content="dark">`.
- Add `@media (prefers-reduced-motion: reduce)` global reset.
- Wrap infinite-pulse keyframes (`sidebarPulse`, `activity-edge-pulse`)
  in `@media (prefers-reduced-motion: no-preference)`.
- Fix the dead DashboardSubNav anchors by adding `id="section-..."` to
  the matching component roots (§6.1).
- Add the missing CSS for `DiscordCoordinationPanel` (`.discordCoordinationList`,
  `Card`, `Header`, `Author`, `BotBadge`, `Time`, `Content`, `Toggle`).
- Wire `SubagentDashboard.css` to the global tokens (no rename needed;
  the file already reads the right names).

Done when: dashboard, work, missions, operations, approvals, cron,
subagents all render in both themes; theme toggle works; no first-paint
flash; sub-nav jumps land on real targets; Discord panel is styled;
`grep -E '(--bg-|--text-)' src/styles.css` returns zero hits outside
the alias block.

### Phase 2 — Surfaces

Goal: every surface has a consistent shell, focus management, and
shared primitives.

Scope:
- `AppShell`, `Sidebar`, `Header`, `DashboardSubNav` extracted to
  `src/components/Shell/*`.
- `Surfaces/*` extracted for each surface.
- `Panel`, `Stat`, `WorkCard`, `AgenticOsCard` extracted to
  `src/components/Cards/*`.
- `ScrollableTable` extracted.
- `EmptyState`, `Skeleton`, `StatusPill`, `Spinner` extracted.
- `Toast` + `ToastHost` extracted; legacy `<p className="statusLine">`
  call sites converted.
- Work Card Drawer gains focus trap + return focus on close.
- Mission Board gains the new lane grid + filter bar + empty state.
- Subagents promoted to a real surface (sidebar entry + render switch).
- Hero subtitle on mobile: visible above 980px; below, replace with
  visually hidden text (`sr-only` utility, not `display:none`).

Done when: every surface uses the shared primitives; focus trap works
on the drawer; Subagents is reachable from the sidebar; every empty
list shows the shared `EmptyState`; the toast host is the only place
success/error messages render. **The cost/usage stat row on the
Subagents surface renders four tiles; the "Cost today ($)" tile
shows a real number, not `--`, against a populated snapshot, in
both themes.** (Chris#6, P1#3)

### Phase 3 — Interactions

Goal: power users can move faster.

Scope:
- Bulk-select on Work Card Board: checkbox column, Shift-click range
  select, action bar that slides up from the bottom of the viewport.
- **Approvals bulk-action parity (Chris#7, P1#7):** pending cards
  gain a checkbox column; same Shift-click range select; same bottom
  action bar with "Approve selected", "Reject selected with reason",
  "Clear selection".
- Inline edit on Work Card Drawer fields (Owner, Schedule, Status).
- Keyboard shortcuts: `?` opens the shortcut overlay; `g d` / `g w` /
  `g m` / `g s` / `g o` / `g a` / `g c` jump to Dashboard / Work /
  Missions / Subagents / Operations / Approvals / Cron; `/` focuses
  the active surface's search input; `Esc` closes drawer/dialog;
  approvals surface adds `j` / `k` / `a` / `r` per §6.5.
- **Cmd/Ctrl+K command palette (P1#1 + Chris#4, OWNED Phase 3):**
  a global command palette mounted at the AppShell level. Triggered
  by `Cmd+K` on macOS and `Ctrl+K` on Windows / Linux. The palette
  opens a modal dialog with a search input, recent items, and a
  filtered list of every surface + every "jump to" target. Users
  can type `cro` to jump to Cron, `appr` to jump to Approvals,
  `sub` to jump to Subagents, etc. Selecting a result routes via
  `useRouter().push(<surfaceId>)` and dismisses the palette.
  Palette esc closes; click-outside closes; arrow keys navigate
  the result list; Enter selects. The palette is a `Shell/` mount
  sibling to `ToastHost` and `ShortcutOverlay`, lives at
  `src/components/Shell/CommandPalette.tsx`.
- Copy-to-clipboard on Work Card IDs, mission IDs, agent target names.
- **Toast undo on ALL destructive actions (P2#1 + Chris#12):**
  cron delete, cron pause/resume, approval reject, work card bulk
  move, work card delete. 10-second window per §6.6. Same
  `useToast().undo(...)` API across all surfaces.
- Density toggle (compact / cozy) on Dashboard hero stats + Activity
  table; preference persisted to `localStorage`.
- Soft refresh on the Dashboard "Recheck" button (no
  `window.location.reload()`).

Done when: bulk-select moves multiple cards between lanes on the
Work Board; bulk-approve rejects multiple requests on the Approvals
queue (audit invariant preserved); inline edit saves without
opening the drawer; shortcut overlay is reachable from every
surface; **Cmd/Ctrl+K command palette opens from every surface and
navigates to the typed target within 1 keystroke**; copy-to-clipboard
works on every ID surface; toast undo restores a deleted cron job,
un-pauses a paused cron job, un-rejects a rejected request, and
returns bulk-moved work cards to their origin lane; Recheck no
longer reloads the page.

### Phase 4 — Polish

Goal: the dashboard feels like a product, not a prototype.

Scope:
- Drag-and-drop between Work Card Board lanes. The data model already
  accepts `laneId` per card from Phase 3, so this is purely UX.
- "Next 3 firings" preview in Cron edit form.
- Last-fired / last-status pills on Cron rows.
- Inline validation UX on Cron form fields.
- Polished loading skeletons for every panel.
- Polished empty states for every panel.
- Focus-visible styles reviewed on every interactive element.
- Forced-colors mode overrides for borders and pill backgrounds.
- **Per-surface live-region announcer (Chris#11, OWNED Phase 4
  polish):** `LiveRegionHost` mounted in `AppShell` announces
  per-surface events via the `useAnnounceOnChange(<key>)` hook.
  Concretely the announcer covers:
  - **Cron:** "<jobName> fired (status: success / failed)" throttled
    to once per minute (§6.6).
  - **Approvals:** "1 new approval pending" / "N new approvals
    pending" when polling surfaces fresh pending requests
    (§6.5; declarative hook added in Phase 3, broadcast wiring
    lands here).
  - **Work:** "Work card moved to <lane>" per bulk-move toast,
    debounced so a single bulk-move emits one announcement, not N.
  - **Subagents:** "Subagent cost updated to $<X.XX>" when the
    cost tile changes by >10% (§6.7).
  - All announcements use `aria-live="polite"` so they do not
    interrupt active screen-reader speech.
- **Print stylesheet (Chris#5, OWNED Phase 4):** the
  `@media print { ... }` block lands in `src/styles.css` per the
  §6.0 spec. Hides chrome, swaps backgrounds to opaque white,
  adds the letterhead and footer, surfaces URLs as
  `(cmd://work/<id>)` text.
- Final accessibility audit (axe-core, Lighthouse AAA spot-check on
  the four target surfaces — see §10, manual keyboard pass) on
  every surface.
- Performance pass: 1920px viewport <50ms initial paint, no jank on
  bulk-select toggle.

Done when: drag works on Work Board; Cron edit shows firings;
loading and empty states feel intentional; **printing a Work Board
or Approvals queue yields a paper-grade document with letterhead,
no chrome, and visible entity IDs**; Lighthouse accessibility ≥ 95
on every surface and **Lighthouse accessibility = 100 (AAA spot-
check) on Dashboard hero, Work Card, Approvals, and Cron** per
§10.

---

## 8. Diff narrative (current → v2)

Current state:
- Token names are implementation-specific (`--bg-*`, `--text-*`).
- Dark-only.
- Parallel token namespace in `SubagentDashboard.css` reads
  `--color-*` / `--space-*` from a spec that doesn't exist in code.
- Google Fonts remote `<link>` in `index.html`.
- Hard-coded `<meta name="color-scheme" content="dark">`.
- No `[data-theme]` selectors anywhere; theme toggle is non-functional.
- `DiscordCoordinationPanel` is unstyled.
- `DashboardSubNav` has 5 dead anchors out of 6.
- Hero subtitle hidden on mobile without `sr-only`.
- `Recheck` button calls `window.location.reload()`.
- Subagents is not in the sidebar.
- Sidebar status pulse animation runs unchecked by reduced-motion.
- Cron row class group duplicates shared row primitives.
- No bulk-select, no drag, no inline edit, no keyboard shortcuts, no
  command palette.
- No toast host; each component has its own `statusLine`.
- No shared empty-state component.

Target state (v2):
- One canonical semantic token namespace (`--color-*`, `--space-*`,
  `--radius-*`, `--shadow-*`, `--font-*`, `--text-*`).
- Two themes — light and dark — sharing that namespace via
  `[data-theme="dark"]` overrides.
- No remote fonts.
- Theme init script before first paint; no FOUC.
- Discord panel styled.
- All Dashboard sub-nav anchors live.
- Mobile subtitle replaced with `sr-only` text.
- Recheck is a soft refresh.
- Subagents wired into the sidebar.
- Reduced-motion respected everywhere.
- Cron rows reuse shared row primitives.
- Bulk-select, drag-ready data model, inline edit, keyboard shortcuts
  shipped per §7.
- Single Toast host; no `statusLine` left.
- Shared `EmptyState`, `Skeleton`, `StatusPill`, `Spinner`.

---

## 9. Clix implementation brief (per phase)

### Phase 1 — Foundation

Files to touch:
- `src/styles.css` — replace `:root` block with the §3.2 light token
  table; add `html[data-theme="dark"]` block with the §3.3 dark
  token table. **HARD RENAME per §3.6:** rename every `--bg-*` /
  `--text-*` reference to `--color-*` in the same commit. No
  aliases, no shipping window, no follow-up cleanup commit. Add
  global reduced-motion reset, wrap infinite keyframes in
  `prefers-reduced-motion: no-preference`, add
  `.discordCoordination*` rules, add `.sr-only` utility, add the
  `Button` primitive variant styles from §4.1 (uses
  `--color-surface` + `--color-accent-text`, never `transparent`).
  **Required sample CSS to land in this commit** is documented in
  §4.1 — copy it verbatim and adjust the rule names if needed.
- `index.html` — remove the Google Fonts `<link>` AND both
  `<link rel="preconnect" href="https://fonts.googleapis.com" />`
  and `<link rel="preconnect" href="https://fonts.gstatic.com" />`
  preconnect tags. Add the §3.5 theme init script to `<head>`
  before the stylesheet. Remove the hard-coded
  `<meta name="color-scheme" content="dark">`.
- `src/components/DashboardSubNav.tsx` — no change (anchor IDs are
  already correct).
- `src/components/AgenticOsDashboardPanel.tsx` — add
  `id="section-health"` to the `<section className="agenticOsHeroRow">`
  wrapper; add `id="section-hero"` to the `<Hero>` is rendered by
  SurfaceDashboard so SurfaceDashboard.tsx wraps it with an anchor
  span, OR Hero accepts an optional `id` prop.
- `src/components/Hero.tsx` — accept an optional `id` prop, forward to
  the `<header>` element.
- `src/components/Surfaces.tsx` — wrap `<Hero>` with
  `id="section-hero"` (anchor span or Hero prop); render
  `id="section-coordination"` on the `<DiscordCoordinationPanel>` root
  via a wrapper element; render `id="section-routing"` on the
  `<ActivityGraphPanel>` root; render `id="section-memory"` on the
  `<MemoryStatusPanel>` root. The simplest path is to add an
  optional `sectionId` prop to each panel and forward.

Constraints:
- Do NOT introduce a font loader dependency.
- Do NOT add `data-theme` selectors inside component CSS modules —
  components read tokens, not themes.
- Do NOT keep the `button:not(.ghost):not(.subtle):not(.secondary)`
  global rule. (Move it to Phase 2 when the Button primitive lands;
  in Phase 1, replace it with explicit `.btn-primary` for the few
  sites that rely on the implicit primary.)
- Do NOT add `--bg-*` / `--text-*` aliases — the grep gate below
  returns **zero hits in `src/styles.css` AND zero hits in any
  committed stylesheet** by the end of Phase 1. No exceptions.

Done when (Phase 1 grep gate, per Chris#1 + P1#5):
```
grep -RE '(--bg-|--text-)' src/styles.css src/components/ src/pages/ index.html
# must return ZERO hits
```
That gate is the only "Done when" criterion for the rename. One
commit, both old names deleted and new names added — there is no
release where both names exist.

### Phase 2 — Surfaces

Files to create:
- `src/components/Shell/AppShell.tsx`
- `src/components/Shell/Header.tsx`
- `src/components/Surfaces/{Dashboard,Work,Missions,Subagents,Operations,Approvals,Cron}.tsx`
- `src/components/Cards/{Panel,Stat,WorkCard,AgenticOsCard}.tsx`
- `src/components/Tables/ScrollableTable.tsx`
- `src/components/Feedback/{EmptyState,Skeleton,StatusPill,Spinner}.tsx`
- `src/components/Controls/Toast.tsx` + `src/components/Shell/ToastHost.tsx`

Files to update:
- `src/App.tsx` — delete or convert into the AppShell barrel.
- `src/components/Sidebar.tsx` — add Subagents to `SURFACES`.
- `src/components/MissionBoard.tsx` — new lane grid + filter bar +
  empty state.
- `src/components/WorkCardBoard.tsx` — reuse `WorkCard` and `Panel`
  primitives.
- `src/components/WorkCardDrawer.tsx` — focus trap + return focus.
- `src/pages/SubagentDashboard.tsx` — move into
  `src/components/Surfaces/Subagents.tsx`.
- **`src/components/Surfaces/Subagents.tsx` — cost/usage stat row
  (P1#3 + Chris#6, OWNED Phase 2):** add a 4-up `Stat` row at the
  top of the surface: Tokens today, Cost today ($), Active runs,
  Last wrapper sync. Render from the `/api/subagents/stats` snapshot
  payload. If the payload omits any field, render `--` and attach
  the "rate unavailable" tooltip via `aria-describedby`. Wire the
  component to the existing snapshot loader; do not add a new
  polling interval.
- **`src/components/Surfaces/Subagents.tsx` — Wrapper availability
  filter wired to `localStorage` (Chris#8):** the filter state is
  read on mount from
  `localStorage.stronghold.subagents.wrapperFilter` (default `'all'`)
  and persisted on change. Surfaces other than Subagents never
  touch that key.

Constraints:
- Do NOT delete the existing `WorkCardFeed.tsx` and
  `WorkCardDrawer.tsx` exports until `WorkCardBoard` is wired to the
  new primitives and tested.
- All new components must read tokens from `src/styles.css` — no raw
  hex, no rgba outside the token definitions.
- AppShell hosts one ToastHost; no other component mounts its own
  toast UI.

### Phase 3 — Interactions

Files to update:
- `src/components/Cards/WorkCard.tsx` — bulk-select mode (checkbox
  column), `aria-checked`, `data-selected` on row.
- `src/components/Surfaces/Work.tsx` — bulk action bar that slides up
  when ≥1 card is selected. **The bulk action bar triggers toast
  with Undo for "Move N cards to <lane>"** (P2#1 + Chris#12).
- `src/components/Surfaces/Approvals.tsx` — bulk action bar (same
  component shape as the Work Board's bulk bar) with
  "Approve selected", "Reject selected with reason", "Clear
  selection" (Chris#7 + P1#7). Toast undo on reject so a power
  user can recover from a bad bulk reject.
- `src/components/Surfaces/Approvals.tsx` — `j` / `k` / `a` / `r`
  shortcuts. NO inline row-level edit UI for approve / reject —
  the keyboard is the inline interface (P1#7 explicitly resolved
  in §6.5).
- `src/components/Cards/WorkCardDrawer.tsx` — inline edit on Owner,
  Schedule, Status.
- `src/components/Surfaces/Cron.tsx` — toast undo on delete AND
  toast undo on pause / resume (10s window).
- `src/components/Shell/AppShell.tsx` — keyboard shortcut handler
  (`?`, `g d` / `g w` / `g m` / `g s` / `g o` / `g a` / `g c`, `/`,
  `Esc`).
- `src/components/Shell/CommandPalette.tsx` — new file. Mounted at
  the AppShell level; triggered by `Cmd+K` (macOS) / `Ctrl+K`
  (Windows / Linux). Provides search across all surfaces and
  "jump to" targets. Routes via `useRouter().push(<surfaceId>)`.
  Arrow keys + Enter to select; Esc to dismiss; click-outside to
  dismiss. (P1#1 + Chris#4.)
- `src/components/Feedback/ShortcutOverlay.tsx` — new file.
- `src/components/Surfaces/Dashboard.tsx` — soft refresh (calls the
  snapshot loader, not `window.location.reload()`).
- **`src/hooks/useAnnounceOnChange.ts` — new file.** Hook signature
  `useAnnounceOnChange(key: string, getMessage: (snapshot) =>
  string | null)`. Subscribes to the AppShell's live-region queue.
  Phase 3 adds the hook + the Approvals subscription; Phase 4
  extends to Cron / Work / Subagents (Chris#11, §10 Phase 4 QC
  verifies the per-surface wiring).

Constraints:
- Bulk-select action bar uses `position: fixed; bottom: 16px;` with
  `--shadow-card-elevated`. Visible only when ≥1 card selected.
- Approvals bulk action bar uses the SAME component shell as the
  Work Board bulk action bar — extract to
  `src/components/Feedback/BulkActionBar.tsx` so both call sites
  share styling and density.
- Shortcut overlay listens at the AppShell level so all surfaces
  inherit it. Per-surface shortcuts (Approvals `j`/`k`/`a`/`r`) are
  scoped to the surface's container; AppShell checks
  `data-surface-active` before dispatching.
- `Esc` is handled at the AppShell level: close command palette /
  drawer / dialog / shortcut overlay in order, then bubble.
- Cmd-K palette and Shortcut overlay are mutually exclusive in the
  viewport — opening one closes the other. They share the same
  focus-trap primitive.

### Phase 4 — Polish

Files to update:
- `src/components/Surfaces/Work.tsx` — drag-and-drop between lanes.
- `src/components/Surfaces/Cron.tsx` — "Next 3 firings" preview;
  inline validation UX; last-fired pill.
- `src/components/Shell/AppShell.tsx` — `LiveRegionHost` mounted
  globally with `aria-live="polite"`.
- `src/hooks/useAnnounceOnChange.ts` — extend the hook
  subscriptions to Cron, Work (bulk-move), and Subagents (cost
  tile). Chris#11 — per-surface announcer coverage lands here.
- `src/styles.css` — `@media (forced-colors: active)` overrides for
  borders and pill backgrounds; **`@media print { ... }` block
  per §6.0 (Chris#5).** Implementation is one stylesheet block
  with letterhead, footer, opaque-white surfaces, hidden chrome.
  No new component file.

Constraints:
- Drag-and-drop uses native HTML5 DnD (no extra dependency) OR a
  lightweight dnd-kit install (justify the bundle cost; the existing
  system-font rule prefers no extra deps).
- Next-3-firings util: pure function in `src/util/cronPreview.ts`,
  unit-tested.
- **Bundle-size budget per dependency (P2#4):** any single
  dependency addition must clear the per-dep ceiling before Igris
  signs off:
  - **Inter font (if used at all):** ≤ 30 KB gz. Local latin-subset
    WOFF2 variable font with `font-display: swap`. Reject anything
    that crosses this ceiling.
  - **dnd-kit (if used for drag-and-drop):** ≤ 10 KB gz. The 30 KB
    ceiling in v2 was overloaded; it does NOT cover dnd-kit.
  - **In-house cron parser:** 0 KB dep budget — writes in
    `src/util/cronPreview.ts`, no external package.
  - **Any other new dep:** requires Igris sign-off AND a per-dep
    ceiling stated in the commit message.
  - The performance pass measures against the 1920px viewport, not
    1440px (Chris#10).

---

## 10. Tusk QC brief (per phase, both themes)

Every QC pass runs at **five viewports: 360, 768, 1024, 1440, 1920**
(Chris#10). Every pass screenshots both `data-theme="light"` and
`data-theme="dark"`. Every pass uses the keyboard (no mouse) for at
least one full traversal of each surface. Every Phase 1+ pass uses
axe-core in addition to Lighthouse — Lighthouse ≥ 95 does not catch
per-component color-contrast drift, so axe-core fills that gap.

### Phase 1 QC checks

Theming:
- `data-theme="light"` vs `data-theme="dark"` produce visually
  different surfaces for every component on every page. No `data-theme`
  selector may be added inside component CSS.
- Theme toggle in the header flips the entire app between the two
  themes with no FOUC. `localStorage.stronghold.theme` is set on
  toggle.
- No `<link>` to Google Fonts in `index.html`. DevTools Network tab
  shows zero requests to `fonts.googleapis.com` or
  `fonts.gstatic.com` on initial load.
- **`index.html` no longer contains
  `<link rel="preconnect" href="https://fonts.googleapis.com" />`
  OR `<link rel="preconnect" href="https://fonts.gstatic.com" />`
  (P1#8).** Grep gate:
  `grep -E 'fonts\.(googleapis|gstatic)\.com' index.html`
  must return zero hits before Phase 1 is declared done.
- **Inter fallback verification (Chris#3):** with the Google Fonts
  link removed and `--font-sans` falling back to `system-ui,
  -apple-system, 'Segoe UI', sans-serif`, verify at all FIVE
  viewports (360 / 768 / 1024 / 1440 / 1920) in BOTH themes that
  the rendered font is the system font on each of Chrome, Safari,
  Firefox, and Edge. Render any text-containing surface (Dashboard
  is enough) and diff against a baseline screenshot; the system
  font must render without missing-glyph boxes, without a flash,
  and at all five widths. (Chris#3 — system font + viewport matrix
  must hold BEFORE the `<link>` is deleted for real.)

CSS:
- `grep -RE '(--bg-|--text-)' src/styles.css src/components/ src/pages/ index.html`
  returns zero hits (Chris#1 + P1#5 — HARD RENAME, no aliases).
- **Button-variant visual contract (P1#4):** screenshot every
  Button variant (primary / secondary / ghost / subtle / danger) at
  1440px on BOTH `data-theme="light"` AND `data-theme="dark"`,
  against `Canvas` and against `Surface-elevated` panels. Each
  variant must render as a distinct, visible chip on every surface
  in every theme. The `.btn-secondary` chip must show a visible
  accent-text border AND an opaque surface fill — the v1 bug
  class ("invisible against light cream") cannot recur. Save the 10
  screenshots as `qc/phase1/btn-{variant}-{theme}.png`.
- **Reduced-motion emulation (P1#4):** launch DevTools "Emulate
  CSS prefers-reduced-motion: reduce", screenshot the sidebar (the
  status dot must be static, not pulsing) and the activity graph
  (edges must not pulse), in BOTH themes at 1440px. Save as
  `qc/phase1/reduced-motion-sidebar.png` and
  `qc/phase1/reduced-motion-activity.png`. Reset emulation after.
- **Hero subtitle line-count by viewport (P2#3):** at each of the
  FIVE viewports (360 / 768 / 1024 / 1440 / 1920), screenshot the
  Hero subtitle in BOTH themes. Confirm the line count is 2 (not 1,
  not 3+). At 360 the text is visually hidden via `sr-only`; the
  computed text height is non-zero but `display` is not `none`. The
  text must remain in the accessibility tree at every viewport.

Anchors and chrome:
- DashboardSubNav clicks land on real targets: Hero, Health, Work,
  Coordination, Routing, Memory. Verify each anchor scrolls to a
  visible element with the matching id.
- `DiscordCoordinationPanel` renders with visible padding, message
  metadata (author + relative time), bot badge, and a styled Pause
  toggle. Empty state and error state are styled.

Behaviour:
- Soft refresh: clicking Recheck does not change the URL, does not
  scroll to top, and updates the live-region announce with "Snapshot
  refreshed".
- Subagents is reachable from the sidebar. (Even if Phase 1 is the
  Foundation phase, the sidebar entry is a Phase-1 surface refactor
  per §6.7.)
- **axe-core:** zero violations on Dashboard hero and Work Card
  surfaces in both themes (baseline scan; deeper scan in Phase 2).

### Phase 2 QC checks

- Every surface renders without console errors. **Run console
  scan twice — once against a populated mock snapshot, once
  against the live `/api/snapshot` endpoint.** A red light in
  either is a fail.
- Every surface uses the shared `Panel` + `StatusPill` primitives.
- Every list surface shows the shared `EmptyState` when its data is
  empty.
- Work Card Drawer: Tab cycles inside the drawer; Escape closes it;
  focus returns to the trigger card.
- Subagents is reachable from the sidebar.
- **Cost/usage tile on Subagents (Chris#6 + P1#3):** the four
  tiles render real numbers (not all `--`) against a populated
  snapshot. The "Cost today ($)" tile carries a non-`--` value
  formatted as `$X.XX` in both themes. With the API returning
  empty stats, all four tiles show `--` and the "rate
  unavailable" tooltip is reachable via keyboard.
- Toast host is the only place success/error messages render. No
  `<p className="statusLine">` left in the codebase.
- Focus rings are visible on every interactive element at all five
  viewports.
- Lighthouse accessibility score ≥ 95 on every surface.
- axe-core: zero violations on Dashboard, Work, Missions,
  Subagents, Operations, Approvals, Cron.

### Phase 3 QC checks

- Bulk-select on Work Board: Shift-click selects a range; clicking the
  header checkbox toggles all; action bar appears at the bottom with
  the right count.
- **Bulk-action parity on Approvals (Chris#7 + P1#7):** the
  Approvals queue has a checkbox column on each pending card; same
  Shift-click range select; same bottom action bar with "Approve
  selected", "Reject selected with reason", "Clear selection". Audit
  log receives one entry per approved/rejected request, NOT one
  bulk entry.
- Inline edit on Work Card Drawer fields saves without opening a new
  drawer; success toast appears; field updates on close.
- Shortcut overlay opens with `?` from every surface; lists all
  shortcuts; closes with `?` or `Esc`.
- **`Cmd/Ctrl+K` command palette (P1#1 + Chris#4):** with focus
  on any surface, pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows /
  Linux) opens the palette within one frame. Typing `cro`,
  `approv`, `suba`, etc. narrows the result list. Arrow keys
  navigate; Enter selects and routes to the target surface via
  `useRouter().push(...)`. Esc dismisses; click-outside dismisses.
  The palette and the shortcut overlay are mutually exclusive —
  opening one closes the other. Verify on macOS Safari, Windows
  Chrome, Windows Firefox.
- `g d` jumps to Dashboard; `g w` jumps to Work; `g m` jumps to
  Missions; `g s` jumps to Subagents; `g o` jumps to Operations;
  `g a` jumps to Approvals; `g c` jumps to Cron.
- `/` focuses the active surface's search input (when the surface has
  one).
- Copy-to-clipboard works on Work Card IDs, mission IDs, agent target
  names.
- **Toast undo on every destructive action (Chris#12):**
  - Cron delete → toast "Deleted <jobName>. Undo" → click Undo
    within 10s → the job reappears in the list with its prior
    schedule / skills / provider.
  - Cron pause / resume → toast "<jobName> paused / resumed. Undo"
    → click Undo → the enabled pill flips back.
  - Approvals reject (single OR bulk) → toast "Rejected <requester>
    / N requests. Undo" → click Undo → the request returns to
    Pending.
  - Work Board bulk move → toast "Moved N cards to <lane>. Undo"
    → click Undo → cards return to origin lane. Verify undo
    works for lane move only (not single-card delete, which is
    out of Phase 3 scope unless called out by Clix).
  - **`useAnnounceOnChange` + Approvals subscription (Chris#11):**
    with a pending approval request polled in, the live region
    announces "1 new approval pending". This verifies the hook
    AND the Approvals subscription are both wired in Phase 3;
    Phase 4 QC extends verification to Cron / Work / Subagents
    per surface.

### Phase 4 QC checks

- Drag-and-drop: dragging a card between Work Board lanes moves the
  card; release commits the change; the API call surfaces success or
  failure via toast.
- Cron "Next 3 firings" preview shows three human-readable firings
  from the saved schedule.
- Forced-colors mode (Windows High Contrast): borders and pill
  backgrounds use system colors; nothing disappears.
- **Per-surface live-region announcer (Chris#11):** force a polling
  panel to receive fresh data on each surface and confirm the
  announcer speaks:
  - **Cron:** a job fires (or simulate a fire); the live region
    announces "<jobName> fired (status: success / failed)".
    Two firings in <60s throttle to one announcement.
  - **Approvals:** a new pending request arrives; the live region
    announces "1 new approval pending".
  - **Work:** a bulk-move commits; the live region announces
    "Work cards moved to <lane>" (singular announcement per
    bulk action, not N).
  - **Subagents:** the cost tile value changes by >10%; the live
    region announces "Subagent cost updated to $<X.XX>".
  - All announcements are polite (`aria-live="polite"`), not
    assertive.
- **Print stylesheet (Chris#5):** open a Work Board view AND an
  Approvals queue AND a Cron Manager list. Trigger
  `window.print()` (or Chrome → Print). Confirm:
  - Sidebar, header, DashboardSubNav, ToastHost, bulk-action bar,
    ShortcutOverlay, LiveRegionHost are hidden.
  - Cards render on opaque white; no box-shadow; no
    translucent borders.
  - A letterhead block at the top reads "Stronghold" +
    surface title + date + last-refresh timestamp.
  - A right-aligned footer reads "Page N of M".
  - Each Work Card / Approval / Cron row has its `(cmd://.../<id>)`
    URL rendered in plain text.
  - For Approvals, the "Resolved" stack renders below the pending
    list (visible in print even when collapsed in the live UI).
  - Save a print preview screenshot per surface as
    `qc/phase4/print-{surface}.png`.
- **WCAG AAA spot-check (Chris#9):** run Lighthouse accessibility
  on each of the four target surfaces and confirm a score of **100
  (AAA)** on each:
  - **Dashboard hero.**
  - **Work Card (a single populated card in the Work Board).**
  - **Approvals queue (a single pending card).**
  - **Cron Manager list.**
  - Lighthouse run with theme = light AND theme = dark at 1440px.
  - axe-core in the same tab; zero violations on each.
- Final Lighthouse run: accessibility ≥ 95 on every surface.
- **Bundle size check (P2#4, per-dep ceilings):** confirm any new
  dependency landed within its per-dep ceiling:
  - Inter font, if used: ≤ 30 KB gz, local latin-subset WOFF2.
  - dnd-kit, if used: ≤ 10 KB gz.
  - In-house cron parser: 0 KB (file in
    `src/util/cronPreview.ts`).
  - Any other new dep: Igris sign-off attached to commit message.
- **Performance at 1920px (Chris#10):** initial paint < 50ms at
  1920px; bulk-select toggle no jank at 1920px; the
  `<body>` content caps at `--container-max: 1600px;` so the
  dashboard stays balanced at 4K.

---

## 11. Trade-offs and open questions

- **v1 lessons carried forward into v2.1 (P1#9 — explicit):** every
  phase of v2 must respect these three lessons from the v1 audit;
  they are not negotiable and they survive into a hypothetical v2.2:
  1. **".btn-secondary" must be visually distinguishable on EVERY
     surface in EVERY theme.** V1's literal `background: transparent`
     fill made the chip invisible against light cream. v2 fixes this
     in §4.1 with an explicit `background-color: var(--color-surface)
     + border: 1px solid var(--color-accent-text)` rule and Phase 1 QC
     visually verifies every variant against both themes via
     screenshot. CI that does not include that screenshot gate is
     not acceptable; the bug will recur on the next regression.
  2. **Every component must read tokens, never raw hex.** A
     component that hardcodes `#fff` or `rgba(255,255,255,0.08)` is
     a bug. v2 enforces this via component review (§9 constraints)
     and the global grep gate in Phase 1 QC. Future regressions
     should be caught by the same gate.
  3. **Screenshot both themes before declaring a Phase done.** This
     is a visual QC gate, not a grep gate. Tusk catches what the
     tools cannot. Phase 1 QC (§10) requires explicit button-variant
     screenshots, reduced-motion screenshots, and dashboard-subtitle
     line-count screenshots at the five target viewports in BOTH
     themes. A phase that ships without those screenshots is not
     done.

- **Inter as a system font vs variable font.** The DESIGN.md spec
  prefers system-ui for bundle safety. v2 keeps that. **Phase 1
  interleaves the system-font verification across all FIVE
  viewports in BOTH themes BEFORE the `<link>` is removed for
  real** (Chris#3). The Inter fallback is held in
  `--font-sans: 'Inter', system-ui, ...` until Phase 1 QC confirms
  the system stack renders cleanly on Chrome / Safari / Firefox /
  Edge at 360 / 768 / 1024 / 1440 / 1920. If Chris later demands
  exact Inter everywhere, ship one local latin-subset variable WOFF2
  with `font-display: swap`, measure gzipped size first, reject if
  it exceeds **30 KB gz** (the Inter-specific ceiling — see
  bundle-size budget in §9 Phase 4). Lyra flags this to Igris so the
  engineering-cost call is explicit.

- **Drag-and-drop dependency.** Native HTML5 DnD works but is quirky
  on touch. dnd-kit is more reliable but adds ≤ 10 KB gz (the
  dnd-kit-specific ceiling, per the §9 Phase 4 bundle-size budget —
  the 30 KB ceiling is for Inter, not dnd-kit). Decision deferred to
  Phase 4; Clix to present a bundle-cost estimate.

- **Cron parser.** A 5-field cron parser in plain TS is ~150 lines and
  zero deps. Ship in-house in `src/util/cronPreview.ts`. If we need
  timezone-aware firings, that's a different conversation; defer to a
  later phase.

- **Toast undo window.** 10 seconds is the common default; no
  research-grade number behind it. Clix to confirm with Igris.
  Applies to ALL destructive actions per Chris#12, not just cron
  delete.

- **Subagent `Wrapper availability` filter** persists to
  `localStorage` under `stronghold.subagents.wrapperFilter` (see
  §6.7 — Chris#8). Not URL params. The key is namespaced, the
  default is `'all'`, invalid values fall back to `'all'` on read.
  No further deferral.

- **EmptyState tone.** Some empty states are "nothing wrong" (no
  pending approvals) and some are "something needs your attention" (no
  recent activity). EmptyState should accept a `tone` prop; v2 default
  is neutral.

- **Toast positioning.** Bottom-center on desktop, top on mobile (so it
  doesn't fight the iOS home indicator). Lyra's call; Tusk to confirm
  on both platforms.

- **Live-region politeness.** Polling panels update silently today; v2
  announces per-surface events (Chris#11). The announcer must be
  polite (`aria-live="polite"`), not assertive. Assertive would
  interrupt active screen-reader speech. Per-surface throttling:
  Cron announces at most once per minute when multiple jobs fire in
  the same window; Subagents announces only on >10% cost change;
  Work announces a single line per bulk action, debounced.

- **Theme persistence on logout.** Stronghold is local-only; no
  logout. localStorage.stronghold.theme is fine.

- **Audit-log invariant text on Approvals.** "Every resolve writes
  one immutable audit entry; no cascading writes" — copy needs Igris
  sign-off; might be better as a `?` icon tooltip than inline text.

- **Phase 1 must NOT remove the Google Fonts fallback before removing
  the link.** If the Inter fallback disappears and the system font
  stack fails for some reason, first-paint text vanishes. Keep the
  fallback until the system-font stack is verified on Chrome / Safari /
  Firefox / Edge at the FIVE target viewports (Chris#3 — see
  §10 Phase 1 QC "Inter fallback verification"). The §3.5 inline
  theme-init script runs before stylesheet parse, so the cascade
  resolves to whichever font the OS picked.

- **`html[data-theme="dark"]` cascade.** CSS variables on `:root`
  must not include any dark-specific overrides; the dark block must
  redefine every variable. Otherwise we'll silently inherit a dark
  value into light. Tusk's YELLOW verdict flagged this; v2.1 §3.5
  carries the clarification for Clix.

---

## 12. End of spec

Lyra — Phase 0 v2.1 work card complete (Tusk YELLOW addressed;
11 P1 + 5 P2 + 12 Chris decisions baked in). Handoff to Igris
for re-review and re-commit. Clix implementation brief in §9.
Tusk QC brief in §10. Open questions in §11. Existing
`docs/design/DESIGN.md` stays as the historical Phase 47 spec;
this file is the v2.1 of record.