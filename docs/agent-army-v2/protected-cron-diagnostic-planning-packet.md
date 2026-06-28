# Agent Army v2.0 — Protected Cron Diagnostic Planning Packet

**Created:** 2026-06-17  
**Work Card:** WC-AA-v2-DIAG-PLAN  
**Commander:** Belion  
**Operations:** Iron  
**QC:** Tusk  
**Scope:** Documentation-only planning packet  
**Important:** No logs inspected. No cron jobs run. No cron jobs, skills, configs, secrets, wrappers, schedules, or automations modified.

## Purpose

This packet prepares a future protected cron diagnostic pass for currently failing Agent Army workflows.

It does not authorize diagnosis, log inspection, repair, cron execution, schedule changes, prompt changes, skill edits, config edits, or credential changes.

## Current Planning Scope

Allowed now:

- Create this planning packet.
- Create future diagnostic work-card drafts.
- Use existing Agent Army v2 docs as source context.
- Run read-only verification commands for the docs folder and git status.

Forbidden now:

- Do not inspect logs yet.
- Do not run cron jobs.
- Do not modify cron jobs.
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets.
- Do not rename wrappers.
- Do not disable anything.
- Do not change schedules.
- Do not inspect tokens, OAuth files, API keys, or env vars.

## Protected Cron Jobs in Diagnostic Scope

The diagnostic scope is limited to planning for these currently documented failing jobs:

### 1. SENSEI Japanese N5-to-N2 Daily Tutor

```text
Job ID: da3378be9991
Profile: sensei
Schedule: 0 8 * * *
Delivery: origin
Skills: word-explainer, lesson-history
Protection: P-A critical protected production asset
Known documented status: error
```

Purpose:

- Generate daily Japanese lessons for Chris.

Why protected:

- It is an active scheduled learning workflow.
- It depends on Sensei profile behavior and profile-local skills.
- It may be chained to Kaisel's archive workflow.

### 2. Kaisel Archive Sensei Japanese Lesson to Google Drive

```text
Job ID: 12bd56eb8975
Profile: kaisel
Schedule: 10 8 * * *
Delivery: origin
Skills: google-workspace, japanese-study-drive-archive
Protection: P-A critical protected production asset
Known documented status: error
```

Purpose:

- Archive Sensei's daily Japanese lesson to Google Drive as a structured Google Docs worksheet.

Why protected:

- It uses Google Workspace integration.
- It may depend on OAuth tokens and Drive/Docs permissions.
- It must not expose or modify credentials without explicit approval.

### 3. Kamish Daily AI Usage and Cost Report

```text
Job ID: a83855395113
Profile: kamish
Schedule: 30 7 * * *
Delivery: origin
Skills: ai-cost-limit-monitoring, local-ollama-helper
Protection: P-A critical protected production asset
Known documented status: error
```

Purpose:

- Produce daily AI usage/cost/limit monitoring reports to reduce wasted cloud usage.

Why protected:

- It supports Agent Army v2 cost discipline.
- It may inspect usage or model-provider data.
- It may affect recommendations for cloud/local model routing.

## Diagnostic Principles

Future diagnostics must follow these rules:

1. Start read-only.
2. Inspect only approved logs/output sources.
3. Do not run jobs unless explicitly approved.
4. Do not edit cron prompts or schedules.
5. Do not edit skills.
6. Do not edit configs or secrets.
7. Do not modify OAuth tokens or provider credentials.
8. Do not attempt repair during diagnosis.
9. Produce a diagnostic report first.
10. Produce a separate repair work card if repair is needed.

## Future Read-Only Diagnostic Sources

These are candidate sources for a future diagnostic pass only after approval:

### Sensei

- Cron job metadata and last run output.
- Sensei profile logs.
- Sensei error logs.
- Sensei profile-local skill metadata for `word-explainer` and `lesson-history`.
- Recent Sensei session request dump names only, if needed.

### Kaisel Archive

- Cron job metadata and last run output.
- Kaisel profile logs.
- Kaisel error logs.
- `japanese-study-drive-archive` script output/logs.
- Google Workspace CLI/tool error summaries.
- File existence/metadata only for relevant scripts.

Do not read OAuth token contents unless Chris explicitly approves.

### Kamish

- Cron job metadata and last run output.
- Kamish profile logs.
- Kamish error logs.
- `ai-cost-limit-monitoring` skill metadata.
- `local-ollama-helper` diagnostic summaries.

## Possible Failure Categories

Future diagnosis should classify each failure into one or more categories:

```text
MODEL_PROVIDER_LIMIT
MODEL_PROVIDER_AUTH
PROMPT_OR_CONTEXT_FAILURE
SKILL_NOT_FOUND_OR_NOT_LOADED
SCRIPT_ERROR
TOOL_MISSING
PROFILE_CONFIG_ISSUE
CREDENTIAL_OR_PERMISSION_ISSUE
DELIVERY_FAILURE
DATA_DEPENDENCY_MISSING
TIMEOUT
UNKNOWN
```

## Future Diagnostic Report Template

```text
PROTECTED CRON DIAGNOSTIC REPORT
Work Card ID:
Cron Job Name:
Cron Job ID:
Profile:
Protection Level:
Diagnostic Scope Approved By:
Read-Only Sources Inspected:
Logs Inspected: Yes / No
Cron Run Triggered: No
Protected Systems Modified: No
Secrets/Configs Read: No / Approved Exception
Observed Error Summary:
Likely Failure Category:
Evidence:
Confidence: Low / Medium / High
Repair Needed: Yes / No / Unknown
Recommended Repair Work Card:
Tusk QC Verdict:
```

## Future Repair Rule

A diagnostic report may recommend repair, but repair requires a separate approval.

Repair work cards must specify:

```text
Exact cron job or skill affected:
Exact files/settings to modify:
Exact forbidden changes:
Backup/snapshot plan:
Rollback plan:
Validation plan:
Required model:
Tusk QC required:
Chris approval text:
```

## Stop Conditions for Future Diagnostics

Stop and ask Chris before continuing if:

- Logs contain secrets or tokens.
- Diagnosis requires reading OAuth token contents.
- A command would run a cron job.
- A command would modify state.
- A skill/config edit appears necessary.
- Provider/API credentials appear invalid and repair would require changes.
- The failure involves financial/account/security-sensitive access.

## Tusk QC Expectation

Expected verdict for this planning packet:

```text
PASS WITH WARNINGS
```

Expected warnings:

- This packet is planning-only.
- No logs were inspected.
- No root cause is claimed yet.
- Actual repair will require separate approval.
