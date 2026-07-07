# Lyra — Phase 3 Implementation Brief (Dashboard Rewire)

**Date:** 2026-07-07
**Author:** Lyra (design lead) ← Belion (coordinator dispatch)
**Reviewer:** Igris → **Implementation:** Clix (90 min budget) → **QC:** Tusk
**Codebase:** `C:/Users/tophe/agent-army-stronghold/`
**Integration target:** `src/components/AgenticOsDashboardPanel.tsx` (529 lines)
**Previous:** Phase 0 + Phase 1 + Phase 2 (commits `a090e83`, `3c72c0c`) shipped primitives only

---

## 0. Goal restatement

Chris reviewed Phase 2 commit `3c72c0c` and reported no visible design improvement. Phase 3 must ship visible design improvement on `http://127.0.0.1:5174/` that Tusk can verify with browser screenshots in both themes. Phase 2 built the primitive toolkit (`<Panel>`, `<Stat>`, `<WorkCard>`, `<StatusPill>`, `<EmptyState>`, `<AgenticOsCard>`, `<Skeleton>`); Phase 3 wires those primitives into the Dashboard surface and removes every `—` placeholder and every `awaiting live wiring` string Chris can see. If Clix finishes the P0 rewire inside 90 minutes, ship P0 only. If time remains, ship the P1 empty/error states. P2 (bulk actions, Cmd-K, inline edit, keyboard shortcuts, undo toasts) is explicitly out of scope and routes to Phase 4.

---

## 1. Primitive mapping table (P0 — the Dashboard rewire)

The integration target is `src/components/AgenticOsDashboardPanel.tsx`. The line numbers below refer to that file at HEAD. Every "remove" line in this table is one `git grep` hit that must go to zero before Tusk signs off.

| # | Section (current line range) | Current render | Phase 3 primitive | Concrete change |
|---|---|---|---|---|
| 1 | Header band (L370–387) | `<section className="panel wide agenticOsPanel">` with raw `<h2>Agentic OS Dashboard</h2>`, `<p className="subtitle">`, `<span className="status live">LIVE</span>`, `<button className="agenticOsRecheck btn-secondary">Recheck</button>` | NEW header layout per §2 below (no primitive — explicit layout spec) | Replace the 4-element header with eyebrow + h1 + subtitle + right-aligned action row. Move LIVE/PLACEHOLDER pill into `<StatusPill tone="success">` / `<StatusPill tone="neutral">`. Wrap metadata in `<dl>` strip with `<StatusPill>` for connection state. |
| 2 | Dashboard subnav (`<DashboardSubNav>` — outside this file) | Pill anchor links | Already a primitive | Verify anchors scroll. The 4-up hero row already has `id="section-health"` (L390). Add `id="section-hero"` to the new header, `id="section-work"` to the Open Work Items section (L428), `id="section-activity"` to the Activity section (L456). |
| 3 | Hero stat tiles (L390–403) | 4× `<article className="agenticOsHeroStat">` rendering raw `<span>` label + `<strong>` value + `<p>` detail | `<Stat>` × 4 (file `src/components/Cards/Stat.tsx`) | Replace each `<article>` with `<Stat label={...} value={...} hint={...} />`. `Stat` accepts `value: string \| number`. Wire from `buildHeroStats()` — never fall back to `'—'` if the snapshot field is present. If `tests.tests === 0` OR `build.bundleKb === 0` at runtime, render `<Stat>` with `value="0"` and `hint="awaiting first run"` (no em-dash). |
| 4 | QC Score History panel (L406–423) | Raw `<section>` + `<h3>` + custom sparkline SVG (L221–265) | `<Panel eyebrow="AGENTIC OS" title="QC Score History" id="section-qc">` + `<AgenticOsCard tone="accent">` for the headline score + keep the existing inline sparkline | Wrap L406–423 in `<Panel>`. Replace the headline `<p>` with `<AgenticOsCard tone="accent" label="Latest QC round" value={`${qcLatest.score}/100`} description={`${qcLatest.subject} — ${qcLatest.verdict}`} />`. Keep `renderSparkline()` unchanged (move it inline into the panel body). |
| 5 | Open Work Items (L428–453) | `<section>` + 3× `<article className="agenticOsWorkCard">` with raw `<span className="agenticOsWorkBadge">` + `<span className="status active">` + `<h4>` | `<Panel title="Open Work Items" id="section-work" actions={<StatusPill tone="info" label={`${workItems.length} items`} />}> + `<WorkCard>` × N | Replace each `<article>` with `<WorkCard id={w.id} title={w.title} subtitle={w.priority ? `priority: ${w.priority}` : undefined} laneId="open" owner={{ id: w.owner, name: w.owner }} status={w.status} priority={w.priority} dueAt={w.modifiedAt} />`. Remove the 3-card cap — render all `workItemsForCards` items (max 6; see §3). Delete the placeholder block at L437–451. |
| 6 | Activity table (L456–481) | Raw `<table className="agenticOsTable">` | `<Panel title="Activity" id="section-activity" actions={<StatusPill tone="neutral" label={`${activity.length} entries`} />}> + existing `<table>` | Wrap the `<table>` in `<Panel>`. Keep the table structure but add `caption="Last 5 specialist dispatches"` for a11y. Replace the empty row at L474–477 with `<EmptyState title="No recent activity" description="Specialist dispatches will appear here" icon={<Activity />} />` rendered as a single `<tr><td colSpan={4}>…</td></tr>`. |
| 7 | Discord Coordination (L489) | `<div id="section-coordination"><DiscordCoordinationPanel /></div>` | Verify inside `DiscordCoordinationPanel.tsx` uses `<EmptyState>` for its error state | The wrapper does not need to change. Clix verifies `DiscordCoordinationPanel` already renders `<EmptyState icon={AlertTriangle} title="Discord unreachable" description={err.message} action={{ label: 'Retry', onClick: recheck }} />` on fetch failure; if not, add it inside that component. |
| 8 | Routing Flow (L495) | `<div id="section-routing"><ActivityGraphPanel /></div>` | Verify inside `ActivityGraphPanel.tsx` uses `<EmptyState>` for empty state | The wrapper does not need to change. Verify the panel renders `<EmptyState icon={Clock} title={\`No hand-offs in the last ${windowLabel}\`} description={\`Showing activity for the last ${window}. Try a wider window to see more.\`} />` when its `handOffs.length === 0`. |
| 9 | Memory Status (L496) | `<div id="section-memory"><MemoryStatusPanel /></div>` | Verify `<MemoryStatusPanel>` uses `<Skeleton>` while loading | The wrapper does not need to change. Verify the panel renders `<Skeleton count={3} />` while `loading` is true; otherwise its existing content. |

**The em-dash rule (P0 acceptance, non-negotiable):** every `—` placeholder visible in the rendered DOM at L175 (`tests.tests > 0 ? String(tests.tests) : '—'`) and L184 (`build.bundleKb > 0 ? \`${build.bundleKb} KB\` : '—'`) must become either a real number from the snapshot or `value="0"` with `hint="awaiting first run"`. Same rule for the work-item placeholder at L445 (`<span className="muted">—</span>`) and L446 (`<time className="agenticOsMono">—</time>`) — these die when the placeholder block is removed in change #5. Tusk's grep must return 0 hits for `>—<` inside `<article className="agenticOsHeroStat">` and 0 hits for `awaiting live wiring` in the Dashboard route.

---

## 2. Header layout spec (the most visible change)

Current header (L372–387) stacks four competing elements. Phase 3 collapses to three lines + a right-aligned action row. Exact values below — no hand-waving.

### 2.1 Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ENGINEERING DIVISION STRONGHOLD                  [☼ Theme] [LIVE] [↻ Recheck]│
│  # Agent-Army Mission Control                                                 │
│  Igris-owned Stronghold cockpit for visibility, guarded proposals, and safe   │
│  mock orchestration.                                                          │
│                                                                               │
│  [OWNER  Igris] [COORDINATOR  Belion] [BACKEND  connected ●] [KILL  inactive] │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Concrete CSS (append to `src/styles.css` under a new `/* Phase 3 — Dashboard header */` block)

```css
.dashboardHeader {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "eyebrow actions"
    "title   actions"
    "sub     actions"
    "meta    meta";
  gap: 8px 16px;
  align-items: start;
  padding: 28px 32px 24px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
}
.dashboardHeader__eyebrow { grid-area: eyebrow; }
.dashboardHeader__title   { grid-area: title; }
.dashboardHeader__sub     { grid-area: sub; max-width: 820px; }
.dashboardHeader__actions { grid-area: actions; align-self: center; display: inline-flex; gap: 8px; }
.dashboardHeader__meta    { grid-area: meta; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border-subtle); }

.dashboardHeader__eyebrow {
  margin: 0;
  font-size: 12px;          /* matches .eyebrow */
  font-weight: 510;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
.dashboardHeader__title {
  margin: 0;
  font-size: clamp(1.75rem, 3vw, 2.25rem);
  font-weight: 510;
  line-height: 1.1;
  letter-spacing: -0.72px;
  color: var(--color-text);
}
.dashboardHeader__sub {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--color-text-tertiary);
}
.dashboardHeader__meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.dashboardHeader__meta > div {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
}
.dashboardHeader__meta dt {
  font-size: 11px;
  font-weight: 510;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}
.dashboardHeader__meta dd {
  margin: 0;
  font-size: 13px;
  font-weight: 510;
  color: var(--color-text);
  font-family: var(--font-mono);
}

@media (max-width: 720px) {
  .dashboardHeader {
    grid-template-areas:
      "eyebrow"
      "title"
      "sub"
      "actions"
      "meta";
  }
  .dashboardHeader__actions { justify-self: start; }
}
```

### 2.3 Hero integration decision (revised after Igris REJECT)

`Surfaces.tsx:45` already renders `<Hero id="section-hero" ... />` BEFORE `AgenticOsDashboardPanel` mounts. The existing `Hero` (src/components/Hero.tsx, 59 lines) renders the page-level `<h1>Agent-Army Mission Control</h1>`, the dl metadata strip, the Refresh button, and `id="section-hero"`. Naively mounting the JSX below would produce 2× h1, 2× `id="section-hero"`, 2× dl, 2× Recheck — breaking anchor scroll, a11y, and visual hierarchy.

**Resolution: Path A — REPLACE the existing Hero.** Verified `grep -rn 'from .*Hero' src/` returns exactly 1 hit (`Surfaces.tsx:14`), so `Hero` is not imported anywhere else. Clix deletes the `<Hero id="section-hero" ... />` line at `Surfaces.tsx:45` and deletes `src/components/Hero.tsx`. The §2.3 JSX below becomes the canonical Dashboard header.

If the grep ever returns >1 hit outside `Surfaces.tsx`, fall back to **Path B** (keep `Hero`, move the new design language to the inner panel section) — do not ship a duplicated header.

### 2.4 React (replace L372–387 in `AgenticOsDashboardPanel.tsx`)

```tsx
<header className="dashboardHeader" id="section-hero">
  <p className="dashboardHeader__eyebrow">Engineering Division Stronghold</p>
  <h1 className="dashboardHeader__title">Agent-Army Mission Control</h1>
  <p className="dashboardHeader__sub">
    Igris-owned Stronghold cockpit for visibility, guarded proposals, and safe mock orchestration.
  </p>
  <div className="dashboardHeader__actions">
    <button type="button" className="themeToggle" aria-label="Toggle theme">☼</button>
    <StatusPill tone={data.source === 'live' ? 'success' : 'neutral'} label={data.source === 'live' ? 'LIVE' : 'STATIC'} />
    <button type="button" className="btn-secondary" onClick={() => { void recheck(); }}>Recheck</button>
  </div>
  <dl className="dashboardHeader__meta">
    <div><dt>Owner</dt><dd>{snapshot?.owner || 'Igris'}</dd></div>
    <div><dt>Coordinator</dt><dd>{snapshot?.coordinator || 'Belion'}</dd></div>
    <div>
      <dt>Backend</dt>
      <dd>
        <StatusPill tone="success" label="connected" icon="dot" />
      </dd>
    </div>
    <div><dt>Kill switch</dt><dd><StatusPill tone="neutral" label="inactive" icon="dot" /></dd></div>
  </dl>
</header>
```

Theme toggle and Recheck must remain keyboard-reachable (`Tab` order: Theme → LIVE/PLACEHOLDER pill → Recheck). StatusPill reads "connected"/"inactive" to screen readers; the visible text is rendered by StatusPill internals.

### 2.5 a11y + reduced-motion notes

- `<h1>` is the only h1 on the Dashboard surface. Existing `<h2>Agentic OS Dashboard</h2>` (L374) is removed.
- Eyebrow is a `<p>`, not an `<h*>`, so it does not inflate heading depth.
- `prefers-reduced-motion`: no animations are added in this block (the existing CSS does not animate the header).

---

## 3. Data wiring notes (kills the "—" placeholders)

| Stat tile (`Stat label`) | Source field on `StrongholdSnapshot` | Format | Fallback when source empty |
|---|---|---|---|
| TESTS | `snapshot.health.tests.tests` (number) | `String(tests)` | `value="0"`, `hint="awaiting first run"` |
| BUILD | `snapshot.health.build.bundleKb` (number) | `${bundleKb} KB` | `value="0 KB"`, `hint="awaiting first run"` |
| AUDIT | `snapshot.health.auditEntries` (number) | `String(auditEntries)` | `value="0"`, `hint="no audit entries yet"` |
| CRON | `snapshot.health.cronJobs` (number) | `String(cronJobs)` | `value="0"`, `hint="no jobs scheduled"` |

Existing `buildHeroStats()` at L163–207 already computes these — only the `'—'` literals at L175 and L184 change. The `awaiting live wiring` literals at L178, L187, and the in-DOM placeholder at L443 die with the placeholder block.

**WorkCard data wiring:** `<WorkCard>` requires `laneId: WorkCardStatus`. The 3 work items currently shown are `pending` / `in_progress` / etc. (`WorkItem.status` is already a `WorkCardStatus`). Pass `laneId={w.status}` so Phase 4 drag-and-drop can pick them up unchanged. Hard-cap display at 6 cards (not 3) — Chris sees more value in density than in sparseness on the Mission Control page. If `workItems.length > 6`, render 6 + a `<Panel actions={...}>` footer link that scrolls to the Work surface (`<a href="#section-work" onClick={scrollToWork}>View all {workItems.length} items</a>`). Wait — the `Open Work Items` panel IS `section-work`. Footer's CTA is therefore "Open Work surface" → `<a href="/work">Open Work surface →</a>` (existing route).

**Activity table:** `<Panel>` gets `actions={<StatusPill tone="neutral" label={\`${activity.length} entries\`} size="sm" />}>`. The body keeps the existing `<table>` (column structure unchanged). Add `<caption className="sr-only">Last 5 specialist dispatches</caption>` immediately after `<table>` opens. Empty-state copy replaces L474–477.

---

## 4. Visual north-stars

Concrete element borrowings, not aspirational aesthetics. Chris named dashboards he admires but did not name them; these are Lyra's picks with named elements:

### 4.1 Linear — borrow: clean 1-line h1, generous section spacing, monospace metadata

- **Element:** the Linear project header — single-line h1 in `var(--color-text)`, no eyebrow above it, but a muted monospace metadata strip below the subtitle showing IDs and timestamps.
- **Applied to Dashboard:** §2 header layout. The h1 stands alone (no eyebrow competing above). The `<dl>` metadata strip uses `var(--font-mono)` and `var(--color-text-tertiary)` for value text — Linear treats IDs and timestamps as data, not prose.
- **Not applied:** Linear's keyboard-palette-first navigation (Cmd-K) — that's P2 in §6.

### 4.2 Vercel — borrow: dark-mode contrast that does not strain, accent used sparingly

- **Element:** Vercel's dashboard project cards in dark mode — `var(--color-surface-elevated)` backgrounds with a single 4px accent stripe down the left edge (the project's status color). Text stays at `var(--color-text)` (almost-white) with no pure-white blowouts.
- **Applied to Dashboard:** `<AgenticOsCard tone="accent">` for the QC score headline (already typed in `AgenticOsCard.tsx`). Token `var(--color-accent)` is `#7170ff` in dark mode (styles.css L93) and `#5e6ad2` in light mode (L22) — Linear-blue family, restrained saturation, both themes read at WCAG AA on the canvas.
- **Not applied:** Vercel's neon-on-near-black contrast trick — the existing tokens already nail this.

### 4.3 GitHub Projects — borrow: WorkCard density, lane visual language

- **Element:** GitHub Projects v2 cards — 2-line ellipsis title, status pill top-right, owner avatar + due-date in the footer row at 12px. Cards are 240px wide minimum and breathe in a 4-up grid.
- **Applied to Dashboard:** the Open Work Items grid at `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` (was `repeat(3, 1fr)` at L432 — verify the actual class `agenticOsWorkGrid` and update if needed). `<WorkCard>` already renders title + status pill top-right + owner avatar + due date in the footer (per `Cards/WorkCard.tsx`).
- **Not applied:** GitHub's full board with drag-and-drop — that's Phase 4.

---

## 5. Empty / error state spec (P1 — ship only if Clix finishes P0 inside 60 min)

| Surface | When | Primitive | Copy |
|---|---|---|---|
| Hero stats | snapshot still fetching | `<Skeleton height={48} width="100%" count={4} />` inside the 4-up grid | none (skeleton only) |
| QC Score History | `qcHistory.length === 0` | `<EmptyState icon={<BarChart3 />} title="No QC rounds yet" description="Sentinel + Tusk verdicts will appear here once a review is captured." />` | as written |
| Open Work Items | `workItems.length === 0` | `<EmptyState icon={<ClipboardList />} title="No open work items" description="Pull work from a mission to get started." action={{ label: 'Open Work', href: '/work' }} />` | as written |
| Activity | `activity.length === 0` | `<EmptyState icon={<Activity />} title="No recent activity" description="Specialist dispatches will appear here." />` | as written |
| Discord Coordination | fetch failed | `<EmptyState icon={<AlertTriangle />} title="Discord unreachable" description={err.message} action={{ label: 'Retry', onClick: recheck }} />` | verify inside `DiscordCoordinationPanel.tsx`; add if missing |
| Routing Flow | `handOffs.length === 0` | `<EmptyState icon={<Clock />} title={\`No hand-offs in the last ${windowLabel}\`} description={\`Showing the last ${window}. Widen the window to see more.\`} />` | verify inside `ActivityGraphPanel.tsx`; add if missing |
| Memory Status | `loading === true` | `<Skeleton count={3} />` | verify inside `MemoryStatusPanel.tsx`; add if missing |

`prefers-reduced-motion`: `<Skeleton>` already disables its shimmer in that mode (per `Cards/Skeleton.tsx` contract).

---

## 6. Build order (90-minute Clix budget)

Each step is independently committable. Steps marked `[verify]` do not change code if the file already satisfies the spec — Clix checks with `grep` first.

1. **(5 min)** Read `src/components/Cards/Panel.tsx`, `Stat.tsx`, `WorkCard.tsx`, `Feedback/StatusPill.tsx`, `Feedback/EmptyState.tsx`, `Feedback/Skeleton.tsx`, `AgenticOsCard.tsx`. Confirm the APIs match §1 above.
2. **(10 min)** Append the `.dashboardHeader*` CSS block to `src/styles.css` (under a `/* Phase 3 */` header comment). Do not delete existing `.agenticOsHeader*` rules — other routes may still use them until §8 cleanup ships in a follow-up.
3. **(20 min)** Replace L370–387 in `AgenticOsDashboardPanel.tsx` with the JSX from §2.4. Wire the StatusPill import at the top of the file. **Hero pre-step (Path A):** BEFORE step 3, edit `src/components/Surfaces.tsx` — remove `<Hero id="section-hero" snapshot={snapshot} backendOk={backendOk} killSwitch={killSwitch} onRefresh={onRefreshEverything} />` at L45 and remove the `import { Hero } from './Hero';` at L14. Then `rm src/components/Hero.tsx`. Verify `grep -rn 'from .*Hero' src/` returns 0 hits before proceeding to step 3.
4. **(10 min)** Replace L390–403 with four `<Stat>` calls fed by `buildHeroStats()`. Remove the `—` literal at L175 and L184 inside `buildHeroStats()` — replace with `value: '0'` and `detail: 'awaiting first run'`.
5. **(10 min)** Wrap L406–423 (QC Score History) in `<Panel>`. Replace the headline `<p>` (L412–417) with `<AgenticOsCard tone="accent" ... />`. Keep the sparkline as-is.
6. **(10 min)** WorkCard pre-step: edit `src/types.ts` and add next to the existing `WorkCardStatus` alias at L62 — `export const WORK_CARD_STATUSES = new Set<WorkCardStatus>(['planned', 'active', 'blocked', 'review', 'complete']);` plus `export function isWorkCardStatus(value: unknown): value is WorkCardStatus { return typeof value === 'string' && WORK_CARD_STATUSES.has(value as WorkCardStatus); }`. Then wrap L428–453 (Open Work Items) in `<Panel>`. Replace each `<article className="agenticOsWorkCard">` with `<WorkCard>`. Use `laneId={isWorkCardStatus(w.status) ? w.status : 'pending'}` (NOT `WorkCardStatus.includes(...)` — the alias has no runtime array). Delete the placeholder block L437–451. Update `workItemsForCards` slice from `.slice(0, 3)` to `.slice(0, 6)` at L352.
7. **(10 min)** Wrap L456–481 (Activity table) in `<Panel>`. Add `<caption className="sr-only">Last 5 specialist dispatches</caption>`. Replace L474–477 empty-row with `<tr><td colSpan={4}><EmptyState ... /></td></tr>` (or move the EmptyState outside the `<table>` and render conditionally — Clix chooses the cleaner option).
8. **(10 min) [verify]** Inside `DiscordCoordinationPanel.tsx`: confirm fetch-failure path renders `<EmptyState>` with Retry. If not, add it.
9. **(10 min) [verify]** Inside `ActivityGraphPanel.tsx`: confirm empty-handOffs path renders `<EmptyState>` with window label. If not, add it.
10. **(5 min) [verify]** Inside `MemoryStatusPanel.tsx`: confirm loading path renders `<Skeleton>`. If not, add it.
11. **(remaining time)** If buffer remains: §5 P1 empty-states for QC + Work + Activity surfaces that the wrapper change did not already cover. Do not start P2 work.

**Out of scope for Clix (P2 → Phase 4):** form primitive wiring into Operations editors, AuditTrail "Show all" toggle, inline edit on Work Card Drawer fields, Cmd-K palette, bulk actions on Work + Approvals, keyboard shortcuts on Approvals (`j`/`k`/`a`/`r`/`?`), toast undo on destructive actions, per-surface live-region announcer.

---

## 7. Verification protocol

### 7.1 Mechanical gates (must pass before Tusk touches screenshots)

```bash
cd /c/Users/tophe/agent-army-stronghold
npm test -- --run          # 50 files, 237+ tests must pass
npm run build              # gz total under 250 KB (currently 79.25 KB)
npm run dev                # then `node scripts/screenshot-phase2.mjs` — 80 PNGs produced
```

### 7.2 Visual spot-check (Tusk, both themes, 1440×900 viewport on `http://127.0.0.1:5174/`)

- [ ] Header reads as 1 eyebrow + 1 h1 + 1 subtitle, NOT 4 stacked elements. Action buttons (Theme / Status pill / Recheck) sit to the right of the title block.
- [ ] All 4 hero stat tiles show real numbers — never `—`, never `awaiting live wiring`. Light theme: TESTS shows e.g. `237`. Dark theme: same.
- [ ] Sections wrapped in `<Panel>` with consistent 12px/16px padding and the bordered look from `var(--color-border)`.
- [ ] Work items render as `<WorkCard>` (title, status pill top-right, owner + due date footer).
- [ ] QC score headline reads as `<AgenticOsCard>` with accent left border, score value prominent.
- [ ] `<dl>` metadata strip below subtitle reads `OWNER Igris · COORDINATOR Belion · BACKEND connected ● · KILL inactive` in monospace.

### 7.3 Tusk QC checklist (grep + visual)

- [ ] `grep -rn 'from .*Hero' src/` returns 0 hits (no orphan Hero import — Path A proof).
- [ ] `[ ! -f src/components/Hero.tsx ]` is true (`Hero.tsx` deleted).
- [ ] `grep -n 'className="dashboardHeader' src/components/` returns exactly 1 hit at `AgenticOsDashboardPanel.tsx` (no duplication, since Hero is gone).
- [ ] `grep -rn 'WORK_CARD_STATUSES\|isWorkCardStatus' src/types.ts` returns ≥ 2 hits (Set + guard present, not just the alias).
- [ ] `grep -nE '\bHeroStats\b|\bOpenWork\b|\bActivity\b' src/components/AgenticOsDashboardPanel.tsx` returns 0 hits (legacy helper names removed or kept only as dead exports).
- [ ] `grep -nE 'statCard|workCardPrimitive|panelPrimitive|emptyState' src/components/AgenticOsDashboardPanel.tsx` returns ≥ 6 hits (primitive wiring present).
- [ ] No `—` placeholder visible in any of the 4 hero stat tiles.
- [ ] No string `awaiting live wiring` rendered in DOM on Dashboard route (`grep -rn 'awaiting live wiring' src/components/` returns 0 hits).
- [ ] Header layout matches §2.3 (3 text lines + right-aligned action row + dl strip).
- [ ] All 80 screenshots produced by `scripts/screenshot-phase2.mjs` show the multi-column grid intact (no overflow / no broken layout).
- [ ] `npm run build` reports gz size under 250 KB (CSS block added in §2.2 is ~1.3 KB raw, ~0.5 KB gz).

---

## 8. Out of scope (Phase 4 or later)

These were Phase 2 deferrals and stay deferred. Clix must not start any of them in Phase 3.

- Form primitive wiring into Operations editors (Operations form fields still render raw `<input>` / `<select>`)
- AuditTrail row cap with "Show all" toggle (still capped at 5 rows in Audit Trail surface)
- Inline edit on Work Card Drawer fields (drawer remains read-only for owner/schedule/status)
- Cmd-K palette (no `<ShortcutOverlay>` wiring)
- Bulk actions on Work + Approvals (no checkboxes, no sticky action bar)
- Keyboard shortcuts on Approvals (`j` / `k` / `a` / `r` / `?`)
- Toast undo on destructive actions (destructive actions still show success/danger toast without undo)
- Per-surface live-region announcer (the `LiveRegionProvider` stub remains a no-op)
- Drag-and-drop on Work Card Board (lanes still read-only; `laneId` field exists but unused for reordering)
- Mobile-optimized hero (the 720px breakpoint in §2.2 is the minimum; deeper mobile pass is Phase 4)

---

## 9. Risks + mitigations

1. **Risk:** `<WorkCard>` requires `laneId: WorkCardStatus` and the current `WorkItem.status` field is a `WorkCardStatus` already — but if a snapshot row has an unknown status (e.g. `'archived'` from a future source), TypeScript will reject at runtime even though it compiles. `WorkCardStatus` is only a type alias (see `src/types.ts:62`) — there is no runtime array, so `WorkCardStatus.includes(...)` throws `TypeError: WorkCardStatus.includes is not a function`. **Mitigation:** use the runtime type guard added in §6 step 6 — `laneId={isWorkCardStatus(w.status) ? w.status : 'pending'}` — and import it from `../types`. The `WORK_CARD_STATUSES` Set is the single source of truth for allowed values; log a `console.warn` once per unknown status so Chris can spot bad source data.
2. **Risk:** Replacing the hero `<article>` with `<Stat>` removes the `data-hero-id={stat.id}` and `data-status={stat.status}` attributes that existing screenshot tooling keys off. **Mitigation:** `<Stat>` renders as `<section id={id}>` — pass `id={stat.id}` so the existing `data-sparkline-points` / `data-hero-id` selectors continue to work. Verify by `grep -n 'data-hero-id' src/` after the change.
3. **Risk:** The `<EmptyState>` import path `../Feedback/EmptyState` is used by other surfaces. If the import path differs from `../Feedback/EmptyState` in the Dashboard file, build fails. **Mitigation:** Clix verifies the path matches the file tree from §6 step 1 before writing the import line.
4. **Risk:** `<Panel>` requires either a `title` OR an `eyebrow` to render its header bar; passing neither yields a borderless card. The Activity and Work Items sections both have titles (already at L430, L458) — no risk — but the QC section title lives at L408 (`<h3>QC Score History</h3>`). **Mitigation:** pass `title="QC Score History"` to `<Panel>` and delete the L408 `<h3>`.

---

## 10. Acceptance summary for Igris

If §7.3's checklist is green and the 4 em-dash placeholders are gone, the brief ships. Phase 3 is a wire-up brief, not a design overhaul — every change maps to a primitive that already exists. The header is the single place where new CSS ships, and §2.2 contains the exact values.