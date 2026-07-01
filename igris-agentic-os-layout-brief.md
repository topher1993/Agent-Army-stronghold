You are Igris, Engineering Division. Full layout overhaul of the Agentic OS Dashboard at C:/Users/tophe/agent-army-stronghold.

## Current state (verified by visual screenshot)

The dashboard renders correct data (75 tests, 173 KB bundle, 244 audit entries, 6 cron, QC 94/100, etc.) but the layout is BAD:

- **It's a single column squished inside the right rail** (~260px wide)
- **Cards all look the same** — no visual hierarchy
- **No hero stats** for the most important numbers
- **No grid system** — just a wall of small stacked cards
- **Typography is weak** — numbers are small, no emphasis
- **No sparkline** for QC history (just text)
- **Activity is one card** instead of a proper list with rows
- **Work items is one card** instead of 3 separate cards
- **Roadmap is one card** instead of a tracked-fixes list

## What you must build

A **proper standalone dashboard layout** that takes full width. Two options (pick one — recommend A):

### Option A: Move the Agentic OS Dashboard to a new full-width tab/center section

Add it as a 7th mobile section, AND on desktop make it the dominant content in the center deck when active. The dashboard should be the main attraction, not a side panel.

### Option B: Restructure the right rail to be a tall "inspector" column

Keep it in the right rail but make each card a properly-sized block with real data density.

**Recommended: Option A** — the dashboard deserves to be the hero, not buried.

## Required layout (regardless of which option)

```
┌────────────────────────────────────────────────────────────────────────┐
│ AGENTIC OS DASHBOARD                              [LIVE] [Recheck]      │
│ Live · generated 2026-06-27 12:02:35Z                                    │
│ Wired to local snapshot collector. Refresh by running npm run snapshot. │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─ HERO STATS ROW (4 equal cards) ──────────────────────────────────┐  │
│ │ TESTS        BUILD        AUDIT        CRON                       │  │
│ │ 75 pass      173 KB       244 entries  6 jobs                     │  │
│ │ 0 failed     26 modules   Phase C QC   active                     │  │
│ │ 45s          103ms        94/100 ✓                                │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌─ APP HEALTH (3 cards: tests, build, tunnel) ───────────────────────┐  │
│ │ Test suite        Build             Tunnel                        │  │
│ │ 75 tests          173 KB bundle     127.0.0.1:5174                │  │
│ │ 0 failed · 45s    26 modules        244 audit entries             │  │
│ │ 32 files          12 KB CSS · 103ms 6 cron jobs                   │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌─ QC SCORE HISTORY (full width) ───────────────────────────────────┐  │
│ │ Recent: agentic-os phase c — 94/100 APPROVED WITH CONDITIONS     │  │
│ │ Trend: 94 · 92 · 96 · 94 · 96 · 94 · 92  (avg 94)                │  │
│ │ [SVG sparkline of the 7 scores, monochrome, no libs]              │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌─ OPEN WORK ITEMS (3 cards, one per item) ─────────────────────────┐  │
│ │ WI-002  active  Igris  6/27/2026                                  │  │
│ │ WI-001  active  Igris  6/27/2026                                  │  │
│ │ WI-003  review  Igris  6/27/2026                                  │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌─ ACTIVITY (last 10, table layout) ─────────────────────────────────┐  │
│ │ When           Actor    Action     Target     Outcome   Reason    │  │
│ │ 2026-06-27...  Igris    apply      cr-...     applied   applied.. │  │
│ │ ...                                                                │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌─ MEMORY (2 cards: entries, skills) ────────────────────────────────┐  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│ ┌─ ROADMAP (3 tracked P2 fixes) ─────────────────────────────────────┐  │
│ │ P2 #1 Rate limiter     [resolved]                                  │  │
│ │ P2 #2 CORS preflight   [resolved]                                  │  │
│ │ P2 #3 Audit lifecycle  [resolved]                                  │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## Implementation requirements

1. **Layout**: Use a proper CSS grid (not flexbox column). Hero row = `grid-template-columns: repeat(4, 1fr)`. Section rows = 12-col grid with content spanning 8-12 cols. Make it responsive.

2. **No new framework**. Use existing CSS variables from styles.css. No new dependencies.

3. **SVG sparkline**: Hand-rolled inline SVG (no chart library). Just a `<polyline>` of the 7 scores. 280×60, stroke `var(--accent, #49ffc7)`, fill none, stroke-width 2.

4. **Typography**: Numbers in hero = `font-size: 2.4rem; font-weight: 900`. Section titles = `1.1rem; 700`. Card titles = `0.95rem; 700`. Use a tabular monospace for timestamps.

5. **Status pills**: Use existing `.status` classes (`.ok`, `.warn`, `.placeholder`, `.live`).

6. **Color accents**: 
   - Live data = green (`#49ffc7`)
   - Placeholder = amber (`#ffc457`)
   - Empty = grey
   - Background card = existing `var(--panel-bg, rgba(8, 20, 36, .84))`

7. **Full-width takeover**: When `active-agenticOs`, the dashboard section should span **all 3 columns** of `.commandGrid` (override the column template with `grid-column: 1 / -1`). The left and right rails should hide or shrink when the Agentic OS is the active section on desktop.

8. **Activity table**: Real `<table>` with `<thead>` + `<tbody>`. Columns: When, Actor, Action, Target, Outcome, Reason. Limit to 10 rows. Reason in muted color.

9. **Work items**: Render each item as a card with ID badge (mono), title, status pill, owner, modified date.

10. **Tests required**: Update `tests/agentic-os-dashboard.test.tsx` to assert:
    - 4 hero cards present with correct numbers
    - SVG sparkline element exists in QC history section
    - Activity table renders rows
    - Work items render as 3 separate cards
    - Hero stats use the large font size
    - All cards have proper data-status attributes

11. **No regression**: Keep all existing 83/83 tests passing. Build clean.

12. **Sentinel review**: After implementation, you'll be reviewed for layout correctness, no broken DOM, no overlapping cards, no overflow.

## Files you'll likely touch

- `src/components/AgenticOsDashboard.tsx` — restructure with new layout
- `src/App.tsx` — add CSS class hooks for full-width takeover
- `src/styles.css` — add Agentic OS dashboard styles (hero, grid, sparkline, table, work card)
- `tests/agentic-os-dashboard.test.tsx` — update assertions for new layout

## Hard constraints

- ✅ React + Vite + TypeScript ONLY
- ✅ No new dependencies
- ✅ No new framework
- ✅ Must work on desktop AND mobile (test in browser)
- ✅ All existing tests must still pass
- ✅ npm run build must stay clean
- ✅ Don't touch the Stronghold static tab (Phase A) or the Phase B/C data wiring
- ✅ When done, dev server must show the new dashboard at http://127.0.0.1:5174/

## Deliverable

When done, report:
- Files changed with line counts
- Test count (target: 83+ tests still passing)
- Screenshot proof of the new layout
- Sentinel review verdict

This is a substantial layout overhaul. Take your time. Sentinel reviews after.
