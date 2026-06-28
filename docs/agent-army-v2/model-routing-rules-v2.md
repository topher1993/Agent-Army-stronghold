# Agent Army v2.0 — Model Routing Rules v2

**Created:** 2026-06-17  
**Owner:** Belion  
**Operations:** Iron  
**QC:** Tusk  
**Mode:** Documentation-only Day 3 artifact

## Purpose

Model routing rules keep cloud usage controlled, protect GPT Codex for valuable work, and prevent weak models from handling risky tasks.

The routing system must optimize for:

1. Safety
2. Cost control
3. Reliability
4. Task difficulty
5. Correct model verification
6. Human approval for risky actions

## Available Model Resources

### Cloud Models

- GPT Codex
- Gemini Free Key #1
- Gemini Free Key #2
- OpenRouter fallback cloud provider

### Local Models

- gemma4
- qwen3.5:9b

## Routing Authority

Belion owns final routing authority.

Iron prepares work-card routing recommendations.

Tusk reviews routing for Yellow and Red tasks.

Kaisel may advise on tool/model provider configuration, but must not modify protected configs without approval.

## Default Routing Principles

1. Use the cheapest safe model.
2. Use local models for safe preparation.
3. Use cloud models for important judgment.
4. Protect GPT Codex for engineering implementation and final technical review.
5. Do not use OpenRouter first unless explicitly configured for the task.
6. Do not silently switch models.
7. Do not use local models alone for Red tasks.
8. If model identity cannot be verified, mark output unverified.

## Risk-to-Model Routing Matrix

| Risk | Preferred Models | Allowed Local Use | Final Review Requirement |
|---|---|---|---|
| Green | gemma4, qwen3.5:9b | Yes | Optional |
| Yellow | qwen3.5:9b draft, Gemini review, GPT Codex for technical | Draft/prep only if important | Tusk review required |
| Red | GPT Codex or approved cloud model depending on task | No final local-only output | Chris approval + Tusk review required |

## Task-to-Model Routing Matrix

| Task Type | Required Model | Backup Model | Notes |
|---|---|---|---|
| Simple text cleanup | gemma4 | qwen3.5:9b | Green only |
| Note organization | gemma4 | qwen3.5:9b | Good for night-shift work |
| Work-card drafting | qwen3.5:9b | gemma4 for simple cards | Tusk reviews Yellow/Red cards |
| Task routing | qwen3.5:9b | Gemini Key #1 | Belion final authority |
| Research summary | Gemini Key #1 | Gemini Key #2 or OpenRouter | Use local only for non-critical summaries |
| Brainstorming | Gemini Key #1 or qwen3.5:9b | Gemini Key #2 | Risk determines final review |
| Engineering planning | GPT Codex for complex; qwen3.5:9b for draft | Gemini Key #1 | Tusk/Igris review |
| Code implementation | GPT Codex | None unless Chris approves | Do not downgrade silently |
| Code review | GPT Codex | Gemini Key #1 for secondary review | Tusk required for important code |
| Architecture decisions | GPT Codex | Gemini Key #1 | Atlas/Igris involved |
| Security decisions | GPT Codex + Tusk/Sentinel | None without approval | Red or Yellow |
| Financial note cleanup | gemma4 | qwen3.5:9b | No advice |
| Budget categorization | gemma4 or qwen3.5:9b | Gemini Key #1 | Green if purely clerical |
| Debt strategy draft | Gemini Key #1 | Gemini Key #2 | Yellow; GREED/Ledger/Tusk review |
| Investment education | Gemini Key #1 | Gemini Key #2 | No execution advice |
| Financial decision | None without Chris | None | Red; human final authority |
| Cron diagnosis read-only | qwen3.5:9b | Gemini Key #1 | Yellow; no modifications |
| Cron modification | GPT Codex if technical | None without approval | Red protected-system change |
| Skill diagnosis read-only | qwen3.5:9b | Gemini Key #1 | Yellow |
| Skill modification | GPT Codex if technical | None without approval | Red protected-system change |
| Config/model routing audit | qwen3.5:9b draft + Gemini/GPT review | None for edits | Config changes are Red |
| Daily status report | gemma4 or qwen3.5:9b | Gemini Key #1 | Use local when possible |
| Night-shift background work | gemma4 | qwen3.5:9b | Green only |

## Local Model Rules

### gemma4

Use for:

- Cleaning text.
- Reformatting notes.
- Extracting bullet points.
- Sorting simple tasks.
- Creating simple outlines.
- Summarizing non-critical content.
- Preparing low-risk work cards.
- Organizing notes.
- Night-shift background work.
- Green-risk tasks.

Do not use for:

- Final decisions.
- Financial recommendations.
- Complex coding.
- Security decisions.
- Red-risk tasks.
- Any task that changes files, sends messages, spends money, or affects accounts.

### qwen3.5:9b

Use for:

- Default local assistant-manager work.
- Work-card creation.
- Task routing drafts.
- Technical summaries.
- First-pass coding drafts.
- Simple Python helper drafts.
- Automation planning drafts.
- Debugging suggestions.
- Engineering notes.
- Tool workflow drafts.

Do not use for:

- Final production code approval.
- Security-sensitive final decisions.
- Financial decisions.
- Irreversible actions.
- Red-risk tasks without cloud or human review.

## Cloud Model Rules

### Gemini Free Key #1

Use for:

- Cloud-level drafting.
- Research summaries.
- Planning.
- Brainstorming.
- Reviewing local model output.
- Medium-complexity cloud tasks.
- Yellow-risk review when GPT Codex is not required.

Avoid:

- Repeated retry loops.
- Final Red-risk decisions alone.
- Complex implementation when GPT Codex is required.

### Gemini Free Key #2

Use for:

- Backup review.
- Overflow from Gemini Key #1.
- Alternate second opinion.
- Non-critical cloud tasks when Key #1 is limited.

Avoid:

- Repeated retry loops.
- Final Red-risk decisions alone.

### GPT Codex

Use for:

- Complex coding.
- Codebase editing.
- Architecture decisions.
- Code review.
- Engineering-heavy tasks.
- Important prompt engineering.
- Final review of technical work.
- Implementation after plans are approved.

Do not waste GPT Codex on:

- Simple chatting.
- Text formatting.
- Low-risk planning.
- Simple summaries.
- Routine note cleanup.
- Background work that local models can do.

### OpenRouter

Use only as fallback when:

- GPT Codex is limited.
- Gemini keys are limited.
- The task is important enough to justify fallback usage.
- A cheaper capable model is available.
- The task cannot safely be handled by local models.

OpenRouter should not be first choice unless explicitly configured by Chris for a specific task.

## Fallback Rules

Fallback is allowed only when the work card says so.

### Green Tasks

Fallback allowed between:

- gemma4
- qwen3.5:9b

Cloud fallback usually unnecessary.

### Yellow Tasks

Fallback may be allowed for drafts or review.

Rules:

- Local models may prepare drafts.
- Cloud or Tusk review required before trusting important output.
- If cloud is unavailable, pause final decision.

### Red Tasks

Fallback is not allowed unless Chris explicitly approves the exact backup model and scope.

Never downgrade Red tasks to a weaker local model for final output.

## Routing Flow

```text
1. Receive request.
2. Belion decides if work card is required.
3. Iron drafts work card if task is serious.
4. Determine risk level.
5. Determine required model.
6. Determine if backup model is allowed.
7. Execute only if approval and model requirements are satisfied.
8. Record actual model/provider.
9. If fallback occurs, record reason.
10. Tusk reviews Yellow/Red or fallback-involved output.
11. Belion reports final status to Chris.
```

## Model Limit Handling

If any cloud model hits quota/rate/usage/provider limits:

1. Stop repeated retries after 2 attempts.
2. Mark provider temporarily unavailable.
3. Create or update Limit Recovery Report.
4. Triage active work cards.
5. Move Green work to local models if safe.
6. Pause Red work.
7. Use local night-shift for safe prep tasks.
8. Ask Chris before config/API key/fallback changes.

## Limit Recovery Report

```text
LIMIT RECOVERY REPORT
Date/Time:
Unavailable Models:
Failure Type:
Affected Work Cards:
Available Models:
Paused Tasks:
Local Tasks Started:
Tasks Waiting for Cloud:
Risks:
Recommended Next Action:
Estimated Safe Local Work:
Tasks Requiring Chris/Topher Approval:
```

## Routing Examples

### Example 1: Quick Japanese word lesson

```text
Risk: Green
Division: Learning
Agent: Sensei
Required Model: qwen3.5:9b or Gemini Key #1 depending availability
Backup: gemma4 for simple lesson format only
QC: Not required unless archived/automated workflow changes
```

### Example 2: Diagnose failing Sensei cron

```text
Risk: Yellow
Division: Learning / Tool
Agent: Belion with Beru/Kaisel support
Required Model: qwen3.5:9b for read-only log summary
Backup: Gemini Key #1 for review
QC: Tusk required
Protected Systems: Sensei cron, skills, logs
```

### Example 3: Modify Sensei cron prompt

```text
Risk: Red
Division: Learning / Tool
Agent: Beru/Kaisel with Belion approval
Required Model: GPT Codex if technical patch is needed
Backup: None unless Chris approves
QC: Tusk required
Protected Systems: Cron job, profile-local skills
```

### Example 4: Build landing page project

```text
Risk: Yellow until deployment; Red if deploying/publishing
Division: Engineering
Agent: Igris / Clix
Required Model: GPT Codex for implementation
Backup: None unless Chris approves
QC: Tusk + Pulse if tests involved
```

### Example 5: Debt payoff plan draft

```text
Risk: Yellow
Division: Financial
Agent: GREED / Ledger
Required Model: Gemini Key #1 or GPT Codex if complex math/tooling
Backup: Gemini Key #2
QC: Tusk required
Protected Systems: None unless financial accounts/files involved
Final action: Chris decides
```

## Routing Status Labels

Use these labels in reports:

- `ROUTED — LOCAL SAFE`
- `ROUTED — CLOUD REQUIRED`
- `ROUTED — CODEX REQUIRED`
- `ROUTED — HUMAN APPROVAL REQUIRED`
- `PAUSED — MODEL UNAVAILABLE`
- `PAUSED — FALLBACK NOT APPROVED`
- `BLOCKED — PROTECTED SYSTEM APPROVAL REQUIRED`
- `INVALID — WRONG MODEL USED`
- `UNVERIFIED MODEL — REVIEW REQUIRED`
