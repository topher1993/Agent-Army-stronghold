# Belion Work Card: Stronghold Agentic OS Dashboard Redesign

- **Originator:** Belion (Orchestrator)
- **Tier 2 owner:** Igris (Engineering Director)
- **Tier 3 executor:** **Clix** (Frontend specialist) — NOT Igris directly
- **Tier 3 verification:** Pulse (QA) — test count check after Clix returns
- **Final gate:** Tusk (QC, GPT-5.5) — required before Igris commits
- **Branch:** `phase-e2-mission-control` (clean tree, dirty state stashed)
- **Brief:** `igris-agentic-os-layout-brief.md` (already in repo root)

## Routing (this is the chain — Igris must follow it)

1. **Belion** (this work card) → **Igris**
2. **Igris** → **Clix** with a specialist work card (per the standard 7-section template)
3. **Clix** → produces verifiable artifact (diffs + build + tests + visual screenshot)
4. **Igris** → verifies Clix's work, runs build + tests, confirms visual smoke test
5. **Igris** → **Tusk** for QC review
6. **Tusk** approves or returns P0/P1 list
7. **Igris** commits and pushes (Tusk-approved work only)
8. **Belion** receives the commit hash and surfaces to Chris

Clix has 12 skills in `.claude/skills/` (all taste-skill family). Igris's specialist work card MUST specify which subset Clix should activate. For this task, the active skills are:

- `taste-skill` (v2, `design-taste-frontend`) — primary anti-slop frontend rules
- `redesign-skill` (`redesign-existing-projects`) — audit-then-fix workflow
- `minimalist-skill` (`minimalist-ui`) — explicit anti-defaults list
- `output-skill` (`full-output-enforcement`) — global, applies to every output

The other 8 skills (`gpt-tasteskill`, `brutalist-skill`, `soft-skill`, `stitch-skill`, `image-to-code-skill`, `imagegen-frontend-web`, `imagegen-frontend-mobile`, `brandkit`, `taste-skill-v1`) are NOT active for this task.

## Brief (target layout)

The full target layout is in `igris-agentic-os-layout-brief.md` — Clix reads that directly. Summary:

- **Option A:** Move the Agentic OS Dashboard to a new full-width tab/center section. Add as 7th mobile section; on desktop, make it the dominant center-deck content.
- **7 sections (in order):** Hero Stats (4 cards) → App Health (3 cards) → QC Score History (full width + SVG sparkline) → Open Work Items (3 cards) → Activity (table layout) → Memory (2 cards) → Roadmap (tracked-fixes list)
- **Anti-defaults (from taste-skill):** no Inter, no Lucide, no `rounded-full` for containers, no `shadow-md`+, no warm-cream+brass+oxblood palette, no `Fraunces`/`Instrument_Serif` display serifs. No emoji in code or visible text. `prefers-reduced-motion` and `prefers-reduced-transparency` fallbacks mandatory for any motion or glassmorphism.

## Igris's job before dispatching to Clix

- Confirm `.claude/agents/clix.md` is present and references the 12 skills. ✓ (verified 2026-07-01)
- Confirm the 12 skill directories exist under `.claude/skills/`. ✓ (verified 2026-07-01)
- Write the Clix work card as `.hermes/plans/<ts>_clix-stronghold-redesign.md` with all 7 sections (Scope in, Scope out, Active skills, Pre-flight gates, Verification, Risks, Hand-off). Use the Phase 37 work-card template.
- Dispatch Clix via `claude -p` print mode, workdir=`/c/Users/tophe/agent-army-stronghold`, max-turns=40, allowedTools=`Read,Edit,Write,Bash,Grep,Glob`. Pass the Clix work card content as the prompt.
- Do NOT let Clix commit. Clix returns; Igris verifies; Tusk QC; Igris commits.

## Hard constraints (cannot be overridden)

- **No new dependencies.**
- **No changes to data model** (snapshot JSON shape stays the same).
- **No changes to `server/`, `shared/`, `data/`** — these are Forge's domain.
- **One stylesheet.** All styles in `src/styles.css`. No inline `style={{}}` for design-token work.
- **No emoji in code, markup, or visible text.**
- **WCAG AA contrast minimums on every CTA.**
- **`prefers-reduced-motion` and `prefers-reduced-transparency` fallbacks** for motion and glassmorphism.

## Verification gates (all must pass before Tusk)

1. `npm run build` — TypeScript + Vite both pass
2. `npm test` — 75/75 still pass, no new failures, no skipped tests
3. `npm run dev` (background) — Vite serves on 127.0.0.1:5174, dashboard loads, all 7 sections render with real data
4. Visual screenshot of the new dashboard attached to the work-card return
5. `output-skill` check: no `// ...`, no `// TODO implement`, no `// rest of code`, no "the rest follows the same pattern" in the diff

## Tusk QC vetoes on

- Beige+brass+oxblood palette
- Inter / Roboto / Arial / Open Sans as primary font
- Lucide / FontAwesome / Heroicons (use Phosphor / Hugeicons / Radix Icons / Tabler)
- `rounded-full` for non-button containers
- `shadow-md` / `shadow-lg` / `shadow-xl` / generic dark drop shadows
- Mixed radius systems (round button in square layout, or vice versa)
- `Fraunces` / `Instrument_Serif` display serifs (banned by default)
- `// ...` or any other placeholder pattern
- Touched files outside `src/components/AgenticOsDashboard.tsx` and `src/styles.css`
- New dependencies

## Rollback

`git stash pop` restores the pre-redesign dirty state. Do not commit until Tusk approves.
