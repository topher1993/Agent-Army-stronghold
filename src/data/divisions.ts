// FEATURE — Phase D4 Activity Graph: division roster (single source of truth).
//
// Mirrors the governance SOULs that the Stronghold agent army runs under.
// IDs are case-sensitive display names ("Belion", "Igris", ...) — they MUST
// match the `actor` field in audit-log entries so edge matching works.
//
// Hand-off rules and colors live alongside the roster because they describe
// the same conceptual graph: who can dispatch to whom, and what visual
// hue to give each node in the dashboard rendering.
//
// IMPORTANT: This file is the UI's mirror of the SOULs. The SOULs are the
// source of truth in production; this file MUST stay in sync with them.
// If a new division is added in the SOULs, add it here too.

export type DivisionId =
  | 'Belion' | 'Igris' | 'Atlas' | 'Forge' | 'Clix' | 'Nova' | 'Sentinel'
  | 'Cipher' | 'Pulse' | 'Vector' | 'Nexus' | 'Beru' | 'Sensei' | 'GREED'
  | 'Tusk' | 'Kaisel';

export type Division = {
  id: DivisionId;
  label: string;
  /** Short caption shown in the dashboard card and tooltip. */
  caption: string;
  /** Hex color used as the node fill in the SVG. */
  color: string;
  /** Logical tier for the layout: orchestrator, engineering, specialist. */
  tier: 'orchestrator' | 'engineering' | 'specialist';
};

export const DIVISIONS: Division[] = [
  // Tier 1 — orchestrator
  { id: 'Belion', label: 'Belion', caption: 'Orchestrator', color: '#49ffc7', tier: 'orchestrator' },

  // Tier 2 — engineering director (Belion's delegate)
  { id: 'Igris', label: 'Igris', caption: 'Engineering Director', color: '#5da6ff', tier: 'engineering' },

  // Tier 3 — specialists (ordered roughly by what shows up in the audit log)
  { id: 'Forge',    label: 'Forge',    caption: 'Backend',           color: '#f78c6c', tier: 'specialist' },
  { id: 'Clix',     label: 'Clix',     caption: 'Frontend',          color: '#f7b73c', tier: 'specialist' },
  { id: 'Nova',     label: 'Nova',     caption: 'Mobile',            color: '#ff6bd6', tier: 'specialist' },
  { id: 'Sentinel', label: 'Sentinel', caption: 'Security review',   color: '#c264ff', tier: 'specialist' },
  { id: 'Atlas',    label: 'Atlas',    caption: 'Architecture',      color: '#7c5cff', tier: 'specialist' },
  { id: 'Pulse',    label: 'Pulse',    caption: 'QA',                color: '#5cf0c2', tier: 'specialist' },
  { id: 'Vector',   label: 'Vector',   caption: 'DevOps',            color: '#5cd1ff', tier: 'specialist' },
  { id: 'Cipher',   label: 'Cipher',   caption: 'Database',          color: '#ffd95c', tier: 'specialist' },
  { id: 'Nexus',    label: 'Nexus',    caption: 'AI / LLM',          color: '#ff95c2', tier: 'specialist' },
  { id: 'Beru',     label: 'Beru',     caption: 'Learning strategy', color: '#a3ff5c', tier: 'specialist' },
  { id: 'Sensei',   label: 'Sensei',   caption: 'Japanese content',  color: '#5cffd1', tier: 'specialist' },
  { id: 'GREED',    label: 'GREED',    caption: 'Financial',         color: '#ffce5c', tier: 'specialist' },
  { id: 'Tusk',     label: 'Tusk',     caption: 'QC',                color: '#ff5c8a', tier: 'specialist' },
  { id: 'Kaisel',   label: 'Kaisel',   caption: 'Tool division',     color: '#8aa0ff', tier: 'specialist' },
];

export const DIVISION_BY_ID: Record<DivisionId, Division> = DIVISIONS.reduce(
  (acc, d) => { acc[d.id] = d; return acc; },
  {} as Record<DivisionId, Division>,
);

/**
 * Hand-off rule: a predicate over an audit entry's actor + capability that
 * resolves to a target division (the receiver of the hand-off).
 *
 * We deliberately use capability *patterns* rather than exact matches so
 * governance directives like "stronghold:*" or "agent-army:*" flow into the
 * Belion → Igris edge. Pattern semantics:
 *
 *   - `startsWith(prefix)`  — capability begins with prefix
 *   - `endsWith(suffix)`    — capability ends with suffix
 *   - `equals(value)`       — exact equality
 *   - `regex`               — full string match against the regex
 */
export type CapabilityMatcher =
  | { kind: 'startsWith'; value: string }
  | { kind: 'endsWith';   value: string }
  | { kind: 'equals';     value: string };

export type HandoffRule = {
  from: DivisionId;
  to: DivisionId;
  matcher: CapabilityMatcher;
  /** Short description shown in the dashboard tooltip. */
  description: string;
};

/**
 * The hand-off table. Mirrors the routing rules in the governance SOULs:
 *   - Belion dispatches governance work to Igris
 *   - Igris delegates engineering work to specialists
 *   - specialists back-report to Igris
 *   - Beru dispatches Japanese content to Sensei
 *   - Tusk QC verdicts and Kaisel tool reports back to Igris
 *
 * Back-report capabilities are conventionally "<specialty>:-report" or
 * "engineering:<specialty>-report"; the rule below is intentionally
 * forgiving so the live graph isn't brittle to small wording changes.
 */
export const HANDOFF_RULES: HandoffRule[] = [
  // Orchestrator dispatch (any governance capability routes to Igris)
  { from: 'Belion', to: 'Igris', matcher: { kind: 'startsWith', value: 'stronghold' },  description: 'Stronghold governance dispatch' },
  { from: 'Belion', to: 'Igris', matcher: { kind: 'startsWith', value: 'agent-army' }, description: 'Agent-army governance dispatch' },

  // Engineering delegation (Igris -> specialists)
  { from: 'Igris', to: 'Forge',    matcher: { kind: 'equals', value: 'engineering:backend' },         description: 'Backend delegation' },
  { from: 'Igris', to: 'Clix',     matcher: { kind: 'equals', value: 'engineering:frontend' },        description: 'Frontend delegation' },
  { from: 'Igris', to: 'Nova',     matcher: { kind: 'equals', value: 'engineering:mobile' },          description: 'Mobile delegation' },
  { from: 'Igris', to: 'Sentinel', matcher: { kind: 'equals', value: 'engineering:security-review' }, description: 'Security review delegation' },
  { from: 'Igris', to: 'Atlas',    matcher: { kind: 'equals', value: 'engineering:architecture-review' }, description: 'Architecture review delegation' },
  { from: 'Igris', to: 'Pulse',    matcher: { kind: 'equals', value: 'engineering:qa' },              description: 'QA delegation' },
  { from: 'Igris', to: 'Vector',   matcher: { kind: 'equals', value: 'engineering:devops' },          description: 'DevOps delegation' },

  // Specialist back-report to Igris (the spec's "+report" convention).
  // We match a small family of capabilities per specialist to be robust to
  // small wording drift; anything that is NOT a back-report is fine — the
  // service falls through to the Igris->specialist forward rules and
  // matches nothing because the actor is not Igris.
  { from: 'Forge',    to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:backend-report' }, description: 'Backend back-report' },
  { from: 'Clix',     to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:frontend-report' }, description: 'Frontend back-report' },
  { from: 'Nova',     to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:mobile-report' }, description: 'Mobile back-report' },
  { from: 'Sentinel', to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:security-review-report' }, description: 'Security review back-report' },
  { from: 'Atlas',    to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:architecture-review-report' }, description: 'Architecture review back-report' },
  { from: 'Pulse',    to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:qa-report' }, description: 'QA back-report' },
  { from: 'Vector',   to: 'Igris', matcher: { kind: 'startsWith', value: 'engineering:devops-report' }, description: 'DevOps back-report' },

  // QC verdicts back to engineering director (anything ending in ":review"
  // or the literal "qc:verdict"). The brief specifies either suffix or
  // "QC verdict" — we interpret "QC verdict" as the canonical capability
  // "qc:verdict" so the predicate stays simple and testable.
  { from: 'Tusk', to: 'Igris', matcher: { kind: 'endsWith', value: ':review' }, description: 'QC review back-report' },
  { from: 'Tusk', to: 'Igris', matcher: { kind: 'equals',   value: 'qc:verdict' }, description: 'QC verdict back-report' },

  // Tool-division back-report (Kaisel reports on tool surfaces)
  { from: 'Kaisel', to: 'Igris', matcher: { kind: 'startsWith', value: 'tool:' }, description: 'Tool division back-report' },

  // Learning strategy → Japanese content
  { from: 'Beru', to: 'Sensei', matcher: { kind: 'equals', value: 'content:lesson' }, description: 'Learning strategy → Japanese content' },
];

/**
 * Find every hand-off rule whose `from` matches the actor and whose matcher
 * accepts the capability. Returns the matching rules in declaration order
 * (first match wins if multiple rules match the same actor/capability pair).
 */
export function matchHandoffRules(actor: string, capability: string): HandoffRule[] {
  if (!actor || !capability) return [];
  const out: HandoffRule[] = [];
  for (const rule of HANDOFF_RULES) {
    if (rule.from !== actor) continue;
    if (matchCapability(rule.matcher, capability)) out.push(rule);
  }
  return out;
}

function matchCapability(matcher: CapabilityMatcher, capability: string): boolean {
  switch (matcher.kind) {
    case 'equals':     return capability === matcher.value;
    case 'startsWith': return capability.startsWith(matcher.value);
    case 'endsWith':   return capability.endsWith(matcher.value);
    default: return false;
  }
}