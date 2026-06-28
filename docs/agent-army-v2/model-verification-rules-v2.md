# Agent Army v2.0 — Model Verification Rules v2

**Created:** 2026-06-17  
**Owner:** Tusk — Quality & Verification Commander  
**Commander:** Belion  
**Operations:** Iron  
**Mode:** Documentation-only Day 3 artifact

## Purpose

Model verification ensures that a task was handled by the correct model or an approved fallback.

Agent Army v2.0 must not rely only on an agent saying, “I used the right model.” Whenever possible, model identity must be checked from configuration, router logs, provider metadata, execution logs, or local model logs.

## Required Model Verification Fields

Every serious work card must include:

```text
Required Model:
Backup Model:
Actual Model Used:
Model Provider:
Routing Reason:
Fallback Allowed:
Fallback Used:
Fallback Reason:
Model Verification Status:
Verification Source:
```

## Verification Statuses

### VERIFIED

Use when actual model is confirmed from a trustworthy source and matches the Required Model.

### FALLBACK APPROVED

Use when fallback model was used, fallback was allowed by the work card, and risk level permits fallback.

### UNVERIFIED MODEL — REVIEW REQUIRED

Use when model identity cannot be confirmed from logs/config/provider metadata.

The output may be useful as a draft but should not be trusted for important decisions until reviewed.

### INVALID — WRONG MODEL USED

Use when actual model does not match the Required Model or approved Backup Model.

Belion must not accept final results with this status.

### BLOCKED — REQUIRED MODEL UNAVAILABLE

Use when required model is unavailable and no approved fallback exists.

The task must pause and create a Limit Recovery Report if needed.

## Preferred Verification Sources

Ranked from strongest to weakest:

1. Provider response metadata.
2. Router/API logs.
3. Hermes execution logs.
4. Local model server logs.
5. Hermes config snapshot plus command invocation.
6. Auth/provider status output.
7. Agent self-report only.

Agent self-report alone is not enough for Yellow or Red tasks.

## Verification Source Examples

### OpenAI Codex / GPT Codex

Acceptable evidence may include:

- `hermes auth list` showing openai-codex credential available.
- Provider metadata in execution output.
- Session/model logs identifying `openai-codex` and model.
- Explicit command invocation with provider/model flags.

### Gemini

Acceptable evidence may include:

- Provider metadata from response.
- Gemini API logs/errors identifying model.
- Hermes logs showing Gemini provider/model.
- Credential pool label if available.

### OpenRouter

Acceptable evidence may include:

- OpenRouter response metadata.
- Hermes logs showing OpenRouter provider/model.
- Config plus execution output showing OpenRouter model.
- Provider error referencing exact model.

### Local Ollama Models

Acceptable evidence may include:

- Ollama logs.
- Explicit `ollama run` / local-helper invocation.
- local-helper output identifying model.
- Command output showing model name.

## Verification Rules by Risk Level

### Green Tasks

Model verification can be lightweight.

Allowed evidence:

- Work card required model.
- Command/config evidence if available.
- Agent self-report acceptable only for low-impact outputs.

If uncertain:

```text
UNVERIFIED MODEL — LOW RISK
```

### Yellow Tasks

Model verification required.

Acceptable evidence:

- Logs, config, provider metadata, or command invocation.

If unavailable:

```text
UNVERIFIED MODEL — REVIEW REQUIRED
```

Tusk must decide whether output is usable as a draft.

### Red Tasks

Strong model verification required.

If model identity cannot be verified:

```text
BLOCKED — MODEL VERIFICATION REQUIRED
```

Do not proceed.

## Fallback Verification

Fallback must record:

```text
Original Required Model:
Approved Backup Model:
Actual Fallback Model:
Fallback Trigger:
Risk Level:
Fallback Allowed By Work Card: Yes / No
Fallback Verified From:
Fallback Status:
```

Fallback status values:

- `FALLBACK APPROVED`
- `FALLBACK USED — REVIEW REQUIRED`
- `FALLBACK NOT APPROVED — INVALID`
- `FALLBACK BLOCKED — HUMAN APPROVAL REQUIRED`

## Wrong Model Rule

If the actual model used is not the Required Model and not an approved Backup Model, mark:

```text
INVALID — WRONG MODEL USED
```

Required response:

1. Stop trusting output as final.
2. Preserve output only as rough draft if safe.
3. Create Model Mismatch Report.
4. Decide whether to rerun with correct model or ask Chris.

## Model Mismatch Report

```text
MODEL MISMATCH REPORT
Work Card ID:
Required Model:
Approved Backup Model:
Actual Model Used:
Provider:
How Mismatch Was Detected:
Risk Level:
Output Trusted: Yes / No / Draft Only
Recommended Action:
Requires Chris Approval: Yes / No
```

## Model Verification Report Template

```text
MODEL VERIFICATION REPORT
Work Card ID:
Task Title:
Risk Level:
Required Model:
Backup Model:
Actual Model Used:
Provider:
Fallback Allowed:
Fallback Used:
Fallback Reason:
Verification Source:
Verification Evidence:
Status: VERIFIED / FALLBACK APPROVED / UNVERIFIED / INVALID / BLOCKED
Tusk QC Required: Yes / No
Tusk Verdict:
Final Trust Level: Trusted / Draft Only / Do Not Trust
```

## Cloud Limit Verification

If a model fails due to quota, rate, usage, or provider error, record:

```text
CLOUD LIMIT EVENT
Provider:
Model:
Error Type:
Error Message Summary:
Attempt Count:
Time Detected:
Work Card Affected:
Fallback Allowed:
Action Taken:
```

Maximum retry attempts:

```text
2
```

After 2 attempts:

- Stop retrying.
- Mark provider temporarily unavailable.
- Triage work cards.
- Use approved fallback only if allowed.
- Create Limit Recovery Report if needed.

## Verification Examples

### Example 1 — Verified Green Local Task

```text
MODEL VERIFICATION REPORT
Work Card ID: WC-OPS-20260617-001
Task Title: Clean Notes
Risk Level: Green
Required Model: gemma4
Backup Model: qwen3.5:9b
Actual Model Used: gemma4
Provider: Local Ollama
Fallback Allowed: Yes
Fallback Used: No
Fallback Reason: N/A
Verification Source: local-helper command output
Verification Evidence: output label showed gemma4
Status: VERIFIED
Tusk QC Required: No
Tusk Verdict: N/A
Final Trust Level: Trusted for Green task
```

### Example 2 — Yellow Task with Unverified Active Session Model

```text
MODEL VERIFICATION REPORT
Work Card ID: WC-AA-v2-DAY3
Task Title: Create Day 3 Governance Docs
Risk Level: Yellow
Required Model: Current active Hermes session model
Backup Model: None
Actual Model Used: Current active Hermes session model
Provider: Current active Hermes provider
Fallback Allowed: No
Fallback Used: No
Fallback Reason: N/A
Verification Source: Active session context only
Verification Evidence: No provider metadata captured in final report
Status: UNVERIFIED MODEL — REVIEW REQUIRED
Tusk QC Required: Yes
Tusk Verdict: PASS WITH WARNINGS if output is docs-only and no protected systems changed
Final Trust Level: Trusted as documentation after human review
```

### Example 3 — Wrong Model Used

```text
MODEL VERIFICATION REPORT
Work Card ID: WC-ENG-20260617-010
Task Title: Implement Production Auth Patch
Risk Level: Red
Required Model: GPT Codex
Backup Model: None
Actual Model Used: qwen3.5:9b
Provider: Local Ollama
Fallback Allowed: No
Fallback Used: Yes
Fallback Reason: Codex unavailable
Verification Source: local-helper logs
Verification Evidence: qwen3.5:9b invocation recorded
Status: INVALID — WRONG MODEL USED
Tusk QC Required: Yes
Tusk Verdict: UNSAFE — DO NOT EXECUTE
Final Trust Level: Do Not Trust
```

## Tusk Verification Checklist

For every Yellow or Red task, Tusk checks:

```text
Is there a work card?
Is Required Model listed?
Is Backup Model listed?
Was fallback allowed?
Was fallback used?
Is actual model recorded?
Is provider recorded?
Is verification source credible?
Does actual model match required or approved backup?
Does risk level permit the model used?
Does output need rerun with stronger model?
Should output be trusted, draft-only, or rejected?
```

## Tusk Verdicts for Model Verification

```text
MODEL VERIFIED — PASS
MODEL VERIFIED — PASS WITH WARNINGS
FALLBACK APPROVED — PASS WITH WARNINGS
UNVERIFIED MODEL — REVIEW REQUIRED
INVALID — WRONG MODEL USED
BLOCKED — REQUIRED MODEL UNAVAILABLE
UNSAFE — DO NOT EXECUTE
```

## Belion Acceptance Rule

Belion may accept final output only if model status is one of:

- `VERIFIED`
- `FALLBACK APPROVED`
- `UNVERIFIED MODEL — REVIEW REQUIRED` with Tusk `PASS WITH WARNINGS` and low enough task risk

Belion must reject final output if status is:

- `INVALID — WRONG MODEL USED`
- `BLOCKED — REQUIRED MODEL UNAVAILABLE`
- `UNSAFE — DO NOT EXECUTE`

## Human Approval Rule

Chris must approve before continuing if:

- Red task model verification fails.
- Required Model is unavailable and no backup is approved.
- Proposed fallback is weaker than required for risk level.
- Model routing change requires config edits.
- Any fix requires changing secrets, API keys, tokens, environment variables, cron jobs, skills, or automations.
