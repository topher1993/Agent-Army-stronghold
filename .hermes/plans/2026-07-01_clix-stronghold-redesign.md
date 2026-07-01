# Clix Work Card: Stronghold Agentic OS Dashboard Redesign

- **Originator:** Igris (Engineering Director)
- **Executor:** Clix (Frontend specialist)
- **Active skills (for this task only):**
  - `taste-skill` (v2, `design-taste-frontend`) — PRIMARY. Read this in full first.
  - `redesign-skill` (`redesign-existing-projects`) — audit-then-fix protocol, Section "How This Works"
  - `minimalist-skill` (`minimalist-ui`) — Section 2 (Absolute Negative Constraints)
  - `output-skill` (`full-output-enforcement`) — global, applies to every output
- **NOT active for this task:** `gpt-tasteskill`, `brutalist-skill`, `soft-skill`, `stitch-skill`, `image-to-code-skill`, `imagegen-frontend-web`, `imagegen-frontend-mobile`, `brandkit`, `taste-skill-v1`
- **Belion work card:** `.hermes/plans/2026-07-01_stronghold-agentic-os-redesign.md` (read first)
- **Brief:** `igris-agentic-os-layout-brief.md` (read in full)
- **Target files (in scope):**
  - `src/components/AgenticOsDashboard.tsx` (rewrite, full file)
  - `src/styles.css` (extend with new design tokens, type scale, spacing scale — diff only, do not rewrite unrelated rules)

## Scope (in)

1. **Read the brief** (`igris-agentic-os-layout-brief.md`) end-to-end.
2. **Read the active skills** (`taste-skill/SKILL.md`, `redesign-skill/SKILL.md`, `minimalist-skill/SKILL.md`, `output-skill/SKILL.md`).
3. **Read the current `AgenticOsDashboard.tsx`** to understand what data it consumes and how it computes its values.
4. **Run the audit** per `redesign-skill` "How This Works" (Scan → Diagnose → Fix) on the current dashboard. List every generic pattern, weak point, and missing state.
5. **State the Design Read** at the top of the component file (in a comment block) per `taste-skill` Section 0.B. Example: `// Reading this as: agentic-os mission-control for the operator (Chris), with a calm, dense, data-first language, leaning toward a Linear-style minimalist aesthetic with a single neutral palette and one warm accent.`
6. **Set the 3 dials** in the same comment block: `DESIGN_VARIANCE`, `MOTION_INTENSITY`, `VISUAL_DENSITY`. For a dense mission-control dashboard, suggested values: `6 / 4 / 7`. Document why.
7. **Rewrite `AgenticOsDashboard.tsx`** to implement the 7 sections from the brief:
   - Hero Stats (4 equal cards: tests, build, audit, cron)
   - App Health (3 cards: test suite, build, tunnel)
   - QC Score History (full width + inline SVG sparkline, no libraries)
   - Open Work Items (3 cards, one per item)
   - Activity (table layout, last 10 entries, columns: when, actor, action, target, outcome, reason)
   - Memory (2 cards: entries, skills)
   - Roadmap (3 tracked P2 fixes)
8. **Add the new design tokens** to `src/styles.css`: type scale (display / h1 / h2 / body / mono), spacing scale (xs / sm / md / lg / xl / 2xl), color tokens (bg, fg, muted, accent, border), radius scale (sharp / soft / pill — pick ONE per surface per `minimalist-skill` shape-consistency rule), shadow tokens (low / mid / high — minimal, tinted to background hue).
9. **Verify** per the gates below.
10. **Screenshot** the running dashboard via headless browser, attach to return summary.
11. **Return** a work-product summary to Igris with: design read, dials, file diffs, build output, test output, screenshot path.

## Scope (out — do not touch)

- `server/`, `shared/`, `data/` (Forge's domain)
- `src/components/*.tsx` other than `AgenticOsDashboard.tsx`
- `src/state/`, `src/api/`, `src/data/`, `src/types.ts`
- `package.json` (no new dependencies)
- `vite.config.ts`, `tsconfig.*.json`
- The `mock-label-only` Engineering Division routing in the dispatch UI (that's a Sentinel concern)

## Pre-flight gates (must pass before returning to Igris)

1. **Build clean:** `npm run build` — TypeScript + Vite both pass
2. **Tests clean:** `npm test` — 75/75 still pass, no new failures
3. **Output check:** no `// ...`, no `// rest of code`, no `// TODO implement`, no `// similar to above`, no "the rest follows the same pattern" in the diff (per `output-skill`)
4. **Anti-slop check:** run `taste-skill` Section 11 (pre-flight) checklist. Specifically:
   - No banned fonts (Inter, Roboto, Arial, Open Sans as primary; no Fraunces/Instrument_Serif display serifs)
   - No banned icons (no Lucide, FontAwesome, Heroicons; use Phosphor / Hugeicons / Radix Icons / Tabler)
   - No banned layout (no centered hero with 6-line H1 wrap, no sticky navbar glued to top, no generic 3-column Bootstrap grid)
   - No banned motion (no `linear` / `ease-in-out` transitions, no infinite-loop micro-animations)
   - No banned color (no warm-cream + brass + oxblood palette, no AI purple/blue gradient glow)
   - One shape system (sharp OR soft OR pill per role, no mixed)
   - One palette (one accent color, one neutral family)
   - WCAG AA contrast (4.5:1 body, 3:1 large) on every CTA
5. **Visual smoke test:** `npm run dev` (background), navigate to `http://127.0.0.1:5174/`, screenshot the dashboard, attach the PNG to the return summary.

## Risks

- **CSS file is global, not scoped.** Any changes to `src/styles.css` affect the whole app. Diff carefully. The 16 .tsx components all share one stylesheet. Do NOT remove or rename existing class names — only ADD new ones and override where required.
- **React 18.3.1, no concurrent features used.** Don't introduce Suspense / data-fetching patterns. The dashboard receives its data as props from the parent — keep that contract.
- **Existing audit log + snapshot are stashed.** If `npm run snapshot` is run during the redesign, it rewrites `public/data/stronghold-snapshot.json`. Expected — the snapshot is regenerable.
- **`output-skill` is a hard gate.** If the diff contains any placeholder pattern, the work fails QC. If you're tempted to abbreviate, write the full code. The skill's whole point is to stop that.

## Hand-off to Igris

Return format (markdown):

```
# Clix Work-Product: Stronghold Dashboard Redesign

## Design Read
"Reading this as: <...>"

## Dials
- DESIGN_VARIANCE: <N> (reason: ...)
- MOTION_INTENSITY: <N> (reason: ...)
- VISUAL_DENSITY: <N> (reason: ...)

## Active Skills Used
- taste-skill (sections read: ...)
- redesign-skill (sections read: ...)
- minimalist-skill (sections read: ...)
- output-skill (full)

## Audit Findings (per redesign-skill)
<list of generic patterns found, weak points, missing states>

## File Diffs
<git diff --stat and a representative 5-10 line excerpt of the biggest change>

## Build Output
<tail of npm run build>

## Test Output
<tail of npm test>

## Visual Screenshot
<path to PNG>

## Anti-Slop Self-Check
- Banned fonts: none used
- Banned icons: none used
- Banned motion: ...
- Color palette: ...
- Shape system: ...
- WCAG AA: verified on all CTAs
- Output-skill: no placeholders, no `// ...`, complete files

## Open Questions / Concerns
<none, or list them>
```

## Hard rules (from Clix's agent definition)

- No emoji in code, markup, or visible text
- WCAG AA contrast minimums
- `prefers-reduced-motion` and `prefers-reduced-transparency` fallbacks for any motion or glassmorphism
- One stylesheet (`src/styles.css`); no inline `style={{}}` for design-token work
- No new dependencies
- No changes to `server/`, `shared/`, `data/`
