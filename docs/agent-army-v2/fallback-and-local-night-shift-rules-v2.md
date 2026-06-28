# Agent Army v2.0 — Fallback and Local Night-Shift Rules v2

**Created:** 2026-06-17  
**Owner:** Iron — Operations Commander  
**Commander:** Belion  
**QC:** Tusk  
**Mode:** Documentation-only Day 5 artifact

## Purpose

Fallback and local night-shift rules let the Agent Army keep making safe progress when cloud models are limited, while preventing dangerous downgrades.

## Core Fallback Rule

Fallback is allowed only if the work card says it is allowed.

No agent may silently switch models.

## Fallback Fields Required

Every serious work card must include:

```text
Required Model:
Backup Model:
Fallback Allowed:
Fallback Used:
Fallback Reason:
Fallback Risk Check:
Model Verification Status:
```

## Fallback Risk Check

Before fallback, answer:

```text
Is the task Green, Yellow, or Red?
Does the backup model match the risk level?
Is the fallback approved in the work card?
Will fallback affect final trust level?
Is Tusk QC required?
Is Chris approval required?
```

## Fallback by Risk Level

### Green

Fallback allowed between approved local models.

Allowed examples:

- `gemma4` -> `qwen3.5:9b`
- `qwen3.5:9b` -> `gemma4` for simple cleanup

No Chris approval needed if no protected systems are affected.

### Yellow

Fallback allowed only for:

- Drafting.
- Summarizing.
- Organizing.
- Work-card preparation.
- Non-final analysis.

Final output requires Tusk review.

If cloud review is unavailable, mark:

```text
DRAFT ONLY — CLOUD/TUSK REVIEW PENDING
```

### Red

Fallback blocked unless Chris explicitly approves exact fallback scope.

If required model is unavailable:

```text
PAUSED — REQUIRED MODEL UNAVAILABLE
```

Then create or update a Limit Recovery Report.

## Fallback Status Labels

Use these labels:

```text
NO FALLBACK USED
FALLBACK APPROVED
FALLBACK USED — REVIEW REQUIRED
FALLBACK NOT APPROVED — INVALID
FALLBACK BLOCKED — HUMAN APPROVAL REQUIRED
PAUSED — FALLBACK NOT APPROVED
```

## Fallback Report Template

```text
FALLBACK REPORT
Work Card ID:
Task Title:
Risk Level:
Required Model:
Required Provider:
Backup Model:
Actual Model Used:
Actual Provider:
Fallback Allowed:
Fallback Used:
Fallback Reason:
Fallback Trigger:
Verification Source:
Tusk QC Required:
Chris Approval Required:
Status:
```

## Local Night-Shift Mode

Local night-shift mode is safe background work assigned to local models when cloud models are limited or should be preserved.

Primary models:

- `gemma4`
- `qwen3.5:9b`

## Allowed Local Night-Shift Tasks

Allowed:

- Clean notes.
- Organize task lists.
- Draft work cards.
- Summarize non-sensitive logs.
- Prepare dependency maps.
- Prepare question lists for Chris.
- Prepare question lists for later cloud review.
- Create local-only outlines.
- Categorize non-sensitive information.
- Identify missing information.
- Draft morning reports.
- Draft conflict reports without changing systems.

## Forbidden Local Night-Shift Tasks

Forbidden:

- Financial decisions.
- Investment recommendations as final advice.
- Debt strategy changes.
- Account actions.
- File deletion.
- Sending emails/messages.
- Publishing content.
- Production deployment.
- Security decisions.
- Paid API/tool actions.
- Cron modifications.
- Skill modifications.
- Automation changes.
- Config changes.
- Secret/API key/token/environment changes.
- Anything requiring Red-risk approval.

## Night-Shift Work Output Format

```text
LOCAL NIGHT-SHIFT REPORT
Date/Time:
Local Model Used:
Task Type:
Work Cards Prepared:
Notes Organized:
Questions For Chris:
Questions For Cloud Review:
Risks Found:
Protected Systems Mentioned:
Actions Not Taken:
Recommended Next Action:
```

## Trust Level for Local Night-Shift Work

Default trust level:

```text
Draft Only
```

Can become trusted if:

- Task is Green.
- No protected system is affected.
- Output is clerical/organizational.
- Belion or Tusk reviews it as needed.

## Fallback Decision Tree

```text
1. Required model unavailable?
   - No -> continue with required model.
   - Yes -> continue.

2. Is fallback allowed in work card?
   - No -> pause and report.
   - Yes -> continue.

3. What is risk level?
   - Green -> use approved local fallback if safe.
   - Yellow -> draft/prep only; Tusk review required.
   - Red -> pause unless Chris approved exact fallback.

4. Record actual model/provider.
5. Record fallback reason.
6. Produce Fallback Report.
7. Send to Tusk if Yellow/Red or important.
```

## Examples

### Green fallback example

```text
Task: Clean notes
Required Model: gemma4
Backup Model: qwen3.5:9b
Fallback Allowed: Yes
Fallback Used: Yes
Fallback Reason: gemma4 unavailable
Status: FALLBACK APPROVED
QC: Optional
```

### Yellow fallback example

```text
Task: Draft Sensei cron diagnosis summary from logs
Required Model: qwen3.5:9b
Backup Model: Gemini Free Key #1
Fallback Allowed: Yes for review
Fallback Used: No
Status: Draft from local model must go to Tusk before trusted
QC: Required
```

### Red fallback blocked example

```text
Task: Modify Hermes model config
Required Model: GPT Codex
Backup Model: None
Fallback Allowed: No
Fallback Used: No
Status: PAUSED — REQUIRED MODEL UNAVAILABLE
QC: Required
Chris Approval: Required before any alternative
```

## Belion Acceptance Rule

Belion may accept fallback output only if:

- Fallback was allowed.
- Risk level permits fallback.
- Actual model is recorded.
- Verification source is recorded.
- Tusk review is completed when required.

Belion must reject fallback output if:

- Fallback was not allowed.
- Model used was weaker than permitted.
- Red task was downgraded without Chris approval.
- Protected systems were affected outside scope.
