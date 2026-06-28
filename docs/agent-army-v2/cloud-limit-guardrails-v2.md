# Agent Army v2.0 — Cloud-Limit Guardrails v2

**Created:** 2026-06-17  
**Owner:** Belion  
**Operations:** Iron  
**QC:** Tusk  
**Mode:** Documentation-only Day 5 artifact

## Purpose

Cloud-limit guardrails prevent the Agent Army from wasting GPT Codex, Gemini, or OpenRouter quota through repeated retries, unsafe fallback, or low-value cloud usage.

When cloud models are limited, the army should become calmer, not more chaotic.

## Core Rule

Do not panic. Do not retry endlessly. Do not downgrade risky work to weak models.

When a cloud model is limited:

```text
Detect -> Stop retry loop -> Triage work cards -> Downgrade only safe work -> Freeze risky work -> Report
```

## Cloud Models Covered

- GPT Codex
- Gemini Free Key #1
- Gemini Free Key #2
- OpenRouter
- Any future paid/cloud provider

## Limit Types

A cloud-limit event includes:

- Rate limit
- Quota limit
- Usage limit
- Provider outage
- Authentication/credential failure
- Context-length failure
- Billing/credit failure
- Timeout or repeated provider error
- Backend unavailable

## Immediate Detection Record

When a cloud issue occurs, record:

```text
CLOUD LIMIT EVENT
Date/Time:
Provider:
Model:
Error Type:
Error Message Summary:
Attempt Count:
Work Card Affected:
Risk Level:
Fallback Allowed:
Action Taken:
```

## Retry Rule

Maximum retry attempts for the same provider/model/task issue:

```text
2
```

After 2 failed attempts:

- Stop retrying.
- Mark the provider/model temporarily unavailable.
- Do not loop.
- Do not switch models silently.
- Create or update a Limit Recovery Report.

## Triage Flow

When limits are detected, Iron triages active and waiting work cards into:

```text
1. Must use cloud now
2. Can use local model
3. Can wait
4. Should be paused
5. Requires Chris approval
```

Belion makes the final routing decision.

Tusk reviews Yellow/Red downgrades and any fallback.

## Cloud Limit Triage Matrix

| Task Category | Cloud Limited Action | Local Allowed? | QC Required? |
|---|---|---|---|
| Simple text cleanup | Move to local | Yes | No |
| Note organization | Move to local | Yes | No |
| Work-card drafting | Move to local | Yes | Tusk if Yellow/Red |
| Daily low-risk report draft | Move to local | Yes | Optional |
| Engineering implementation | Pause unless approved fallback | Draft only | Yes |
| Code review | Pause or use approved cloud backup | No final local-only | Yes |
| Architecture decision | Pause or use approved cloud backup | Draft only | Yes |
| Financial planning draft | Pause or Gemini backup if available | Local organization only | Yes |
| Financial action | Freeze | No | Chris required |
| Security decision | Freeze or approved cloud only | No final local-only | Yes |
| Cron modification | Freeze | No | Chris required |
| Skill modification | Freeze | No | Chris required |
| Config/secret/API key work | Freeze | No | Chris required |
| Deployment/publishing | Freeze | No | Chris required |

## Safe Downgrade Rules

### Green Tasks

Can be downgraded to local models if:

- No protected systems are modified.
- No messages are sent.
- No money/accounts are affected.
- No files are deleted.
- No public output is published.

### Yellow Tasks

May use local models for:

- Drafting.
- Summaries.
- Log organization.
- Work-card preparation.
- Question preparation.

Must not use local-only final judgment for important decisions.

Tusk review required.

### Red Tasks

Must freeze unless Chris explicitly approves the exact fallback and scope.

Red tasks cannot be completed by a weaker local model alone.

## Freeze List

Automatically freeze when cloud is limited:

- Financial decisions.
- Investment decisions.
- Debt strategy changes.
- Account actions.
- File deletion.
- Sending emails or messages.
- Publishing content.
- Production deployment.
- Security changes.
- Paid API/tool actions.
- Cron job modifications.
- Skill modifications.
- Automation changes.
- Config changes.
- Secret/API key/token/environment changes.

## Local Night-Shift Mode

When cloud is limited, assign safe local work only:

- Organize notes.
- Clean task lists.
- Draft work cards.
- Summarize non-sensitive logs.
- Prepare questions for Chris.
- Prepare questions for cloud review later.
- Identify missing information.
- Create morning reports.
- Create dependency maps.
- Create conflict report drafts.

Local night-shift must not:

- Modify protected systems.
- Make final decisions.
- Send/publish/deploy.
- Touch secrets.
- Perform account actions.
- Execute financial actions.

## Provider Cooldown Rule

When a provider hits quota/rate/usage limit:

- Mark provider temporarily unavailable.
- Avoid retrying until cooldown expires or user approves retry.
- Continue safe local work where possible.
- Report paused tasks.

If cooldown time is known, record it.

If cooldown time is unknown, mark:

```text
Cooldown: Unknown — manual check required
```

## Cloud Budget Priority

Cloud usage priority order:

1. P0 emergencies.
2. Red tasks already approved by Chris.
3. GPT Codex engineering implementation/review.
4. Tusk review of important outputs.
5. Gemini research/planning review.
6. Routine reports.
7. Brainstorming.
8. Formatting and note cleanup — should be local.

## Cloud-Limit Report Routing

Cloud-limit reports go to:

```text
Belion -> Iron triage -> Tusk review if Yellow/Red -> Chris if approval needed
```

## Required Output When Limits Hit

Belion should report:

```text
Cloud limit detected.
Provider/model affected:
Retry attempts used:
Tasks paused:
Tasks moved to local:
Tasks requiring Chris approval:
Recommended next action:
```

## Day 5 Work Card

```text
WORK CARD ID: WC-AA-v2-DAY5
Title: Finalize Cloud-Limit Guardrails and Fallback Rules
Original Request: Proceed with Day 5 documentation-only cloud-limit rules.
Goal: Create documentation for cloud-limit handling, fallback, local night-shift, and Limit Recovery Reports.
Division: Command / Operations / QC
Assigned Agent: Belion
Supporting Agents: Iron, Tusk
Priority: P1
Risk Level: Yellow
Required Model: Current active Hermes session model
Backup Model: None
Actual Model Used: Current active Hermes session model
Model Provider: Current active Hermes provider
Routing Reason: Chris approved Day 5 documentation scope
Fallback Allowed: No
Fallback Used: No
Fallback Reason: N/A
Model Verification Status: UNVERIFIED MODEL — REVIEW REQUIRED
Input Needed: Day 3/4 model routing and QC docs
Step-by-Step Plan: review docs -> write guardrails -> write fallback/night-shift rules -> write recovery template -> verify -> report
Expected Output: Day 5 documentation files only
Dependencies: Day 3/4 docs
Approval Needed: Received from Chris via Day 5 approval prompt
Approval Text: Documentation files only; do not modify cron jobs, skills, configs, secrets, wrappers, or disable anything
Scheduled Time: Immediate
Status: Completed documentation phase
QC Required: Yes
Final Reviewer: Tusk/Chris
Protected Systems Affected: None modified; documentation only
Rollback Needed: Yes
Rollback Plan: Delete Day 5 documentation files if rejected
Completion Evidence: Created docs under `docs/agent-army-v2/`
Final Status: Completed
```
