# Agent Army v2.0 — Work Card, Model Routing, and QC Rules

**Created:** 2026-06-17  
**Owner:** Belion  
**Operations Commander:** Iron  
**Quality Commander:** Tusk

## Work Card Requirement

Every serious task must become a work card before execution.

No serious task should be executed from vague instructions.

## Work Card Template

```text
WORK CARD ID:
Title:
Original Request:
Goal:
Division:
Assigned Agent:
Priority:
Risk Level:
Required Model:
Backup Model:
Actual Model Used:
Model Provider:
Routing Reason:
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed:
Step-by-Step Plan:
Expected Output:
Dependencies:
Approval Needed:
Scheduled Time:
Status:
QC Required:
Final Reviewer:
Protected Systems Affected:
Rollback Needed:
```

## Priority Levels

- **P0:** Emergency / critical
- **P1:** Important
- **P2:** Normal
- **P3:** Low priority
- **P4:** Background / night-shift task

## Risk Levels

- **Green:** Safe, low-risk, reversible, local model acceptable.
- **Yellow:** Needs review; may involve planning, coding drafts, workflow design, or medium-risk decisions.
- **Red:** Requires explicit Chris/Topher approval before action.

## Red-Risk Tasks

Red-risk tasks include:

- Financial decisions
- Investment decisions
- Debt strategy changes
- Account actions
- File deletion
- Sending emails or messages
- Publishing content
- Production code deployment
- Security changes
- Paid API/tool actions
- Cron job changes
- Working skill changes
- Automation changes
- Secret, token, API key, or environment changes

## Model Routing Table

| Model | Use For | Do Not Use For |
|---|---|---|
| `gemma4` | text cleaning, note organization, simple outlines, non-critical summaries, Green tasks | final decisions, finance recommendations, complex coding, security, Red tasks |
| `qwen3.5:9b` | work cards, routing drafts, technical summaries, first-pass coding drafts, automation planning | final production approval, security-sensitive work, financial decisions, Red tasks alone |
| Gemini Free Key #1 | cloud drafting, planning, research, review of local model output, Yellow review when Codex not needed | repeated retry loops, Red final decisions alone |
| Gemini Free Key #2 | backup review, overflow, second opinion, non-critical cloud work | same as Key #1 |
| GPT Codex | complex coding, codebase editing, architecture, code review, engineering-heavy work, final technical review | casual chat, simple formatting, low-risk routine planning |
| OpenRouter | fallback when Codex/Gemini limited and task justifies fallback | first choice unless explicitly configured |

## Required Model Enforcement

Every serious work card must specify:

```text
Required Model:
Backup Model:
Actual Model Used:
Model Provider:
Routing Reason:
Fallback Used:
Fallback Reason:
Model Verification Status:
```

Rules:

1. Assigned agent must use the Required Model.
2. Agent may not silently switch models.
3. If Required Model is unavailable, pause unless fallback is approved.
4. Red-risk tasks must never be downgraded to weaker local models.
5. Yellow tasks may use local models for prep, but final review must use approved reviewer model.
6. Green tasks may use local models if the work card allows it.
7. If the actual model does not match required or approved backup, mark `INVALID — WRONG MODEL USED`.
8. If model identity cannot be verified, mark `UNVERIFIED MODEL — REVIEW REQUIRED`.

## Model Verification Report

```text
MODEL VERIFICATION REPORT
Required Model:
Actual Model Used:
Provider:
Fallback Used:
Fallback Reason:
Verification Source:
Status: VERIFIED / FALLBACK APPROVED / UNVERIFIED / INVALID
```

## Cloud Limit Guardrails

Maximum retry attempts per provider/problem:

```text
2
```

After that:

1. Mark provider temporarily unavailable.
2. Stop retry loop.
3. Triage work cards:
   - Must use cloud now
   - Can use local model
   - Can wait
   - Should be paused
   - Requires human approval
4. Freeze risky tasks.
5. Create Limit Recovery Report.

## Limit Recovery Report Template

```text
LIMIT RECOVERY REPORT
Unavailable Models:
Available Models:
Paused Tasks:
Local Tasks Started:
Tasks Waiting for Cloud:
Risks:
Recommended Next Action:
Estimated Safe Local Work:
Tasks Requiring Chris/Topher Approval:
```

## Tusk QC Workflow

QC required for:

- Yellow tasks
- Red tasks
- Coding output
- Financial planning output
- Model fallback
- Agent-structure changes
- Cloud-limit downgrade
- Protected system impact
- Important output from weaker model

QC checklist:

```text
Was the task clear?
Was the correct agent assigned?
Was the correct model used?
Was fallback used?
Was fallback allowed?
Was the output complete?
Are there hallucination risks?
Are there contradictions?
Are protected systems affected?
Is human approval required?
Is rollback needed?
Should this output be trusted?
```

QC verdicts:

```text
PASS
PASS WITH WARNINGS
NEEDS REVISION
INVALID — WRONG MODEL USED
BLOCKED — HUMAN APPROVAL REQUIRED
UNSAFE — DO NOT EXECUTE
```

## Execution Approval Standard

Bad approval:

```text
Do it.
```

Good approval:

```text
I approve Work Card WC-0042 to create new files only. Do not edit existing files.
```

## Day 1 Work Card Completed

```text
WORK CARD ID: WC-AA-v2-DAY1
Title: Agent Army v2.0 Safety Snapshot and Documentation
Original Request: Approve and execute Agent Army v2.0 proposal.
Goal: Create non-destructive documentation and inventory only.
Division: Belion Command / Iron Operations / Tusk QC
Assigned Agent: Belion
Priority: P1
Risk Level: Yellow
Required Model: Current active Hermes session model
Backup Model: None required for documentation-only implementation
Actual Model Used: Current active Hermes session model
Model Provider: Current active Hermes provider
Routing Reason: User directly addressed Belion in active session
Fallback Used: No
Fallback Reason: N/A
Model Verification Status: UNVERIFIED MODEL — REVIEW REQUIRED
Input Needed: None
Step-by-Step Plan: inventory -> documentation -> memory -> report
Expected Output: Agent Army v2.0 docs and protected inventory
Dependencies: Existing Hermes profile/cron/skill inventory
Approval Needed: Received from Chris
Scheduled Time: Immediate
Status: Completed documentation phase
QC Required: Yes
Final Reviewer: Tusk/Chris
Protected Systems Affected: None modified; inventory only
Rollback Needed: Delete newly created docs if rejected
```
