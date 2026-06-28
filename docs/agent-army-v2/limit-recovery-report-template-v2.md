# Agent Army v2.0 — Limit Recovery Report Template v2

**Created:** 2026-06-17  
**Owner:** Iron — Operations Commander  
**Commander:** Belion  
**QC:** Tusk  
**Mode:** Documentation-only Day 5 artifact

## Purpose

A Limit Recovery Report is created when GPT Codex, Gemini, OpenRouter, or another cloud provider becomes rate-limited, quota-limited, unavailable, or unsafe to continue using.

The report prevents repeated retries and gives Chris a clear recovery picture.

## When to Create This Report

Create this report when:

- A provider hits rate limit.
- A provider hits quota/usage limit.
- Credits/billing block execution.
- Provider returns repeated errors.
- Required model is unavailable.
- Required model identity cannot be verified for important work.
- Fallback is blocked.
- Multiple work cards are waiting on unavailable cloud resources.

## Limit Recovery Report Template

```text
LIMIT RECOVERY REPORT

Report ID:
Created At:
Created By:
Reviewed By:

1. Event Summary
Unavailable Models:
Unavailable Providers:
Failure Type:
Failure Evidence:
Retry Attempts Used:
Cooldown Known: Yes / No
Cooldown Until:

2. Work Cards Affected
Affected Work Cards:
Priority of Each:
Risk Level of Each:
Required Model for Each:
Fallback Allowed for Each:
Current Status of Each:

3. Available Models
Available Local Models:
Available Cloud Models:
Available Backup Providers:
Provider Health Notes:

4. Triage Results
Must Use Cloud Now:
Can Use Local Model:
Can Wait:
Should Be Paused:
Requires Chris Approval:

5. Actions Taken
Retries Stopped: Yes / No
Provider Marked Temporarily Unavailable: Yes / No
Local Tasks Started:
Tasks Paused:
Tasks Reassigned:
Tasks Escalated:

6. Risks
Risk of Continuing:
Risk of Downgrading:
Risk of Waiting:
Protected Systems Involved:
Financial/Security/Deployment Risk:

7. Local Night-Shift Plan
Safe Local Work Available:
Assigned Local Model:
Expected Output:
Not Allowed Locally:

8. Required Approvals
Chris Approval Needed:
Specific Approval Needed:
Red Tasks Blocked:
Config/API/Secret Changes Requested: Yes / No

9. Recommended Next Action
Recommended Path:
Reason:
Estimated Safe Local Work:
Estimated Cloud-Required Work:
When To Retry:

10. QC
Tusk QC Required: Yes / No
Tusk Verdict:
Trust Level:
```

## Short Telegram-Friendly Version

```text
LIMIT RECOVERY REPORT
Unavailable: [models/providers]
Reason: [rate/quota/provider/auth/etc.]
Retries used: [0/1/2]
Paused tasks: [list]
Safe local tasks: [list]
Tasks needing cloud: [list]
Tasks needing Chris approval: [list]
Recommended next action: [action]
```

## Example Report — GPT Codex Limited

```text
LIMIT RECOVERY REPORT

Report ID: LRR-20260617-001
Created At: 2026-06-17 12:00
Created By: Belion / Iron
Reviewed By: Tusk

1. Event Summary
Unavailable Models: GPT Codex
Unavailable Providers: openai-codex
Failure Type: usage_limit_reached / 429
Failure Evidence: auth/provider status reported usage limit
Retry Attempts Used: 2
Cooldown Known: Yes
Cooldown Until: Provider-reported reset time

2. Work Cards Affected
Affected Work Cards: WC-ENG-20260617-002
Priority of Each: P1
Risk Level of Each: Yellow
Required Model for Each: GPT Codex
Fallback Allowed for Each: No
Current Status of Each: Paused

3. Available Models
Available Local Models: gemma4, qwen3.5:9b
Available Cloud Models: Gemini Key #1, Gemini Key #2, OpenRouter if justified
Available Backup Providers: Gemini/OpenRouter depending task risk
Provider Health Notes: OpenAI Codex limited

4. Triage Results
Must Use Cloud Now: None
Can Use Local Model: Draft work cards, summarize notes
Can Wait: Engineering implementation
Should Be Paused: Code changes requiring Codex
Requires Chris Approval: Any fallback to OpenRouter or Gemini for implementation

5. Actions Taken
Retries Stopped: Yes
Provider Marked Temporarily Unavailable: Yes
Local Tasks Started: Work-card prep only
Tasks Paused: Engineering implementation
Tasks Reassigned: None
Tasks Escalated: None

6. Risks
Risk of Continuing: Wasting quota and using wrong model
Risk of Downgrading: Lower code quality / unsafe technical decision
Risk of Waiting: Delay only
Protected Systems Involved: None yet
Financial/Security/Deployment Risk: None if paused

7. Local Night-Shift Plan
Safe Local Work Available: Draft plan, identify missing inputs, prepare tests list
Assigned Local Model: qwen3.5:9b
Expected Output: Draft-only prep packet
Not Allowed Locally: Final implementation or production approval

8. Required Approvals
Chris Approval Needed: Yes, only if fallback implementation is desired
Specific Approval Needed: Approve model fallback and scope
Red Tasks Blocked: None
Config/API/Secret Changes Requested: No

9. Recommended Next Action
Recommended Path: Wait for Codex reset; use local models only for prep
Reason: Correct model required for implementation
Estimated Safe Local Work: Work-card prep, test plan, file inventory
Estimated Cloud-Required Work: Code implementation and final review
When To Retry: After cooldown

10. QC
Tusk QC Required: Yes
Tusk Verdict: PASS WITH WARNINGS
Trust Level: Draft-only prep allowed; implementation paused
```

## Example Report — All Cloud Limited

```text
LIMIT RECOVERY REPORT
Unavailable: GPT Codex, Gemini Key #1, Gemini Key #2, OpenRouter
Reason: quota/rate/provider failures
Retries used: 2 per provider where applicable
Paused tasks: Red and Yellow final-decision tasks
Safe local tasks: note cleanup, work-card drafting, non-critical summaries
Tasks needing cloud: coding final review, finance strategy review, security decisions
Tasks needing Chris approval: any fallback/config/API changes
Recommended next action: enter local night-shift mode and wait for cloud recovery
```

## Required Tusk Review

Tusk review is required if:

- Any Yellow task is downgraded.
- Any Red task is paused or fallback is requested.
- Any output is produced by a weaker model for important work.
- Any protected system is involved.
- Any model verification is uncertain.

## Belion Reporting Rule

When a Limit Recovery Report is created, Belion must tell Chris:

- What is unavailable.
- What is paused.
- What can continue locally.
- What requires approval.
- What the recommended next action is.

Belion must not hide cloud limits or silently continue with weaker models.
