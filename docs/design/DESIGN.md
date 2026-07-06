---
version: alpha
name: Stronghold UI Design Spec
description: Linear-style minimal dashboard design tokens, theme rules, responsive rules, and component map for Agent Army Stronghold.
colors:
  canvas: "#f7f5f1"
  surface: "#fffdfa"
  surface-elevated: "#f1eee8"
  surface-hover: "#ebe6dc"
  border: "#ded8cd"
  border-subtle: "#ebe5da"
  text: "#1f2328"
  text-muted: "#4f5660"
  text-tertiary: "#68707c"
  text-quaternary: "#858c96"
  accent: "#5e6ad2"
  accent-text: "#4a55b8"
  accent-hover: "#4f59c8"
  accent-bg: "#eceeff"
  success: "#0f7a3b"
  success-strong: "#10b981"
  warning: "#94610f"
  danger: "#c2413d"
typography:
  display:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2rem, 4.5vw, 3rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  micro:
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
spacing:
  "1": 4px
  "2": 8px
  "3": 12px
  "4": 16px
  "6": 24px
  "8": 32px
  "12": 48px
rounded:
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.md}"
    padding: 8px
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: 8px
  button-subtle:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.md}"
    padding: 8px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: 8px
---

# Stronghold UI Design Spec

## Direction
Linear-style minimal: warm gray surfaces, restrained indigo accent, modern system sans, soft cards, clear hierarchy. Keep the existing IA: persistent sidebar, hero, dashboard sub-nav, Agentic OS dashboard, work board, missions, operations, approvals, and cron. Do not redesign from zero; this is a tokenized polish pass that makes the existing dashboard easier to scan and safer to implement responsively.

## Tokens
Color tokens are CSS variables with semantic names and explicit light/dark values. Light mode keeps Chris's requested warm cream canvas: `--color-canvas #f7f5f1`, `--color-surface #fffdfa`, `--color-surface-elevated #f1eee8`, `--color-surface-hover #ebe6dc`, `--color-border #ded8cd`, `--color-border-subtle #ebe5da`, `--color-text #1f2328`, `--color-text-muted #4f5660`, `--color-text-tertiary #68707c`, `--color-text-quaternary #858c96`, `--color-accent #5e6ad2`, `--color-accent-text #4a55b8`, `--color-accent-hover #4f59c8`, `--color-accent-bg #eceeff`, `--color-success #0f7a3b`, `--color-success-strong #10b981`, `--color-warning #94610f`, `--color-danger #c2413d`.

Dark mode keeps the existing Linear-inspired contrast steps but moves them to the same semantic names: `--color-canvas #0d0e10`, `--color-surface #151619`, `--color-surface-elevated #1d1f23`, `--color-surface-hover #28282c`, `--color-border rgba(255,255,255,.10)`, `--color-border-subtle rgba(255,255,255,.05)`, `--color-text #f7f8f8`, `--color-text-muted #d0d6e0`, `--color-text-tertiary #9aa1ad`, `--color-text-quaternary #62666d`, `--color-accent #7170ff`, `--color-accent-text #b8b6ff`, `--color-accent-hover #828fff`, `--color-accent-bg rgba(113,112,255,.16)`, `--color-success #27a644`, `--color-success-strong #10b981`, `--color-warning #f7c948`, `--color-danger #ff8787`.

Contrast commitments: `--color-text-muted #4f5660` on light `--color-surface-elevated #f1eee8` is 6.40:1 and clears WCAG AA. `--color-accent-text #4a55b8` on light `--color-canvas #f7f5f1` is 5.88:1 and is the required token for normal accent text. `--color-accent #5e6ad2` on cream is only 4.32:1, so it is UI-only on light surfaces: buttons, borders, icons, chips, and large text where the 3:1 UI/large-text rule applies. White text on the accent button fill is 4.70:1. `--color-success-strong #10b981` preserves the current emerald signal for dots, graphs, borders, and badge decoration; use `--color-success #0f7a3b` for normal success text in light mode.

Spacing scale: `--space-1 4px`, `--space-2 8px`, `--space-3 12px`, `--space-4 16px`, `--space-6 24px`, `--space-8 32px`, `--space-12 48px`. Radii: `--radius-sm 4px`, `--radius-md 8px`, `--radius-lg 12px`, `--radius-xl 16px`, `--radius-pill 9999px`. Shadows: light `--shadow-card 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.06)`; dark `--shadow-card 0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.5)`. Add `--shadow-card-elevated` for drawers/modals by doubling the y-axis spread: light `0 2px 4px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.10)`; dark `0 2px 4px rgba(0,0,0,.5), 0 16px 48px rgba(0,0,0,.58)`.

Typography uses system fonts only for bundle safety: `--font-sans 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif`; `--font-mono ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Do not add `@font-face`, Google Fonts, or remote font CSS in subtask B. This preserves a near-Inter feel with zero bundle bytes. If Chris later demands exact Inter everywhere, use one local latin-subset variable WOFF2 with `font-display: swap`, measure gzipped size first, and reject it if it exceeds 30KB gz. Size tokens: `--text-display clamp(2rem, 4.5vw, 3rem)` for h1/hero; `--text-heading 1.5rem / 1.75rem` for h2-h3; `--text-body 1rem / 1.5`; `--text-caption 0.875rem / 1.4`; `--text-micro 0.75rem / 1.3` for badges and IDs. Weight tokens: `--font-regular 400`, `--font-medium 500`, `--font-semibold 600`.

Breakpoints are fixed: `360px` is the mobile floor and content must not break below it; `768px` is the drawer boundary; `1024px` is the desktop grid boundary. Subtask B must move the current `@media (max-width: 980px)` major mobile shell rules and the current `@media (max-width: 720px)` Agentic OS/work board/sidebar drawer rules to the 768 boundary unless a rule is explicitly desktop-density-only. 1024+ may use the persistent sidebar and multi-column hero/dashboard grids.

## Theme rules
Use `data-theme="light|dark"` on `document.documentElement`. Theme initialization must run before first paint with this dependency-free script placed in `index.html` inside `<head>` before the stylesheet:

`<script>(function(){var t=localStorage.getItem('stronghold.theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme', t||s);document.documentElement.style.colorScheme=t||s;})();</script>`

No-JS default is CSS media-query based: dark if `prefers-color-scheme: dark`, otherwise light. JS then persists only explicit manual choices. Add theme-aware native control rules: `html[data-theme="light"] { color-scheme: light; }` and `html[data-theme="dark"] { color-scheme: dark; }`. Header gets one keyboard-accessible sun/moon button with `aria-label` and `aria-pressed`; click toggles only `light`/`dark` and persists to `localStorage.stronghold.theme`. Semantic tokens, not raw hex, drive all components. Focus rings remain visible: `2px` accent outline with `2px` offset.

Reduced motion is strict: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; } }`. This kills transitions and animations for users who request reduced motion, including button state transitions, drawer slides, pulses, and graph animations.

## Component inventory
App shell: `appShell`, `appShellMain`, persistent `Sidebar`, mobile hamburger/backdrop/drawer. Header: `Hero`, guarded badge, refresh button, hero meta cells, and `ThemeToggle`. Navigation: sidebar items, badges, status dot, collapse toggle, `DashboardSubNav` links/select. Surfaces: `surfaceContent`, dashboard Agentic OS panel, Work board, Mission board, Operations disclosures, Approvals queue, Cron manager. Cards: `panel`, `stat`, `agenticOsCard`, hero stats, work cards, roadmap items, findings, mini cards, memory/discord panels, work-card feed/board cards. Controls: explicit button variants, icon-only theme toggle, forms, inputs, textarea, select. Badges: `status`, risk badges, work IDs, live/warn/placeholder pills. Tables/rows: Agentic OS table, cron rows, approval rows, audit rows; on mobile use horizontal scroll with sticky first column or card rows. Overlays: work-card drawer/backdrop; below 768 treat as full-screen sheet.

Button variants are opt-in class names; remove the global `button:not(.ghost):not(.subtle):not(.secondary)` primary rule from `src/styles.css`. `.btn-primary` is the only solid accent CTA: accent fill, white text, accent-hover on hover. `.btn-secondary` is bordered with transparent fill and `--color-accent-text` text. `.btn-ghost` has no fill and no border, with `--color-surface-hover` on hover. `.btn-subtle` uses surface fill and surface-hover on hover for nav items inside cards. `.btn-danger` uses danger fill sparingly for destructive actions. Keep compatibility shims for old `.ghost`, `.subtle`, and `.secondary` only during migration; new component code must use `.btn-*`.

Every button variant supports the same states: hover uses the variant's hover token; active/pressed darkens or lowers by one surface/accent step and may translate at most 1px; disabled sets opacity plus `cursor: not-allowed` and must remain non-interactive; loading keeps width stable and shows an inline spinner with `aria-busy="true"`; focus-visible uses the global 2px accent outline with 2px offset. Icon-only controls require accessible labels.

Target file map for subtask B, replacing today's flat component layout where needed: `src/components/Shell/AppShell.tsx` (was App.tsx shell), `src/components/Shell/Sidebar.tsx` (persistent desktop, drawer mobile), `src/components/Shell/Header.tsx` (Hero + refresh + theme toggle), `src/components/Shell/DashboardSubNav.tsx`, `src/components/Surfaces/Surfaces.tsx` (router shell), `src/components/Surfaces/Dashboard.tsx`, `src/components/Surfaces/Work.tsx`, `src/components/Surfaces/Missions.tsx`, `src/components/Surfaces/Operations.tsx`, `src/components/Surfaces/Approvals.tsx`, `src/components/Surfaces/Cron.tsx`, `src/components/Cards/Stat.tsx`, `src/components/Cards/Panel.tsx`, `src/components/Cards/WorkCard.tsx`, `src/components/Cards/AgenticOsCard.tsx`, `src/components/Controls/Button.tsx`, `src/components/Controls/ThemeToggle.tsx`, `src/components/Tables/ScrollableTable.tsx`, `src/design/tokens.ts`, `src/design/theme.ts`, and `src/styles.css`. `src/styles.css` should contain CSS variables, reset/base rules, and utility classes only; component styling belongs beside reusable component classes, not broad global selectors.

## Responsive rules
Below 768: sidebar becomes a left drawer; main content gets safe mobile padding; hero stats become one column; card grids and operations disclosures stack; tables scroll horizontally with first column sticky unless converted to cards; drawer/modal becomes full-screen sheet. At 768-1023: two-column grids may remain only when content has room; avoid squeezed lane boards. At 1024+: desktop sidebar and multi-column dashboard grids are allowed. Test at 360, 768, 1024, and 1440 viewport widths. The drawer uses `--shadow-card-elevated`, traps focus while open, closes on Escape and backdrop click, and returns focus to the trigger.

## Diff narrative: current → target
Current styles are already dark, Linear-inspired, and broad, but token names are implementation-specific (`--bg-*`, `--text-*`) and dark-only. Target introduces semantic light/dark tokens and removes raw rgba/hex from component rules. Sidebar keeps its structure but moves colors to theme tokens and becomes drawer at 768 instead of 720. Hero keeps title/meta/refresh but lightens visual weight, adds theme toggle, and uses softer cards. Agentic OS stats/cards keep layout but adopt warmer light surfaces, stronger text hierarchy, and single-column mobile. Work board keeps lane model but improves overflow, card density, and mobile scroll/card behavior. Operations disclosures, approvals, cron, audit, memory, and discord panels keep content but share one card/control/badge system. Tables keep fixed layout on desktop but must scroll or cardify on mobile. Buttons stop relying on broad primary styling; variants become explicit `.btn-*` classes so navigation/card buttons stay neutral.

## Design notes / known trade-offs
Warm cream `#f7f5f1` is intentional per Chris on 2026-07-06. It is less stark than Linear's pure white and slightly reduces contrast headroom, so text/accent tokens are darker in light mode than their dark-mode equivalents. The accent split is deliberate: `--color-accent` preserves the desired indigo for UI controls, while `--color-accent-text` is the accessible normal-text color. The system font strategy accepts slight cross-OS variance to protect the <250KB gzipped bundle target.
