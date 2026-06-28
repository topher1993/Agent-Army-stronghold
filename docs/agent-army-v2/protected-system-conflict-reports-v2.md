# Agent Army v2.0 — Protected System Conflict Reports v2

**Created:** 2026-06-17  
**Mode:** Documentation-only  
**Rule:** No protected system was changed.

## Report Format

```text
PROTECTED SYSTEM CONFLICT REPORT
Protected System Name:
Type:
Current Purpose:
Current Status:
Conflict Description:
Risk Level:
Recommended Action:
Can Continue Unchanged:
Requires Chris/Topher Approval:
Suggested Migration Plan:
Rollback Plan:
```

---

## Conflict 1 — Ledger Name Collision

```text
PROTECTED SYSTEM NAME:
Tool Division Ledger / Financial Division Ledger

TYPE:
Agent naming and routing conflict

CURRENT PURPOSE:
Tool Division Ledger was conceptually used for finance-related tooling.
Financial Division Ledger is Debt & Budget Specialist under GREED.

CURRENT STATUS:
Financial Ledger exists as a default profile skill and is the preferred correct owner of debt/budget reasoning.
Tool-side Ledger appears in the conceptual Tool Division roster, but should not own financial decisions.

CONFLICT DESCRIPTION:
The same name points to two different responsibilities: tool support vs financial reasoning.
This can cause routing errors, especially when Chris asks for budget/debt work.

RISK LEVEL:
Yellow

RECOMMENDED ACTION:
Keep Ledger under GREED.
Rename Tool Division Ledger conceptually to Abacus.
Abacus handles spreadsheets, calculation tools, budgeting software support, and finance-app organization.
Abacus does not make financial decisions.

CAN CONTINUE UNCHANGED:
Temporarily yes, with manual clarification.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes, before changing any skill, wrapper, memory, cron prompt, or profile documentation.

SUGGESTED MIGRATION PLAN:
1. Approve Work Card for Abacus rename.
2. Update only documentation first.
3. Search for actual Tool Division Ledger references.
4. Patch references to Abacus if safe.
5. Tusk verifies no Financial Division Ledger references were damaged.

ROLLBACK PLAN:
Restore prior Ledger wording in Tool Division docs and add explicit disambiguation labels.
```

---

## Conflict 2 — Sensei Daily Tutor Cron Error

```text
PROTECTED SYSTEM NAME:
SENSEI Japanese N5-to-N2 Daily Tutor (`da3378be9991`)

TYPE:
Cron Job / Learning Workflow

CURRENT PURPOSE:
Runs daily Sensei Japanese lesson generation at 08:00.

CURRENT STATUS:
Enabled; last status error.

CONFLICT DESCRIPTION:
Agent Army v2.0 expects reliable Learning Division daily outputs, but the protected cron currently errors.
The error state should be diagnosed, but the cron remains protected.

RISK LEVEL:
Yellow

RECOMMENDED ACTION:
Create a separate diagnostic work card.
Allowed first step should be read-only log/output inspection.
No schedule, prompt, skill, model, or delivery change without approval.

CAN CONTINUE UNCHANGED:
Yes, but daily lesson automation may continue failing.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes, before modifying the cron or related skills.

SUGGESTED MIGRATION PLAN:
1. Approve diagnostic-only work card.
2. Inspect latest cron output and Sensei logs.
3. Identify cause.
4. Produce repair plan.
5. Request explicit approval before patching.

ROLLBACK PLAN:
No rollback needed for read-only diagnosis. If later patched, preserve original cron prompt/settings before change.
```

---

## Conflict 3 — Kaisel Japanese Archive Cron Error

```text
PROTECTED SYSTEM NAME:
Kaisel Archive Sensei Japanese Lesson to Google Drive (`12bd56eb8975`)

TYPE:
Cron Job / Google Workspace Integration

CURRENT PURPOSE:
Archives Sensei daily lessons to Google Drive as structured Google Docs worksheets.

CURRENT STATUS:
Enabled; last status error.

CONFLICT DESCRIPTION:
Agent Army v2.0 requires reliable protected workflows. This workflow is important but currently failing.
Because it uses Google OAuth and Drive/Docs integration, it is higher sensitivity than a normal text workflow.

RISK LEVEL:
Yellow approaching Red if credentials or Google API settings are modified.

RECOMMENDED ACTION:
Create a separate diagnostic-only work card before any repair.
Do not modify OAuth tokens, Google credentials, cron schedule, or archive script without specific approval.

CAN CONTINUE UNCHANGED:
Yes, but archiving may continue failing.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes.

SUGGESTED MIGRATION PLAN:
1. Approve diagnostic-only work card.
2. Inspect cron output and Kaisel logs.
3. Confirm whether failure is model, prompt, script, API, or token-related.
4. Produce repair plan.
5. Request explicit approval for any script/skill/cron change.

ROLLBACK PLAN:
Before any future patch, save exact prior script/skill/cron prompt content. Restore if validation fails.
```

---

## Conflict 4 — Kamish Cost Monitor Cron Error

```text
PROTECTED SYSTEM NAME:
Kamish Daily AI Usage and Cost Report (`a83855395113`)

TYPE:
Cron Job / Cost Monitoring Workflow

CURRENT PURPOSE:
Reports AI usage/cost efficiency and helps reduce wasted ChatGPT/cloud model usage.

CURRENT STATUS:
Enabled; last status error.

CONFLICT DESCRIPTION:
Agent Army v2.0 relies on cost-aware model routing, but the existing monitoring job is failing.
This may reduce visibility into quota/usage pressure.

RISK LEVEL:
Yellow

RECOMMENDED ACTION:
Create diagnostic-only work card. Check cron output and Kamish logs. Do not modify schedule, skill, prompt, model, or delivery without approval.

CAN CONTINUE UNCHANGED:
Yes, but reporting may continue failing.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes.

SUGGESTED MIGRATION PLAN:
1. Approve diagnostic-only work card.
2. Inspect latest output/logs.
3. Identify failure source.
4. Draft repair plan.
5. Tusk reviews before implementation.

ROLLBACK PLAN:
No rollback needed for read-only diagnosis. Preserve prompt/settings before any future change.
```

---

## Conflict 5 — Model Configuration Ambiguity

```text
PROTECTED SYSTEM NAME:
Hermes model configuration

TYPE:
Config / Model Routing

CURRENT PURPOSE:
Controls default provider/model routing and fallback behavior.

CURRENT STATUS:
`hermes config` displays default model/provider fields involving `gpt-5.5`, `openai-codex`, and OpenRouter `nex-agi/nex-n2-pro:free`.

CONFLICT DESCRIPTION:
Agent Army v2.0 requires model verification and reliable model routing. Ambiguous config makes it harder to know which model is actually handling work.

RISK LEVEL:
Yellow; Red if secrets/API keys/env vars are modified.

RECOMMENDED ACTION:
Create a model-routing audit work card. Read configs/logs only first. Do not edit config until Chris approves exact target model-routing state.

CAN CONTINUE UNCHANGED:
Temporarily yes, but outputs should be marked `UNVERIFIED MODEL — REVIEW REQUIRED` when exact model cannot be confirmed.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes.

SUGGESTED MIGRATION PLAN:
1. Approve read-only model-routing audit.
2. Inspect config, auth, provider logs, and current active model metadata.
3. Propose exact target routing table.
4. Request approval for config edits.
5. Verify with test calls and log metadata.

ROLLBACK PLAN:
Before any future config edit, copy current config snapshot and restore if model test fails.
```

---

## Conflict 6 — Existing `cipher` Wrapper vs Windows Built-in `cipher`

```text
PROTECTED SYSTEM NAME:
`cipher` / `cipher-agent` wrappers

TYPE:
Wrapper / Command naming

CURRENT PURPOSE:
Database specialist wrapper. `cipher-agent` exists to avoid conflict with Windows built-in `cipher`.

CURRENT STATUS:
Both `cipher` and `cipher-agent` wrappers exist. `cipher-agent` is preferred.

CONFLICT DESCRIPTION:
The bare `cipher` command may conflict with Windows built-in behavior or user expectations.

RISK LEVEL:
Green/Yellow

RECOMMENDED ACTION:
Do not remove anything now. Continue using `cipher-agent` as the official database specialist command.

CAN CONTINUE UNCHANGED:
Yes.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes, before deleting or renaming wrappers.

SUGGESTED MIGRATION PLAN:
1. Document `cipher-agent` as official.
2. Avoid invoking bare `cipher`.
3. Only remove/rename bare wrapper if Chris approves.

ROLLBACK PLAN:
Restore prior wrapper files from backup if a future rename breaks usage.
```

---

## Conflict 7 — Stronghold Snapshot Modified Outside Day 2 Scope

```text
PROTECTED SYSTEM NAME:
`C:/Users/tophe/agent-army-stronghold/public/data/stronghold-snapshot.json`

TYPE:
Project file / Stronghold app data

CURRENT PURPOSE:
Stronghold UI/application data snapshot.

CURRENT STATUS:
Previously observed as modified in git status during Day 1. Day 2 scope did not modify it.

CONFLICT DESCRIPTION:
Agent Army v2.0 documentation rollout should not modify existing app data files. Existing modification should be treated as separate work.

RISK LEVEL:
Yellow

RECOMMENDED ACTION:
Do not touch during Agent Army v2 docs rollout. If needed, create separate Stronghold work card to inspect git diff and decide keep/revert.

CAN CONTINUE UNCHANGED:
Temporarily yes.

REQUIRES CHRIS/TOPHER APPROVAL:
Yes, before reverting, committing, or modifying.

SUGGESTED MIGRATION PLAN:
1. Create read-only diff work card if Chris asks.
2. Determine source of modification.
3. Tusk reviews if action is needed.

ROLLBACK PLAN:
Use git diff/checkout only after explicit approval.
```
