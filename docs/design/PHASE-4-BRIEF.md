# Lyra — Phase 4 Implementation Brief (Final Phase: Functional + A11y + Polish)

**Date:** 2026-07-07
**Author:** Lyra (design lead) ← Belion (coordinator dispatch)
**Reviewer:** Igris → **Implementation:** Clix (250-min Clix budget: pre-flight + 230 min build + final verification) → **QC:** Tusk
**Codebase:** `C:/Users/tophe/agent-army-stronghold/`
**Previous:** Phase 0 + 1 + 2 + 3 (`a090e83`, `3c72c0c`, `22260e8` shipped)

---

## 0. Goal restatement

Chris picked **Option C: ship all 11 Phase 4 items in one phase**. Clix gets a single 250-minute budget (pre-flight + 230 min build + final verification). Every item is tiered P0/P1/P2/P3 with a hard stop rule: if Clix runs out of time, he stops cleanly at the P-tier boundary. **P0 must ship** (Theme toggle fix, Cmd-K palette, drag-and-drop Work Card Board). **P1 ships if 90+ min remain after P0** (bulk actions on Work + Approvals, Approvals keyboard shortcuts, toast undo, mobile hero). **P2 ships if 180+ min remain** (Form primitive wiring, AuditTrail Show all toggle, Work Card Drawer inline edit, per-surface live-region announcer). **P3 is print stylesheet** — ship only if everything else done. Belion's hard rule: **the brief must be implementable end-to-end by Clix with NO design questions.** Every paragraph names a file, primitive, px value, or specific UI element.

---

## P0.1 — Theme toggle icon fix (10 min)

**Goal:** `ThemeToggle` renders `☾`/`☀` but is too small and tucked in the corner. Make it visibly interactive, aligned with the right-aligned action row from Phase 3.

**Integration target:** `src/components/AgenticOsDashboardPanel.tsx` (~L364 — already rendered inside `.dashboardHeader__actions`). The toggle is `<button type="button" className="themeToggle" aria-label="Toggle theme">☼</button>` per Phase 3 §2.4 JSX. CSS-only change — no JSX edits.

**Visual spec (append to `src/styles.css` under `/* Phase 4 — P0.1 */`):**

```css
.themeToggle { padding: 8px 12px; border-radius: var(--radius-md); border: 1px solid var(--color-border); background: var(--color-surface); color: var(--color-text); font-size: 18px; line-height: 1; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background var(--duration-fast), border-color var(--duration-fast), transform var(--duration-fast); }
.themeToggle:hover { background: var(--color-surface-hover); border-color: var(--color-border-strong, var(--color-border)); }
.themeToggle:active { transform: scale(0.95); }
.themeToggle:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .themeToggle { transition: none; } .themeToggle:active { transform: none; } }
```

**Token rule:** `--color-border-strong` is optional; fallback to `var(--color-border)` if absent. No new hex values.

**Acceptance:** Tusk screenshots both themes — toggle visible top-right, size matches Recheck, hover changes background, focus ring on Tab, theme still flips.

---

## P0.2 — Cmd-K palette (30 min)

**Goal:** `Cmd+K` / `Ctrl+K` opens a command palette overlay. 7 surfaces + 3 actions. ↑/↓/Enter/Esc keyboard model. Reduced-motion respected.

### §P0.2.1 — AppShell integration decision (Path B — adopt AppShell in App.tsx)

**Conflict:** `src/App.tsx:106-150` currently renders `<ToastProvider>`, `<Sidebar>`, `<main>`, and `<ToastHost>` **inline**. It does NOT use `<AppShell>`. The `src/components/Shell/AppShell.tsx` stub (7 lines) is currently dead code. Implementing Cmd-K only inside the orphan AppShell would not affect the running app.

**Decision: Path B — adopt AppShell in App.tsx.** Rationale: the AppShell stub already exists with the right shell structure (ToastProvider + LiveRegionProvider + Sidebar + main + ToastHost). Phase 4's Cmd-K palette is the forcing function to make AppShell real. Future surfaces get one place to add global listeners.

**Exact edit:** In `src/App.tsx`, replace the inline `<ToastProvider>...<ToastHost>` block at L106-150 with a single `<AppShell>` render. AppShell already accepts the 8 props needed (`activeSurface`, `onSurfaceChange`, `collapsed`, `onToggleCollapsed`, `approvalCount`, `backendOk`, `mobileNavOpen`, `onMobileNavigate`) — they are already in the stub signature. Sidebar / mobile hamburger / mobile backdrop / ToastHost are all already inside the AppShell stub; move them out of App.tsx into AppShell (they live there now). `main` with `renderSurface(active)` and the `data-surface-active={active}` attribute pass through as `children`.

**Render target:** `src/components/Shell/AppShell.tsx` (live now, no longer orphan). Upgrade the stub to mount the global `keydown` listener for `Cmd+K`/`Ctrl+K` and render `<Palette>` overlay. New file `src/components/Shell/Palette.tsx` (reused by P1.2 for `?` overlay). Keep `AppShell.tsx` — do NOT delete.

**Palette items (10 total):**

| # | Label | Icon | Hint | Action |
|---|---|---|---|---|
| 1–7 | Dashboard, Work, Missions, Operations, Approvals, Cron, Subagents | ⌂ ▤ ◎ ⚙ ✓ ⏱ ◇ | — | `onSurfaceChange('dashboard' \| ...)` |
| 8 | Refresh everything | ↻ | R | `onRefreshEverything` if exposed; else `disabled` |
| 9 | Toggle theme | ☾/☀ | T | flips `document.documentElement.dataset.theme` |
| 10 | Copy current URL | ⧉ | — | `navigator.clipboard.writeText(location.href)` |

**Visual spec (append to `src/styles.css`):**

```css
.paletteBackdrop { position: fixed; inset: 0; z-index: var(--z-overlay, 1000); background: rgba(0,0,0,0.4); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; animation: paletteFade var(--duration-fast) ease-out; }
.palette { width: 100%; max-width: 600px; max-height: 70vh; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); box-shadow: var(--shadow-card-elevated); display: flex; flex-direction: column; overflow: hidden; }
.paletteInput { width: 100%; padding: 14px 16px; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text); font-size: 15px; outline: none; }
.paletteList { overflow-y: auto; padding: 8px 0; }
.paletteItem { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 12px; padding: 8px 16px; background: transparent; border: 0; cursor: pointer; width: 100%; text-align: left; color: var(--color-text); font-size: 14px; }
.paletteItem[aria-selected="true"] { background: var(--color-surface-hover); }
.paletteItem:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
.paletteHint { font-family: var(--font-mono); font-size: 12px; color: var(--color-text-tertiary); }
.paletteEmpty { padding: 16px; color: var(--color-text-tertiary); font-size: 14px; text-align: center; }
@keyframes paletteFade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .paletteBackdrop { animation: none; } }
```

**Palette.tsx React shape:**

```tsx
type PaletteItem = { id: string; label: string; icon: string; hint?: string; action: () => void };
// State: open, query, activeIndex. Filter: case-insensitive substring on label.
// Keyboard: ↑/↓ adjust activeIndex (clamped); Enter invokes then closes; Esc closes.
// Container: <div role="dialog" aria-modal="true" aria-label="Command palette" className="paletteBackdrop" onClick={closeOnBackdrop}>
// Inner: <div className="palette" onClick={stopPropagation>.
// Input: <input className="paletteInput" type="search" autoFocus placeholder="Search surfaces, actions…" />.
// List: <div role="listbox"> with <button role="option" aria-selected={i === activeIndex}> per item.
// Empty state: <p className="paletteEmpty">No matches. Try 'work' or 'subagents'.</p>.
```

**AppShell.tsx upgrade:**

```tsx
// Inside AppShell:
const [paletteOpen, setPaletteOpen] = useState(false);
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(v => !v); }
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
// Render: <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSurfaceChange={onSurfaceChange} />.
```

**Acceptance:** Cmd+K opens palette over Dashboard; typing "sub" highlights Subagents; Enter navigates; Esc closes. Both themes. Tab order: input → list items. Reduced-motion: no fade.

---

## P0.3 — Drag-and-drop Work Card Board (45 min)

**Goal:** Lanes (PLANNED / ACTIVE / BLOCKED / REVIEW / COMPLETE) accept drops from any lane. Dragging changes card `status`, persists to localStorage. Keyboard alternative available.

**Integration target:** `src/components/WorkCardBoard.tsx` (188 lines). Uses `getWorkCardLaneId` (Phase 2 shim, `src/types.ts:88`). Lanes render as `<div className="workCardBoardLane" data-lane={lane}>` at L157. Cards render via `<WorkCardPrimitive>` at L166.

**HTML5 drag-and-drop (no external lib):**
- Wrap each `<WorkCardPrimitive>` in `<div draggable onDragStart={...} onDragEnd={...} data-card-id={card.workCardId}>`. If `WorkCardPrimitive` accepts `draggable`/`onDragStart`, pass through. Recommended: wrap, since the primitive props are typed strictly.
- `onDragStart`: `e.dataTransfer.setData('text/plain', card.workCardId); e.dataTransfer.effectAllowed = 'move';`
- On lane body (`<div className="workCardBoardLaneCards">`, L162): `onDragOver={e => e.preventDefault()}`, `onDrop={handleDrop}`. Add `onDragEnter` / `onDragLeave` to toggle `data-drag-over="true"` on the lane.
- `handleDrop(e, lane)`: read card id, update `cards` state with new `status` + `laneId`, persist `stronghold.workBoard.lanes` to localStorage.

**Visual feedback during drag:** lane background flips to `var(--color-surface-hover)` + 4px accent top border via `[data-drag-over="true"]` selector.

**Persistence:**

```ts
// On drop, after state update:
useEffect(() => {
  try {
    localStorage.setItem('stronghold.workBoard.lanes', JSON.stringify(
      Object.fromEntries(LANES.map(l => [l, grouped[l].map(c => c.workCardId)]))
    ));
  } catch { /* localStorage may be disabled */ }
}, [grouped]);

// On mount, before fetchCards:
useEffect(() => {
  try {
    const raw = localStorage.getItem('stronghold.workBoard.lanes');
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<WorkCardStatus, string[]>;
    // Apply: when API returns cards, merge overrides into laneId.
  } catch { /* ignore */ }
}, []);
```

`groupCardsByStatus` (`src/types.ts:88`) already prefers `card.laneId` over `card.status`, so once `laneId` is set, the card renders in the overridden lane.

**Keyboard alternative (must-have):**

State: `const [kbSourceId, setKbSourceId] = useState<string | null>(null)`. While non-null, render a dashed accent outline on the source card and announce "Picked up card X. Use arrow keys to choose lane. Space to drop, Escape to cancel." Global keydown listener (mounted only while `kbSourceId !== null`):
- `ArrowLeft`/`ArrowRight` move focus between lanes; `ArrowUp`/`ArrowDown` within a lane.
- `Space` drops at the focused position.
- `Escape` cancels and returns card to source lane.

Each step fires `liveRegion.announce("Moved to ACTIVE lane" | "Dropped in BLOCKED" | ...)`.

**CSS additions:**

```css
.workCardBoardLane[data-drag-over="true"] .workCardBoardLaneCards { background: var(--color-surface-hover); box-shadow: inset 0 4px 0 0 var(--color-accent); }
.workCardBoardLaneCards > [data-card-id] { cursor: grab; }
.workCardBoardLaneCards > [data-card-id]:active { cursor: grabbing; }
.workCardBoardLaneCards > [data-card-id][data-keyboard-pickup="true"] { outline: 2px dashed var(--color-accent); outline-offset: 2px; animation: cardPickupPulse 1.2s ease-in-out infinite; }
@keyframes cardPickupPulse { 50% { outline-color: var(--color-accent-hover); } }
@media (prefers-reduced-motion: reduce) { .workCardBoardLaneCards > [data-card-id][data-keyboard-pickup="true"] { animation: none; } }
```

**Within-lane reorder:** OPTIONAL — only if 30 min remain after cross-lane drag works. Skip if rushed.

**Acceptance:** Tusk drags PLANNED → ACTIVE in browser, card moves, persists after refresh. Keyboard alt: Space picks up, arrow keys change lane, Space drops, Esc cancels. `liveRegion.announce` fires each step.

---

## P1.1 — Bulk actions on Work + Approvals (20 min)

**Goal:** Multi-select cards via checkbox column on Work Card Board and Approvals. Sticky action bar at bottom appears when ≥1 item selected.

**Integration targets:**
- `src/components/WorkCardBoard.tsx` — modify the `<WorkCardPrimitive>` render at L165.
- `src/components/Surfaces.tsx` — `SurfaceApprovals` component (Approvals.tsx is a re-export).

**Shared shape:**

```ts
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const toggle = (id: string) => setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
const clearSelection = () => setSelectedIds(new Set());
const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));
```

**Visual spec (shared CSS):**

```css
.bulkActionBar { position: sticky; bottom: 0; left: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--color-surface); border-top: 1px solid var(--color-border); box-shadow: 0 -2px 8px rgba(15,23,42,0.06); z-index: 10; }
.bulkActionBar__count { font-size: 13px; color: var(--color-text); font-weight: 510; }
.bulkActionBar__actions { display: flex; gap: 8px; flex: 1; }
.bulkActionBar__clear { background: transparent; border: 0; color: var(--color-accent); cursor: pointer; font-size: 13px; padding: 4px 8px; }
.bulkActionBar__clear:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
```

**Work Card Board bulk:**
- Checkbox column: 12px wide. `<input type="checkbox" aria-label={`Select ${card.title}`} checked={selectedIds.has(card.workCardId)} onChange={() => toggle(card.workCardId)} />` rendered BEFORE `<WorkCardPrimitive>` inside a flex wrapper.
- "Select all" header checkbox above lanes (or inside `.workCardBoardFilters`).
- Actions when ≥1 selected: `Move to lane` (dropdown of 5 lanes), `Mark complete`, `Delete`. All dispatch a toast with Undo (P1.3).

**Approvals bulk:**
- Checkbox column on each approval row.
- Actions: `Approve`, `Reject`, `Request changes`. "Select all" header checkbox.

**Acceptance:** Tusk selects 3 Work cards via checkboxes, sees sticky action bar with "3 selected", clicks `Move to lane` → BLOCKED, verifies all 3 cards in BLOCKED. Same flow on Approvals with `Approve`.

---

## P1.2 — Keyboard shortcuts on Approvals (15 min)

**Goal:** Approvals accepts `j`/`k`/`a`/`r`/`?` shortcuts. `?` opens the same palette overlay from P0.2.

**Integration target:** `src/components/Surfaces.tsx` (`SurfaceApprovals`).

**Implementation spec:**

```tsx
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const approvals = Array.from(document.querySelectorAll<HTMLElement>('[data-approval-id]'));
    const currentIndex = approvals.findIndex(el => el.contains(document.activeElement));
    switch (e.key) {
      case 'j': { e.preventDefault(); const next = approvals[Math.min(currentIndex + 1, approvals.length - 1)] || approvals[0]; next?.focus(); break; }
      case 'k': { e.preventDefault(); const prev = approvals[Math.max(currentIndex - 1, 0)] || approvals[approvals.length - 1]; prev?.focus(); break; }
      case 'a': case 'r': {
        if (currentIndex < 0) return;
        const btn = approvals[currentIndex].querySelector<HTMLButtonElement>(e.key === 'a' ? '[data-action="approve"]' : '[data-action="reject"]');
        btn?.click(); break;
      }
      case '?': { e.preventDefault(); setShortcutOverlayOpen(true); break; }
    }
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, []);
```

**`?` overlay:** Extend `Palette.tsx` with `mode: 'navigation' | 'shortcuts'` prop. Shortcuts mode shows: `j` next, `k` previous, `a` approve, `r` reject, `?` show shortcuts, `Esc` close.

**Markup contract:** each approval row MUST have `data-approval-id={id}` on its container. Approve button MUST have `data-action="approve"`, Reject `data-action="reject"`.

**Acceptance:** Tusk opens Approvals, presses `j` 3 times → focus on 3rd approval. Press `a` → approval approved, toast fires. `?` opens shortcut overlay. `Esc` closes.

---

## P1.3 — Toast undo on destructive actions (15 min)

**Goal:** Approve / Reject / Delete / Move-to-lane toasts show an "Undo" button. Click reverts within 5 seconds.

**Integration target:** `src/components/Controls/Toast.tsx` L3. EXTEND the existing `ToastItem` type (do NOT replace). `ToastHost.tsx` is unchanged. Existing `showToast({ tone, title, description, duration, action })` calls in `ApprovalQueue` / `CronManager` continue to work unmodified.

**ToastItem — extend (additive, backward-compatible):**

```ts
export type ToastItem = {
  id: string;
  tone: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
  undo?: { label: string; onClick: () => void; ttlMs?: number };  // NEW — optional
};
```

**`Toast` primitive render — add undo button:**

Inside the `<Toast>` component in Toast.tsx, AFTER the existing `toast.action` button and BEFORE the close button:

```tsx
{toast.undo ? <button type="button" className="toastUndo" onClick={() => { toast.undo!.onClick(); onDismiss(toast.id); }}>{toast.undo.label}</button> : null}
```

**5-second countdown via existing `duration`:** No new timer UI needed. The existing `showToast` already schedules `window.setTimeout(onDismiss, toast.duration ?? 5000)`. When undo is present, callers pass `duration: toast.undo.ttlMs ?? 5000` so the existing auto-dismiss also serves as the undo TTL. Optional progress bar (below) is additive — the TTL is enforced by the existing timer regardless of visual progress.

**Optional progress bar (enhancement, can be skipped if rushed):**

```tsx
const [remaining, setRemaining] = useState((toast.duration ?? 5000) - (Date.now() - startedAt));
const [paused, setPaused] = useState(false);
useEffect(() => {
  if (!toast.undo || paused) return;
  const id = window.setInterval(() => setRemaining(r => Math.max(0, r - 100)), 100);
  return () => window.clearInterval(id);
}, [paused, toast.undo]);
useEffect(() => { if (remaining === 0 && toast.undo) onDismiss(toast.id); }, [remaining, toast.undo]);
// onMouseEnter/Leave on the toast container pause/resume.
```

**CSS:**

```css
.toastUndo { background: transparent; border: 0; padding: 0; margin-left: 8px; color: var(--color-accent); font-size: 13px; font-weight: 510; cursor: pointer; text-decoration: underline; align-self: center; }
.toastUndo:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
.toast__progress { position: absolute; bottom: 0; left: 0; height: 2px; background: var(--color-accent); animation: toastShrink 5s linear forwards; }
@keyframes toastShrink { from { width: 100%; } to { width: 0%; } }
@media (prefers-reduced-motion: reduce) { .toast__progress { animation: none; } }
```

**Updated example (using existing `title` / `description` / new `undo`):**

```ts
showToast({
  tone: 'success',
  title: 'Deleted',
  description: 'Card removed from Work board.',
  undo: { label: 'Undo', onClick: restoreCard, ttlMs: 5000 }
});
```

**Where to attach Undo:**
- `WorkCardBoard.tsx` bulk `Delete` — undo restores prior `cards` snapshot.
- `WorkCardBoard.tsx` bulk `Move to lane` — undo restores prior lane assignments.
- `SurfaceApprovals` `Approve` / `Reject` / `Request changes` — undo flips approval state back.

**Acceptance:** Tusk clicks Delete on a Work card, sees toast with Undo + depleting progress bar, clicks Undo within 5s, card reappears. Reduced-motion: no progress bar animation, but timer + Undo still work.

---

## P1.4 — Mobile-optimized hero (15 min)

**Goal:** Dashboard header at <480px viewport collapses to eyebrow + h1 + subtitle stacked; actions in a row below; metadata strip wraps to 2 rows. No horizontal scrolling.

**Integration target:** `src/styles.css` — extend the existing `.dashboardHeader` block from Phase 3.

**Visual spec:**

```css
@media (max-width: 480px) {
  .dashboardHeader { grid-template-areas: "eyebrow" "title" "sub" "actions" "meta"; padding: 16px 20px; }
  .dashboardHeader__title { font-size: clamp(1.25rem, 8vw, 1.75rem); }
  .dashboardHeader__sub { font-size: 13px; line-height: 1.4; }
  .dashboardHeader__actions { display: flex; flex-wrap: wrap; gap: 8px; justify-self: start; }
  .dashboardHeader__meta { flex-direction: column; gap: 8px; }
  .statGrid { grid-template-columns: repeat(2, 1fr); }
  .workItemsGrid { grid-template-columns: 1fr; }
}
@media (max-width: 360px) {
  .agenticOsTable th:nth-child(3), .agenticOsTable td:nth-child(3) { display: none; }
}
```

**Clix verifies** the actual class names (`statGrid` / `workItemsGrid` / `agenticOsTable`) with `grep -nE 'className.*Grid|className.*Table' src/components/AgenticOsDashboardPanel.tsx` before writing the selectors. Adjust to match actual markup.

**Acceptance:** Tusk screenshots at 360×800 — no horizontal scroll, header readable in single column, stat tiles in 2-col grid, TARGET column hidden at 360px.

---

## P2.1 — Form primitive wiring into Operations editors (20 min)

**Goal:** Operations editors — `MissionEditor`, `TaskEditor`, `WorkCardEditor` (3 editors inside `<Disclosure>` panels on the Operations surface) — currently use raw `<input>` / `<select>` / `<textarea>`. Wrap each in Phase 2 `<Form>`, `<FormField>`, `<FormActions>` primitives.

**Integration target:** `src/components/Surfaces.tsx` (`SurfaceOperations`). Confirmed editors in current code (`Surfaces.tsx:79-95`): `<MissionEditor>`, `<TaskEditor>`, `<WorkCardEditor>`. There is NO Cron editor — Cron lives on its own surface. **Do not invent a Cron editor.**

**Form primitive import paths (3 separate files confirmed via `grep -rn 'export function' src/components/Forms/`):**

```tsx
import { Form } from './Forms/Form';
import { FormField } from './Forms/FormField';
import { FormActions } from './Forms/FormActions';
```

All three are required — `./Forms/Form` does NOT re-export `FormField` or `FormActions`.

**Wrap pattern (apply to MissionEditor, TaskEditor, WorkCardEditor — three independent wrap sites):**

```tsx
<Form onSubmit={handleSubmit}>
  <FormField label="Title" hint="Short, imperative" required error={errors.title}>
    <input type="text" value={values.title} onChange={e => setValues(v => ({ ...v, title: e.target.value }))} aria-invalid={!!errors.title} />
  </FormField>
  <FormField label="Owner">
    <select value={values.owner} onChange={e => setValues(v => ({ ...v, owner: e.target.value }))}>...</select>
  </FormField>
  <FormField label="Risk" error={errors.risk}>
    <select value={values.risk} onChange={e => setValues(v => ({ ...v, risk: e.target.value as WorkCardRisk }))}>
      <option value="GREEN">GREEN</option>
      <option value="YELLOW">YELLOW</option>
      <option value="RED">RED</option>
    </select>
  </FormField>
  ...
  <FormActions>
    <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>
    <button type="submit" className="btn-primary">Save</button>
  </FormActions>
</Form>
```

`FormField` automatically assigns `id` via `useId()` and wires `aria-describedby` to the hint/error paragraph; do NOT pass `id` manually to the child input.

**CSS additions (verify Phase 2 already has these; add only if missing):**

```css
.form { display: grid; gap: 16px; }
.formField { display: grid; gap: 4px; }
.formField__label { font-size: 12px; font-weight: 510; color: var(--color-text); }
.formField__hint { font-size: 11px; color: var(--color-text-tertiary); }
.formField__error { font-size: 11px; color: var(--color-danger); }
.formField input, .formField select, .formField textarea { padding: 8px 12px; border: 1px solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); color: var(--color-text); font-size: 14px; }
.formField input[aria-invalid="true"], .formField select[aria-invalid="true"], .formField textarea[aria-invalid="true"] { border-color: var(--color-danger); }
.formField input:focus-visible, .formField select:focus-visible, .formField textarea:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 1px; }
.formActions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid var(--color-border-subtle); }
```

**Acceptance:** Tusk opens Operations, expands `Mission Proposal` → sees label-above-input `Form`/`FormField`/`FormActions` styling; same for `Task Proposal` and `Work Card Proposal` (all 3 editors wrap correctly). Submit any with empty title → red error under title. Tab order per editor: title → owner → risk → ... → save.

---

## P2.2 — AuditTrail row cap with Show all toggle (10 min)

**Goal:** AuditTrail currently shows `events.slice(-8).reverse()`. Add a `Show all (N)` toggle.

**Integration target:** `src/components/AuditTrail.tsx` (9 lines).

**Implementation spec:**

```tsx
import { useState } from 'react';
import type { AuditEvent } from '../../shared/types';
import { strongholdApi } from '../api/strongholdApi';

export function AuditTrail({ refreshKey = 0 }: { refreshKey?: number }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [showAll, setShowAll] = useState(false);
  useEffect(() => { strongholdApi.listAudit().then(next => setEvents(Array.isArray(next) ? next : [])).catch(() => setEvents([])); }, [refreshKey]);
  const visible = showAll ? events.slice().reverse() : events.slice(-8).reverse();
  return (
    <section className="panel">
      <h2>Audit Trail</h2>
      <p>Every proposal, denial, approval, and apply attempt must be recorded with redacted metadata.</p>
      {events.length === 0 ? <p className="muted">No audit events yet</p> : (
        <>
          <div className="list">
            {visible.map(event => (
              <article className="row" key={event.id}>
                <div><strong>{event.action}</strong><p className="muted">{event.outcome} · {event.actor} · {new Date(event.timestamp).toLocaleString()}</p></div>
                <span className="status ok">redacted</span>
              </article>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            {showAll
              ? <button type="button" className="linkButton" onClick={() => setShowAll(false)}>Show less</button>
              : <button type="button" className="linkButton" onClick={() => setShowAll(true)}>Show all ({events.length} events)</button>}
          </div>
        </>
      )}
    </section>
  );
}
```

**CSS:**

```css
.linkButton { background: transparent; border: 0; padding: 4px 8px; color: var(--color-accent); font-size: 13px; cursor: pointer; text-decoration: underline; }
.linkButton:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
```

**Acceptance:** Tusk views AuditTrail, sees 8 rows + `Show all (N events)`. Click → full list. Click `Show less` → collapses to 8.

---

## P2.3 — Inline edit on Work Card Drawer (30 min)

**Goal:** Work Card Drawer is read-only. Make title, owner, schedule, status editable inline with a draft-overlay merge model (drafts persist across opens but always defer to the latest `card` prop until the user edits).

**Integration target:** `src/components/WorkCardDrawer.tsx` (77 lines). Props are extended; existing `card.filePath → basename` R8 hide rule is preserved (inline edit never touches `filePath` or `basename`).

### §P2.3.1 — Draft-overlay merge model (required)

`WorkCardDrawer` derives display values from a draft overlay; it never renders `card.*` directly for editable fields:

```ts
type Draft = { title: string; owner: string; schedule: string; status: WorkCardStatus };
type FieldName = 'title' | 'owner' | 'schedule' | 'status';

const [draft, setDraft] = useState<Draft | null>(() => readDraft(card?.workCardId));
const display: Draft = {
  title:    draft?.title    ?? card.title,
  owner:    draft?.owner    ?? card.owner,
  schedule: draft?.schedule ?? card.schedule,
  status:   draft?.status   ?? card.status,
};

// Load on card change; persist on every draft change
useEffect(() => { if (card) setDraft(readDraft(card.workCardId)); }, [card?.workCardId]);
useEffect(() => { if (card) try { localStorage.setItem(`stronghold.workCardDrafts.${card.workCardId}`, JSON.stringify(draft)); } catch {} }, [draft, card?.workCardId]);

const startEdit = (f: FieldName) => setDraft({ ...display, editingField: f });
const commit = (f: FieldName) => { if (!f || !draft) return; onUpdate?.(card.workCardId, { [f]: draft[f] }); setSavedField(f); setTimeout(() => setSavedField(null), 2000); };
// "Reset to original" button: setDraft(null) — drawer reverts to card.* on next render.
```

Use `display.*` everywhere the drawer renders title / owner / schedule / status (view and edit-mode prefill both read `display`, never `card`).

**Props (extended):**

```ts
export type WorkCardDrawerProps = {
  card: WorkCard | null;
  onClose: () => void;
  onUpdate?: (id: string, patch: Partial<WorkCard>) => void;  // NEW — optional
};
```

**`WorkCardBoard` threading:** accepts `onCardUpdate?: (id: string, patch: Partial<WorkCard>) => void`, passes it to `<WorkCardDrawer onUpdate={...} />`. When omitted, `WorkCardBoard` provides an internal default that updates local `cards` state. The drawer's draft-overlay always wins within the drawer; `onUpdate` is how the parent board persists or propagates to API.

### §P2.3.2 — Edit markup (title shown; owner/schedule/status follow same shape)

```tsx
{editing === 'title'
  ? <input autoFocus value={draft?.title ?? display.title} onChange={e => setDraft({ ...display, title: e.target.value })} onBlur={() => commit('title')} onKeyDown={e => { if (e.key === 'Enter') commit('title'); if (e.key === 'Escape') cancel(); }} />
  : <h3 className="workCardDrawerTitle" onClick={() => startEdit('title')} tabIndex={0} role="button" onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startEdit('title'); } }}>{display.title}</h3>}
```

`Owner`: text input (same pattern). `Schedule`: `<input type="date">`. `Status`: `<select>` with 5 options (PLANNED / ACTIVE / BLOCKED / REVIEW / COMPLETE). **Save indicator:** `savedField === field` → `<StatusPill tone="success" label="saved" size="sm" />` next to the field for 2 s. **A11y:** view values get `tabIndex={0} role="button" aria-label={`Edit ${field}`}`; inputs get `aria-label={field}` + autoFocus.

**Acceptance:** Tusk opens WorkCard, clicks title, types new value, presses Enter, sees "saved" pill for 2 s, closes + reopens, sees edited title persist (from draft). Click "Reset to original", sees original title (from `card.*`). Esc cancels edit. Status dropdown shows 5 lanes. filePath/basename R8 hide rule unchanged.

---

## P2.4 — Per-surface live-region announcer (10 min)

**Goal:** `LiveRegionProvider` is a no-op stub. Wire it to a real `<div role="status">` and add announces on key events.

**Integration target:** `src/components/Shell/LiveRegionProvider.tsx` (5 lines).

**Implementation spec:**

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
const LiveRegionContext = createContext<(message: string) => void>(() => undefined);
export function LiveRegionProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const announce = useCallback((next: string) => {
    setMessage(''); // force re-announcement even on identical text
    window.setTimeout(() => setMessage(next), 30);
  }, []);
  return (
    <LiveRegionContext.Provider value={announce}>
      {children}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{message}</div>
    </LiveRegionContext.Provider>
  );
}
export function useAnnounce() { return useContext(LiveRegionContext); }
```

**CSS (verify `.sr-only` exists from Phase 2; add only if missing):**

```css
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
```

**Where to announce:**

| Trigger location | Announce text |
|---|---|
| `AppShell.tsx` when `activeSurface` changes | `Navigated to ${capitalize(surface)}` |
| `ToastHost.tsx` on toast add | `Action completed` / `Action failed` / toast message |
| Form submit success in Operations | `Saved` |
| Form submit validation failure | `Validation failed: ${field}` |
| Empty state shown in Work / Activity / QC | `No items to display` |

Wire via `const announce = useAnnounce()` in each component.

**Acceptance:** Tusk navigates Dashboard → Work, observes `<div role="status">` text update to `Navigated to Work` (DevTools or screen reader). Reduced-motion does not apply (announcements are a11y).

---

## P3 — Print stylesheet (10 min)

**Goal:** `@media print` rules strip chrome and render in serif.

**Integration target:** append to `src/styles.css`.

**Visual spec:**

```css
@media print {
  nav, aside, button, [role="navigation"], .sidebar, .themeToggle, .bulkActionBar, .toastHost { display: none !important; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; color: #000; background: #fff; }
  .panel { border: none !important; box-shadow: none !important; padding: 8px 0 !important; }
  h1 { font-size: 18pt; } h2 { font-size: 14pt; }
  .status, .statusPill { background: transparent !important; color: #000 !important; border: 1px solid #000 !important; padding: 0 4px !important; }
  .status::before { content: "["; } .status::after { content: "]"; }
  a { color: #000; text-decoration: underline; }
}
```

**Acceptance:** Tusk opens browser print preview on Dashboard — clean output, no sidebar, no buttons, serif body text, status pills as `[PLANNED]` bracketed text.

---

## 14. Build order (250 min total)

Each step is independently committable. Steps marked `[verify]` check the file already satisfies the spec before editing.

1. **(5 min)** Pre-flight: re-read `Shell/AppShell.tsx`, `Controls/Toast.tsx`, `Forms/Form.tsx`, `Cards/WorkCard.tsx`. Confirm APIs match usage. Run `npm test -- --run` baseline. `git status` clean.
2. **(10 min)** P0.1: Append `.themeToggle` CSS to `src/styles.css` under `/* Phase 4 — P0.1 */`. No JSX changes.
3. **(30 min)** P0.2 AppShell pre-step (Path B): BEFORE the rest of P0.2, edit `src/components/Shell/AppShell.tsx` to accept the 8 props from App.tsx render path (already in stub signature — verify), and edit `src/App.tsx` to render `<AppShell activeSurface={active} onSurfaceChange={setActive} ...>` instead of inline `<ToastProvider>...<ToastHost>`. Sidebar / mobile nav / ToastHost move into AppShell. Verify `grep -rn '<AppShell' src/App.tsx` returns ≥1 hit before proceeding. THEN: create `src/components/Shell/Palette.tsx`. Mount Cmd-K listener in AppShell and render `<Palette>`. Append `.palette*` CSS.
4. **(45 min)** P0.3: Edit `WorkCardBoard.tsx` — draggable wrappers, lane `onDragOver`/`onDrop`, localStorage persistence (key `stronghold.workBoard.lanes`), keyboard pickup state + global keydown listener. Append `.workCardBoardLane[data-drag-over="true"]` CSS.
5. **(90 min checkpoint)** Run `npm test -- --run`, `npm run build` (gz < 250 KB), `node scripts/screenshot-phase2.mjs` (80 PNGs). If any P0 step failed, STOP and report.
6. **(20 min)** P1.1: Edit `WorkCardBoard.tsx` — checkbox column + `selectedIds` state + `.bulkActionBar` JSX. Edit `Surfaces.tsx` (`SurfaceApprovals`) for Approvals checkboxes. Append `.bulkActionBar` CSS.
7. **(15 min)** P1.2: Add `useEffect` keyboard listener inside `SurfaceApprovals`. Add `data-approval-id` + `data-action="approve|reject"` markup attributes. Extend `Palette` with `mode="shortcuts"` for `?` overlay.
8. **(15 min)** P1.3: Edit `src/components/Controls/Toast.tsx` — ADD optional `undo?: { label, onClick, ttlMs? }` to existing `ToastItem` (do NOT replace the type). Inside `<Toast>` render, add `<button className="toastUndo">` AFTER the existing `toast.action` button when `toast.undo` is present. Append `.toastUndo` + `.toast__progress` CSS (progress bar is optional if rushed — TTL is enforced by the existing `duration` timer regardless). Wire Undo into WorkCardBoard bulk Delete + Move and SurfaceApprovals Approve/Reject via the new `showToast({ ..., undo: { ... } })` shape.
9. **(15 min)** P1.4: Append `<480px` + `<360px` media queries to `.dashboardHeader` block in `src/styles.css`. Verify class names match existing markup with grep.
10. **(180 min checkpoint)** Same gates as step 5. If P1 has gaps, fix or document for Phase 5.
11. **(20 min)** P2.1: Edit `Surfaces.tsx` (`SurfaceOperations`) — wrap `MissionEditor`, `TaskEditor`, and `WorkCardEditor` (3 editors, NOT 3 including Cron — Cron is its own surface) in `<Form>` / `<FormField>` / `<FormActions>`. Imports: 3 separate lines for `./Forms/Form`, `./Forms/FormField`, `./Forms/FormActions` (do not combine — they are separate export files). Append `.form*` CSS only if Phase 2 didn't ship it.
12. **(10 min)** P2.2: Edit `AuditTrail.tsx` — add `showAll` state, render toggle button. Append `.linkButton` CSS.
13. **(30 min)** P2.3: Edit `WorkCardDrawer.tsx` — add §P2.3.1 draft-overlay merge (derive `display.*` from `draft ?? card.*`, persist via `localStorage.setItem('stronghold.workCardDrafts.${id}', ...)`), add optional `onUpdate?: (id, patch) => void` prop, render via §P2.3.2 edit markup (title/owner/schedule/status). Edit `WorkCardBoard.tsx` to accept `onCardUpdate?: (id, patch) => void`, thread to `<WorkCardDrawer onUpdate={...}>`, and provide internal default that updates local `cards` state. Append any missing field-level CSS.
14. **(10 min)** P2.4: Replace stub in `LiveRegionProvider.tsx` with real provider + `<div role="status">`. Wire `announce()` calls in AppShell (surface nav), ToastHost (toast add), SurfaceOperations (form submit), WorkCardBoard (empty state).
15. **(10 min)** P3: Append `@media print` block to `src/styles.css`.
16. **(remaining time, ~30 min)** Final verification: `npm test`, `npm run build`, 80 screenshots, browser smoke test all 11 features against the §15 checklist.

**Hard stop rule:** If Clix estimates a step will exceed its budget by >50%, mark it P-deferred, move to next tier, document in final report. Do NOT skip P0 to chase P1.

---

## 15. Verification protocol

### 15.1 Mechanical gates (must pass before Tusk touches screenshots)

```bash
cd /c/Users/tophe/agent-army-stronghold
npm test -- --run              # 50 files, 237+ tests must pass (Phase 3 baseline)
npm run build                  # gz total < 250 KB (currently 79.53 KB)
node scripts/screenshot-phase2.mjs   # 80 PNGs produced
```

### 15.2 Tusk QC checklist (visual + a11y, both themes, 1440×900 and 360×800)

- [ ] **P0.1** Theme toggle visible top-right of Dashboard, size matches Recheck, hover changes background, focus ring on Tab. Both themes.
- [ ] **P0.2** Cmd+K opens palette, "sub" highlights Subagents, Enter navigates, Esc closes. Backdrop + max-width 600px. Both themes. Reduced-motion: no fade.
- [ ] **P0.3** Drag PLANNED → ACTIVE — card moves. Refresh — still in ACTIVE. Keyboard alt: Space picks up, arrows change lane, Space drops, Esc cancels.
- [ ] **P1.1** Select 3 Work cards — sticky action bar with "3 selected". Move to BLOCKED works. Same on Approvals with Approve.
- [ ] **P1.2** Open Approvals, press `j` 3 times — focus on 3rd approval. Press `a` — approved, toast fires. `?` opens shortcut overlay.
- [ ] **P1.3** Delete a Work card — toast with Undo + 5s progress bar. Click Undo within 5s — card returns. Reduced-motion: no progress bar animation.
- [ ] **P1.4** Screenshot at 360×800 — no horizontal scroll, header readable in single column, stat tiles in 2-col grid, TARGET column hidden.
- [ ] **P2.1** Operations → `Mission Proposal` editor — label above input, red error on empty submit. Same for `Task Proposal` + `Work Card Proposal` (all 3 wrap correctly). Tab order: title → owner → risk → ... → save.
- [ ] **P2.2** AuditTrail: 8 rows + `Show all (N events)` button. Click — full list. Click `Show less` — collapses to 8.
- [ ] **P2.3** WorkCardDrawer: click title → input → type → Enter → "saved" pill for 2s. Close + reopen → title persists from draft. Click "Reset to original" → title reverts to `card.*`. status dropdown shows 5 lanes.
- [ ] **P2.4** Navigate Dashboard → Work — `<div role="status">` text updates to `Navigated to Work`.
- [ ] **P3** Browser print preview — no sidebar, no buttons, serif body text, status pills as `[PLANNED]` bracketed.

### 15.3 Grep checks (Clix runs before commit)

```bash
cd /c/Users/tophe/agent-army-stronghold
grep -rn 'paletteBackdrop' src/components/Shell/      # ≥1 hit (P0.2)
grep -rn 'data-approval-id' src/components/           # ≥1 hit (P1.2)
grep -rn 'bulkActionBar' src/components/              # ≥2 hits Work + Approvals (P1.1)
grep -rn 'data-drag-over' src/styles.css              # ≥1 hit (P0.3)
grep -rn 'role="status"' src/components/Shell/        # ≥1 hit (P2.4)
grep -rn '@media print' src/styles.css                # ≥1 hit (P3)
grep -rn 'showAll' src/components/AuditTrail.tsx      # ≥1 hit (P2.2)
grep -rn '<AppShell' src/App.tsx                     # ≥1 hit (P0.2 — AppShell adopted, not orphan)
grep -nE 'undo.*onClick|toastUndo' src/components/Controls/Toast.tsx   # ≥2 hits (P1.3 — type field + render)
grep -nE "from '\\.\\/Forms\\/Form'|from '\\.\\/Forms\\/FormField'|from '\\.\\/Forms\\/FormActions'" src/components/Surfaces.tsx   # 3 hits, one per form primitive import (P2.1)
grep -rn 'onCardUpdate' src/components/WorkCardBoard.tsx   # ≥1 hit (P2.3 — draft-overlay threading)
```

---

## 16. Out of scope

**Nothing.** Chris picked Option C. All 11 items are in scope. Phase 5 candidates (not in this brief):
- Backend persistence for drag-and-drop (currently localStorage only).
- Toast undo extension to non-destructive actions.
- Per-route keyboard shortcuts beyond Approvals.
- Mobile drawer pattern (P1.4 only addresses header + grid).

---

## 17. Risks + mitigations

1. **Risk:** `WorkCardPrimitive` (`src/components/Cards/WorkCard.tsx`) may not accept `draggable`/`onDragStart` props. **Mitigation:** wrap each card in `<div draggable onDragStart={...} data-card-id={card.workCardId}>` instead of passing through. CSS in §P0.3 targets the wrapper. Click-to-open (via `onOpen`) and drag wrapper must not both fire on the same gesture: track `isDragging` in a ref; suppress click handler for 200 ms after `dragend`.
2. **Risk:** Form primitive paths confirmed: `./Forms/Form` (exports `Form`), `./Forms/FormField` (exports `FormField`), `./Forms/FormActions` (exports `FormActions`) — 3 separate files. Single-line `import { Form, FormField, FormActions } from './Forms/Form'` will fail at compile time. **Mitigation:** use 3 separate import lines per §P2.1.
3. **Risk:** (RESOLVED — was: Toast `undo` field doesn't exist on the current `Toast` type.) The brief now extends `ToastItem` additively; existing toasts without `undo` render unchanged.
4. **Risk:** `AppShell.tsx` doesn't pass `onRefreshEverything` to children — palette action #8 may be dead. **Mitigation:** render as `<button disabled>` if prop absent; theme toggle (#9) and copy URL (#10) always work via `document.documentElement.dataset.theme` and `navigator.clipboard`. (AppShell is now adopted in App.tsx per §P0.2.1 Path B; this risk is about its props, not its orphan status.)
5. **Risk:** localStorage may be disabled in some browsers (private mode). **Mitigation:** wrap all `localStorage` calls in `try/catch`; failures degrade to in-memory state only.
6. **Risk:** P0.3 keyboard pickup needs global focus management; conflicting listeners (existing drawer Escape handler) may double-fire. **Mitigation:** keyboard pickup listener only mounts while `kbSourceId !== null`, scoped via `useEffect` cleanup.
7. **Risk:** P1.4 class names (`statGrid`, `workItemsGrid`) may not match actual markup. **Mitigation:** Clix runs `grep -nE 'className.*Grid|className.*Table' src/components/AgenticOsDashboardPanel.tsx` first, uses actual class names.
8. **Risk:** P2.3 inline edit on Work Card Drawer might conflict with the R8 file-path hide rule. **Mitigation:** inline edit only touches title, owner, schedule, status — `filePath` and `basename` remain display-only (drawer still shows `<dd title="Full path hidden pending Sentinel R8 review">{basename}</dd>`). The `display.*` derivation in §P2.3.1 is for editable fields only — `filePath`/`basename` continue to render from `card` directly, unchanged. No regression.
9. **Risk:** P1.3 undo TTL race condition — if a destructive action commits its permanent state mutation before the 5 s undo window elapses, clicking Undo after the fact is impossible to honor. **Mitigation:** destructive actions that produce a toast with `undo` must be **soft-mutable**: the action is staged as a pending state; `onUpdate(cardId, patch)` is invoked from the toast `undo.onClick` if the user clicks Undo; permanent commit runs only after `duration + 250 ms` elapses without Undo. Concrete pattern: `setTimeout(commit, (undo.ttlMs ?? 5000) + 250)` inside the calling handler (Bulk Delete, Move to lane, Approve/Reject). If `undo.onClick` fires, call a stored `cancel` to clear the timer before the commit fires.

---

**Lyra — Phase 4 brief complete. 11 items. 250 min budget. P0/P1/P2/P3 tiers explicit. Every paragraph names a file, primitive, or px value. Igris reviews engineering. Clix implements with the build order above. Tusk verifies against §15 checklist. Belion commits. Division is 75% done — Phase 4 is the final lap.**