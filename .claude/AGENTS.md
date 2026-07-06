# Agent Army Subagent Roster

**Date:** 2026-07-01
**Owner:** Iron (Operations Division) maintains this index as specialists are added or changed.

## What this is

This file is the canonical index of runnable Claude Code subagent definitions for the `agent-army-stronghold` project. The agent army has **6 divisions** (4 existing + 2 new), each with a Tier 2 leader and a roster of Tier 3 specialists. This file maps each entity to its runnable subagent definition (project-scoped) and to its profile-level SOUL (the profile is the broader runtime; the project-scoped def is the project-specific overlay).

## Two-layer architecture

Every specialist has TWO definitions:
1. **Profile-level SOUL** at `%LOCALAPPDATA%/hermes/profiles/<name>/SOUL.md` (Windows primary; legacy `~/.hermes/` path was removed 2026-07-06) — defines behavior when Chris runs `hermes -p` with that profile. This is the broader runtime.
2. **Project-scoped subagent def** at `.claude/agents/<name>.md` — defines behavior when Chris runs `claude --agent <name>` from this project. This is the project-specific overlay (adds Stronghold-specific owns/does-not-touch rules that the profile SOUL doesn't have).

19 profile-level SOULs exist on disk. Project-scoped defs exist for a subset; this file lists which.

## The Army (6 divisions)

### 1. Tool Division — Leader: **Kaisel** (Tool Master)

Manages all software, services, automation, and integration tools. Specialists:

| Specialist | Domain | Project def | Profile SOUL |
|---|---|---|---|
| GWOT | Google Workspace | ❌ missing | ❌ no profile |
| Vault | Knowledge Management | ❌ missing | ❌ no profile |
| Orbit | Scheduling | ❌ missing | ❌ no profile |
| Harbor | Storage | ❌ missing | ❌ no profile |
| Relay | Communication | ❌ missing | ❌ no profile |
| Beacon | Automation | ❌ missing | ❌ no profile |
| Ledger | Finance Tools | ❌ missing | ❌ no profile |
| Scout | Research Tools | ❌ missing | ❌ no profile |

### 2. Engineering Division — Leader: **Igris** (Engineering Director)

Oversees software, systems, architecture, AI/LLM, coding, quality, and security. Specialists:

| Specialist | Domain | Project def | Profile SOUL |
|---|---|---|---|
| Forge | Backend | ✅ `.claude/agents/forge.md` | ✅ `profiles/forge/SOUL.md` |
| Clix | Frontend | ✅ `.claude/agents/clix.md` | ✅ `profiles/clix/SOUL.md` |
| Nova | Mobile | ✅ `.claude/agents/nova.md` | ✅ `profiles/nova/SOUL.md` |
| **Titan** | **Desktop** | ✅ `.claude/agents/titan.md` (created 2026-07-01) | ✅ `profiles/titan/SOUL.md` |
| Vector | DevOps | ✅ `.claude/agents/vector.md` | ✅ `profiles/vector/SOUL.md` |
| Cipher | Database | ✅ `.claude/agents/cipher.md` | ✅ `profiles/cipher/SOUL.md` |
| Sentinel | Security | ✅ `.claude/agents/sentinel.md` | ✅ `profiles/sentinel/SOUL.md` |
| Atlas | Architecture | ✅ `.claude/agents/atlas.md` | ✅ `profiles/atlas/SOUL.md` |
| Pulse | QA | ✅ `.claude/agents/pulse.md` | ✅ `profiles/pulse/SOUL.md` |
| Nexus | AI/LLM | ✅ `.claude/agents/nexus.md` | ✅ `profiles/nexus/SOUL.md` |

### 3. Financial Division — Leader: **GREED** (Financial Strategist)

Debt reduction, budgeting, cash flow, emergency fund, spending analysis, financial organization, income growth, wealth building, risk management, and financial planning. Specialists:

| Specialist | Domain | Project def | Profile SOUL |
|---|---|---|---|
| Ledger | Debt & Budget | ❌ missing | ❌ no profile |
| Mansa | Investment & Wealth | ❌ missing | ❌ no profile |
| Rockefeller | Income Growth | ❌ missing | ❌ no profile |
| Morgan | Market Intelligence | ❌ missing | ❌ no profile |
| Rothschild | Risk & Capital Preservation | ❌ missing | ❌ no profile |
| Medici | Financial Planning | ❌ missing | ❌ no profile |

**Note:** "Ledger" appears in both Tool Division (Ledger: Finance Tools) and Financial Division (Ledger: Debt & Budget). These are **two different specialists with the same display name** — disambiguation needed. Suggest renaming the Financial one to `Ledger-Finance` or `Ledger-Budget` to avoid confusion. Atlas owns this ADR.

### 4. Learning & Development Division — Leader: **Beru** (Learning General)

Curriculum strategy, mentor coordination, learning roadmaps, long-term skill development. Specialists:

| Specialist | Domain | Project def | Profile SOUL |
|---|---|---|---|
| Sensei | Japanese Mentor | ✅ `.claude/agents/sensei.md` | ✅ `profiles/sensei/SOUL.md` |

### 5. Operations Division (NEW 2026-07-01) — Leader: **Iron** (Operations Commander)

Manages work cards, breaks ideas into actionable tasks, schedules tasks, tracks dependencies, tracks progress, tracks status, prioritizes work, creates daily reports, creates weekly reports, prevents Belion from becoming the bottleneck, decides which agents should be active/reserved/dormant, coordinates handoffs between divisions.

**Iron does NOT replace Belion.** Belion commands strategy; Iron manages execution flow.

| Specialist | Domain | Project def | Profile SOUL |
|---|---|---|---|
| Iron (self) | Operations Commander | ✅ `.claude/agents/iron.md` | ✅ `profiles/iron/SOUL.md` |

### 6. Quality Control / Audit Division (NEW 2026-07-01) — Leader: **Tusk** (Quality & Verification Commander)

Reviews outputs from all divisions. Checks for hallucinations, contradictions, work-card completion, model appropriateness, financial claim sanity, engineering correctness, and cloud-limit fallback behavior. Every important task must pass through Tusk or a Tusk-approved QC workflow before it is considered reliable. **Tusk is not optional.**

| Specialist | Domain | Project def | Profile SOUL |
|---|---|---|---|
| Tusk (self) | Quality & Verification Commander | ✅ `.claude/agents/tusk.md` | ✅ `profiles/tusk/SOUL.md` |
| Kamish | Cost/Usage Audit (Tier 3 under Tusk) | ✅ `.claude/agents/kamish.md` | ✅ `profiles/kamish/SOUL.md` |

### Above all: **Belion** (Supreme Commander / Chief of Staff)

Reports to Chris. Owns strategy and the entire army. The `default` profile runs Belion. Belion does NOT manage work cards (Iron does) and does NOT review outputs (Tusk does). Belion commands.

## Dispatch chain

```
Chris (the human)
  → Belion (Supreme Commander — strategy)
    → Iron (Operations Division — work cards, scheduling, handoffs, reports)
      → Igris (Engineering Division — code execution)
        → Specialist (Tier 3 — implements, returns work product)
      ← Igris (verifies: build, tests, visual smoke)
      → Tusk (QC Division — reviews actual diff, not summary)
        → Kamish (Cost/Usage Audit — runs daily cron, reports to Tusk)
      ← Tusk (APPROVED / VETOED + P0/P1)
      ← Iron (closes work card)
    ← Iron (daily/weekly report to Belion)
  ← Belion (strategy decisions to Chris)
```

## Skills

Skills live at `.claude/skills/<name>/SKILL.md`. Current project-scoped skills:

| Skill | Purpose | Owner |
|---|---|---|
| `taste-skill` | Anti-slop frontend rules (v2, default) | Clix |
| `redesign-skill` | Audit-then-fix protocol for existing projects | Clix |
| `minimalist-skill` | Explicit anti-defaults list | Clix |
| `gpt-tasteskill` | Stricter Awwwards-tier variant for Codex/Claude | Clix |
| `brutalist-skill` | Swiss type + military terminal aesthetic | Clix |
| `soft-skill` | Calm, premium UI with spring motion | Clix |
| `stitch-skill` | Google Stitch DESIGN.md export format | Clix |
| `image-to-code-skill` | Image-first implementation pipeline | Clix |
| `imagegen-frontend-web` | Web section image generation | Clix |
| `imagegen-frontend-mobile` | Mobile screen image generation | Clix |
| `brandkit` | Brand kit / identity board image generation | Clix |
| `taste-skill-v1` | Original v1 of taste-skill (preserved for backward compat) | Clix |
| `jisho-phrase-verification` | Verify Japanese phrases against JMDICT | Sensei |
| `google-workspace` | Gmail/Calendar/Drive integration patterns | Kaisel |
| `ai-cost-limit-monitoring` | Daily cost/usage audit | Kamish |
| `local-ollama-helper` | Local Ollama model usage | Kamish |
| `kanban-orchestrator` | Decomposition playbook for Iron | Iron |
| `kanban-worker` | Pitfalls for kanban workers | Iron |

The `output-skill` (`full-output-enforcement`) is global at `~/.claude/skills/output-skill/SKILL.md` and applies to every dispatch.

## Governance rules (memory-enforced, 2026-07-01)

1. **No Belion-direct edits on UI/layout/CSS/typography/color/shadow/spacing.** All such work routes to Clix via Igris. No exceptions for "bounded sub-30-line fixes" — the bounded exception covers TYPE/IMPORT/TEST mismatches only.
2. **Tusk reviews code, not summaries.** Every Tusk dispatch includes the actual `git diff` or explicit diff-review commands. Paraphrased prose is not acceptable.
3. **Tusk (GPT-5.5) is exclusive system-level QC.** Unreachable → STOP with "QC BLOCKED"; never silently substitute. (Memory rule.)
4. **Sentinel is read-only.** Sentinel's hand-off is a P0/P1/P2 list. It does not implement.
5. **Atlas designs; specialists implement.** Atlas produces ADRs; Igris routes implementation to the appropriate specialist.
6. **No specialist commits.** Tusk approves; Igris commits.
7. **Iron manages work cards, not specialists.** Igris dispatches the actual engineering work; Iron tracks the work-card lifecycle.
8. **Every important task passes through Tusk.** No exception. Tusk VETOED → fix and re-review. Tusk unreachable → STOP with "QC BLOCKED".

## Out of scope for this index

- Adding 14 missing project-scoped defs for Tool + Financial specialists (Atlas owns the ADR; the defs will be created when those specialists are first invoked)
- Disambiguating "Ledger" appearing in both Tool Division and Financial Division (Atlas owns this ADR)
- Cross-repository subagent copies for project-portable agents (Clix, Nova, Beru, Sensei, GREED, Kaisel) — separate work item
- System-level enforcement hook (PreToolUse rule that refuses Edit/Write on UI files unless `--agent clix` is set) — separate work item, owner TBD
- `divisions.ts` UI-mirror updates to add Iron, Tusk (as division leader), Kamish, plus the 14 missing specialists — separate work item
