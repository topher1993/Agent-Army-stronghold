# Agent Army v2.0 — Documentation Index

**Created:** 2026-06-17  
**Work Card:** WC-AA-v2-DAY7-DOCINDEX  
**Commander:** Belion  
**Operations:** Iron  
**QC:** Tusk  
**Scope:** Documentation-only index under `docs/agent-army-v2/`

## Purpose

This index is the single navigation layer for Agent Army v2.0 governance documentation. It points to the operating model, protected-system inventory, work-card system, model routing, QC workflow, cloud-limit guardrails, and controlled implementation plan.

This index does not modify or activate live Hermes systems.

## Core Command Structure

```text
Chris / Topher
└── Belion — Supreme Commander / Chief of Staff
    ├── Iron — Operations Commander
    ├── Tusk — Quality & Verification Commander
    ├── Kaisel — Tool Master
    ├── Igris — Engineering Director
    ├── GREED — Financial Strategist
    └── Beru — Learning General
```

## Reading Order

### 1. Start Here

- `README.md`  
  Approved Agent Army v2.0 operating model, hierarchy, active/reserve agents, naming conflict resolution, and rollout strategy.

### 2. Safety and Protected Systems

- `protected-system-inventory-v1.md`  
  Initial inventory of protected cron jobs, profiles, wrappers, skills, model/credential status, and initial conflicts.

- `day-2-hierarchy-and-protected-systems.md`  
  Day 2 refined command responsibilities, active/reserve status, and protected-system policy.

- `protected-system-list-v2.md`  
  Protection levels P-A/P-B/P-C, protected cron jobs, protected profiles/wrappers, skills, configs, credentials, and workflow groups.

- `protected-system-conflict-reports-v2.md`  
  Conflict reports for Ledger naming, failing Sensei/Kaisel/Kamish cron jobs, model config ambiguity, cipher/cipher-agent conflict, and Stronghold snapshot modification.

### 3. Work Cards and Model Governance

- `work-card-model-routing-qc-v1.md`  
  Early combined baseline for work-card, model-routing, and QC rules.

- `work-card-template-v2.md`  
  Finalized work-card template, fields, priority/risk rules, examples, and Day 3 work-card record.

- `model-routing-rules-v2.md`  
  Finalized routing rules for `gemma4`, `qwen3.5:9b`, Gemini keys, GPT Codex, and OpenRouter fallback.

- `model-verification-rules-v2.md`  
  Model verification statuses, verification sources, fallback verification, wrong-model rule, and model mismatch report.

### 4. Quality Control and Review Routing

- `tusk-qc-workflow-v2.md`  
  Tusk QC intake, checklists, verdicts, trust levels, escalation rules, and QC report template.

- `review-routing-rules-v2.md`  
  Review routing by risk, division, specialist reviewer, and human approval requirement.

### 5. Cloud Limits and Fallback

- `cloud-limit-guardrails-v2.md`  
  Cloud-limit protocol, retry limit, triage flow, freeze list, local night-shift rules, and cloud budget priority.

- `fallback-and-local-night-shift-rules-v2.md`  
  Fallback decision tree, fallback report, local night-shift allowed/forbidden tasks, and trust rules.

- `limit-recovery-report-template-v2.md`  
  Full and Telegram-friendly Limit Recovery Report templates with examples.

### 6. Controlled Implementation

- `codex-implementation-brief-v2.md`  
  Future GPT Codex implementation brief, required model, allowed/forbidden actions, Day 7 prompt, validation, and rollback requirements.

- `implementation-work-cards-v2.md`  
  Draft work cards for Day 7 docs index, protected cron diagnostic planning, model-routing audit planning, and future skill integration planning.

- `implementation-safety-rollback-validation-v2.md`  
  Allowed/forbidden categories, protected paths, validation commands, rollback rules, Tusk implementation validation template, and stop conditions.

### 7. Day 7 Completion

- `agent-army-v2-index.md`  
  This index.

- `day-7-controlled-implementation-report.md`  
  Day 7 execution report, verification evidence, scope compliance, and QC outcome.

### 8. Final Live Integration

- `agent-army-v2-final-completion-report.md`  
  Final `WC-AA-v2-FINALIZE-001` report covering live governance skill integration, core profile SOUL updates, targeted Hermes skill-loader validation, cron skill preload repair, and Tusk QC verdict.

## Active Governance Rules

### Work Cards

Serious tasks require a work card before execution.

Required task classes include:

- Engineering work
- Financial planning
- Tool/automation changes
- Cron jobs
- Skills
- Config/model routing
- Yellow/Red risk tasks
- Protected-system involvement

### Protected Systems

Protected systems include:

- Cron jobs
- Skills and profile-local skills
- Automations and workflows
- Configs, secrets, tokens, API keys, environment variables
- Memory files and profile wrappers
- Stable integrations and working tools

Default behavior:

```text
Preserve what already works.
```

### Model Routing

- Use local models for safe preparation.
- Use cloud models for important judgment.
- Protect GPT Codex for implementation and final technical review.
- Do not silently switch models.
- If required model is unavailable and fallback is not approved, pause.

### QC

Tusk review is required for:

- Yellow tasks
- Red tasks
- Coding outputs
- Financial planning outputs
- Model fallback
- Cloud-limit downgrade
- Agent-structure changes
- Protected-system impacts

### Human Approval

Chris approval is required before:

- Cron changes
- Skill changes
- Config changes
- Secret/API/token/env changes
- Wrapper renames
- Disabling automations
- Deployment/publishing
- Sending messages
- File deletion
- Financial/account actions

## Current Known Warnings

- Sensei daily tutor cron still has prior `error` status, but its configured profile-local skills now resolve under the Sensei profile.
- Kaisel Japanese archive cron still has prior `error` status, but its configured profile-local skills now resolve under the Kaisel profile.
- Kamish cost report cron still has prior `error` status, but its configured profile-local skills now resolve under the Kamish profile.
- Hermes model routing/config remains a separate protected-system audit area.
- `public/data/stronghold-snapshot.json` has a pre-existing modification outside this rollout scope and was not touched by v2.0 finalization.
- Live Agent Army v2.0 integration has been started/completed for the governance skill, core profile SOUL operating notes, Hermes profile-aware skill loading, and the Daily Agent Army Morning Checkup skill list.

## Finalization Status

`WC-AA-v2-FINALIZE-001` moved Agent Army v2.0 from proposal/docs-only status into live operating governance.

Completed live integration areas:

1. `agent-army-governance` skill updated with a finalization reference.
2. Core profile SOUL files updated for Beru, Sensei, Kaisel, Kamish, and Igris.
3. Hermes `tools.skills_tool` patched and tested for profile-aware skill path resolution.
4. Daily Agent Army Morning Checkup cron updated to preload `agent-army-governance` in addition to `hermes-agent`.
5. Cron skill resolution validated for all configured cron jobs without exposing prompts or secrets.

Remaining future work is not v2.0 governance completion; it is normal operations:

1. Run live cron jobs only when specifically desired.
2. Audit or adjust model routing/config only under a separate protected-system work card.
3. Commit/publish/deploy only under explicit release approval.
