# Agent Army v2.0 — Work Card Template v2

**Created:** 2026-06-17  
**Owner:** Iron — Operations Commander  
**Commander:** Belion  
**Reviewer:** Tusk  
**Mode:** Documentation-only Day 3 artifact

## Purpose

Every serious task must become a work card before execution. A work card converts vague intent into an accountable, routed, risk-classified task.

This prevents:

- Vague execution.
- Wrong-agent routing.
- Wrong-model usage.
- Silent fallback.
- Protected-system damage.
- Missing approval.
- Unverified outputs.

## When a Work Card Is Required

A work card is required for:

- Multi-step tasks.
- Engineering work.
- Financial planning or analysis.
- Tool/automation changes.
- Cron job work.
- Skill work.
- Config/model routing work.
- Any Yellow or Red task.
- Any task involving protected systems.
- Any task that may send, publish, delete, deploy, spend, install, or modify.

A work card is optional for:

- Simple chat.
- Quick definitions.
- Low-risk explanations.
- One-off Green tasks with no file/system/account impact.

## Work Card ID Format

```text
WC-[DIVISION]-[YYYYMMDD]-[###]
```

Examples:

```text
WC-OPS-20260617-001
WC-ENG-20260617-002
WC-FIN-20260617-003
WC-TOOL-20260617-004
WC-LEARN-20260617-005
WC-QC-20260617-006
```

Division codes:

- `CMD` — Belion command
- `OPS` — Iron operations
- `QC` — Tusk quality control
- `TOOL` — Kaisel tool division
- `ENG` — Igris engineering division
- `FIN` — GREED financial division
- `LEARN` — Beru learning division

## Required Work Card Template

```text
WORK CARD ID:
Title:
Original Request:
Goal:
Division:
Assigned Agent:
Supporting Agents:
Priority:
Risk Level:
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
Input Needed:
Step-by-Step Plan:
Expected Output:
Dependencies:
Approval Needed:
Approval Text:
Scheduled Time:
Status:
QC Required:
Final Reviewer:
Protected Systems Affected:
Rollback Needed:
Rollback Plan:
Completion Evidence:
Final Status:
```

## Field Definitions

### WORK CARD ID

Unique ID for tracking and reporting.

### Title

Short, specific task name.

Bad:

```text
Fix stuff
```

Good:

```text
Diagnose Sensei Daily Tutor Cron Failure — Read Only
```

### Original Request

Exact user request or summarized instruction.

### Goal

Concrete outcome.

### Division

One of:

- Command
- Operations
- Quality Control
- Tool
- Engineering
- Financial
- Learning

### Assigned Agent

Primary owner.

### Supporting Agents

Optional secondary agents.

### Priority

Use standard priority levels:

- `P0` — Emergency / critical
- `P1` — Important
- `P2` — Normal
- `P3` — Low priority
- `P4` — Background / night-shift

### Risk Level

Use:

- `Green`
- `Yellow`
- `Red`

### Required Model

The model that should handle the task.

Examples:

- `gemma4`
- `qwen3.5:9b`
- `Gemini Free Key #1`
- `Gemini Free Key #2`
- `GPT Codex`
- `OpenRouter: [specific model]`

### Backup Model

Only include a backup if fallback is allowed.

If no fallback is allowed:

```text
Backup Model: None — pause if unavailable
```

### Actual Model Used

Must be recorded after execution.

### Model Provider

Provider or runtime source:

- Local Ollama
- Gemini
- OpenAI Codex
- OpenRouter
- Unknown

### Routing Reason

Why this agent/model was chosen.

### Fallback Allowed

```text
Yes / No / Only for draft / Only with Chris approval
```

### Fallback Used

```text
Yes / No
```

### Fallback Reason

Required if fallback used.

### Model Verification Status

Use:

- `VERIFIED`
- `FALLBACK APPROVED`
- `UNVERIFIED MODEL — REVIEW REQUIRED`
- `INVALID — WRONG MODEL USED`

### Verification Source

Evidence used to confirm actual model/provider or fallback status. Prefer provider metadata, router/API logs, Hermes logs, local model logs, auth/provider status, or explicit command invocation. Agent self-report alone is not enough for Yellow or Red tasks.

### Input Needed

Missing info, files, URLs, account access, assets, or approval.

### Step-by-Step Plan

Numbered plan. Each step should be small and testable.

### Expected Output

Define exactly what final output should look like.

### Dependencies

Other tasks, files, credentials, user answers, or external services.

### Approval Needed

```text
Yes / No
```

### Approval Text

Exact Chris approval if required.

### Scheduled Time

Now, specific time, or background/night-shift.

### Status

Use:

- `Draft`
- `Approved`
- `In Progress`
- `Blocked`
- `Paused`
- `Completed`
- `Rejected`
- `Cancelled`

### QC Required

```text
Yes / No
```

### Final Reviewer

Usually Tusk for Yellow/Red.

### Protected Systems Affected

List any protected systems. If none:

```text
None
```

### Rollback Needed

```text
Yes / No
```

### Rollback Plan

Required for file/config/system changes.

### Completion Evidence

Examples:

- Created file paths.
- Test output.
- Log excerpts.
- Screenshot path.
- Verification report.
- Read-only inventory result.

### Final Status

Final operational outcome.

## Priority Rules

### P0 — Emergency / Critical

Examples:

- Broken gateway.
- Security exposure.
- Data-loss risk.
- Critical financial/account risk.

Requires immediate Belion routing and Tusk review.

### P1 — Important

Examples:

- Agent Army governance.
- Major project work.
- Cron repair.
- Model routing audit.

### P2 — Normal

Examples:

- Feature planning.
- Routine project work.
- Non-urgent docs.

### P3 — Low Priority

Examples:

- Minor cleanup.
- Nice-to-have improvements.

### P4 — Background / Night-Shift

Examples:

- Note cleanup.
- Log summaries.
- Drafting questions.
- Organizing task lists.

## Risk Rules

### Green

Safe, reversible, no protected systems, no accounts, no money, no public output.

Can usually use local models.

### Yellow

Requires review. May involve:

- Planning important work.
- Coding drafts.
- Workflow design.
- Cron diagnosis.
- Skill diagnosis.
- Protected-system documentation.
- Financial planning drafts.

Requires Tusk review.

### Red

Requires explicit Chris approval before action.

Includes:

- Financial decisions.
- Investment decisions.
- Debt strategy changes.
- Account actions.
- File deletion.
- Sending emails/messages.
- Publishing content.
- Production deployment.
- Security changes.
- Paid API/tool actions.
- Cron job modification.
- Skill modification.
- Automation changes.
- Secrets/API keys/tokens/env changes.

## Minimal Work Card Example — Green

```text
WORK CARD ID: WC-OPS-20260617-001
Title: Clean Meeting Notes Into Bullet List
Original Request: Clean these notes.
Goal: Reformat raw notes into concise bullets.
Division: Operations
Assigned Agent: Iron
Supporting Agents: None
Priority: P3
Risk Level: Green
Required Model: gemma4
Backup Model: qwen3.5:9b
Actual Model Used:
Model Provider:
Routing Reason: Simple text organization
Fallback Allowed: Yes
Fallback Used:
Fallback Reason:
Model Verification Status:
Verification Source:
Input Needed: Raw notes
Step-by-Step Plan: 1. Remove duplicates. 2. Group bullets. 3. Extract action items.
Expected Output: Clean bullet list and action list
Dependencies: None
Approval Needed: No
Approval Text: N/A
Scheduled Time: Now
Status: Draft
QC Required: No
Final Reviewer: None
Protected Systems Affected: None
Rollback Needed: No
Rollback Plan: N/A
Completion Evidence:
Final Status:
```

## Minimal Work Card Example — Yellow

```text
WORK CARD ID: WC-ENG-20260617-002
Title: Diagnose Sensei Cron Failure — Read Only
Original Request: Check why Sensei daily lesson cron fails.
Goal: Identify failure cause without modifying cron, skills, configs, or secrets.
Division: Learning / Tool / Operations
Assigned Agent: Belion
Supporting Agents: Beru, Kaisel, Tusk
Priority: P1
Risk Level: Yellow
Required Model: qwen3.5:9b for log summarization; Gemini Free Key #1 for review if needed
Backup Model: Gemini Free Key #2
Actual Model Used:
Model Provider:
Routing Reason: Protected cron diagnosis requires careful review
Fallback Allowed: Only for review, not for changes
Fallback Used:
Fallback Reason:
Model Verification Status:
Verification Source:
Input Needed: Cron output/logs
Step-by-Step Plan: 1. Read cron status. 2. Read latest output. 3. Read logs. 4. Summarize likely cause. 5. Do not patch.
Expected Output: Diagnostic report and recommended repair work card
Dependencies: Cron logs available
Approval Needed: Yes
Approval Text: Chris approved read-only diagnosis only
Scheduled Time: When approved
Status: Draft
QC Required: Yes
Final Reviewer: Tusk
Protected Systems Affected: Sensei cron, Sensei skills
Rollback Needed: No for read-only
Rollback Plan: N/A
Completion Evidence:
Final Status:
```

## Minimal Work Card Example — Red

```text
WORK CARD ID: WC-CONFIG-20260617-003
Title: Change Default Model Routing
Original Request: Switch default model routing.
Goal: Modify Hermes model routing configuration.
Division: Tool / Command
Assigned Agent: Kaisel
Supporting Agents: Tusk, Belion
Priority: P1
Risk Level: Red
Required Model: GPT Codex for implementation plan; Tusk review required
Backup Model: None — pause if unavailable
Actual Model Used:
Model Provider:
Routing Reason: Config changes affect active system behavior
Fallback Allowed: No
Fallback Used: No
Fallback Reason: N/A
Model Verification Status:
Verification Source:
Input Needed: Exact target config from Chris
Step-by-Step Plan: 1. Snapshot current config. 2. Prepare patch. 3. Request approval. 4. Apply only approved change. 5. Verify.
Expected Output: Updated config and verification report
Dependencies: Chris approval
Approval Needed: Yes
Approval Text: Must specify exact config keys allowed
Scheduled Time: Not scheduled
Status: Draft
QC Required: Yes
Final Reviewer: Tusk and Chris
Protected Systems Affected: Hermes config, model routing
Rollback Needed: Yes
Rollback Plan: Restore config snapshot
Completion Evidence:
Final Status:
```

## Day 3 Work Card

```text
WORK CARD ID: WC-AA-v2-DAY3
Title: Finalize Work Card, Model Routing, and Model Verification Rules
Original Request: Proceed with Agent Army v2.0 Day 3 with documentation-only constraints.
Goal: Create finalized documentation for work cards, model routing, and model verification.
Division: Operations / Command / Quality Control
Assigned Agent: Belion
Supporting Agents: Iron, Tusk
Priority: P1
Risk Level: Yellow
Required Model: Current active Hermes session model
Backup Model: None
Actual Model Used: Current active Hermes session model
Model Provider: Current active Hermes provider
Routing Reason: User directly approved Day 3 documentation in current session
Fallback Allowed: No
Fallback Used: No
Fallback Reason: N/A
Model Verification Status: UNVERIFIED MODEL — REVIEW REQUIRED
Verification Source: Active session context only; provider metadata not captured
Input Needed: Day 2 docs
Step-by-Step Plan: review Day 2 docs -> create work-card doc -> create routing doc -> create verification doc -> verify files -> report
Expected Output: Day 3 documentation files only
Dependencies: Day 2 docs
Approval Needed: Received from Chris
Approval Text: User approved Day 3 allowed actions and restrictions
Scheduled Time: Immediate
Status: Completed documentation phase
QC Required: Yes
Final Reviewer: Tusk/Chris
Protected Systems Affected: None modified; documentation only
Rollback Needed: Yes
Rollback Plan: Delete Day 3 documentation files if rejected
Completion Evidence: Created docs under `docs/agent-army-v2/`
Final Status: Completed
```
