# Agent Army v2.0 — Repair Pass 2026-06-17

**Requested by:** Chris / Topher  
**Executed by:** Belion  
**Mode:** Approved safe repair pass  

## Scope

Applied the failed-check repairs from Tusk's verification report that could be completed without touching secrets, cron schedules/prompts, deployments, account actions, or destructive cleanup.

## Repairs Applied

1. Formalized Belion/default command identity with `profiles/default/SOUL.md`.
2. Created live command profiles and wrappers for Iron, Tusk, and GREED.
3. Tightened Financial Division safety wording and aligned active GREED roster.
4. Added strict finance safety rules to Ledger, Mansa, Rockefeller, Morgan, Rothschild, and Medici skills.
5. Updated protected-system inventory to reflect Morning Checkup loading `agent-army-governance`.
6. Added `Verification Source` to work-card and Tusk QC intake templates.

## Explicitly Not Done

- No cron jobs were run, edited, paused, resumed, removed, or rescheduled.
- No secrets, OAuth tokens, API keys, environment variables, or credential stores were read or modified.
- No deployment, publish, push, account action, money movement, deletion, or repo reset was performed.
- No runtime model-routing enforcement code was added in this pass.

## Remaining Follow-Up

- Cron error statuses still require separate read-only diagnosis and separately approved validation runs.
- Programmatic model-routing/Tusk preflight enforcement remains optional future engineering work.
- Existing unrelated repo changes should be reviewed before any commit/revert decision.
