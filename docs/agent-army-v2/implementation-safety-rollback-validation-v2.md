# Agent Army v2.0 — Implementation Safety, Rollback, and Validation v2

**Created:** 2026-06-17  
**Owner:** Tusk — Quality & Verification Commander  
**Commander:** Belion  
**Operations:** Iron  
**Mode:** Documentation-only Day 6 artifact

## Purpose

This document defines the exact allowed/forbidden changes, rollback rules, and validation instructions for future controlled Agent Army v2.0 implementation.

It does not authorize implementation by itself.

## Default Implementation Safety Rule

If the approved scope is unclear, pause.

If a protected system may be affected, pause.

If the required model is unavailable, pause.

If the actual model cannot be verified for a risky task, pause or mark draft-only.

## Allowed Change Categories

### Category A — Documentation Only

Lowest risk.

Allowed examples:

- Create new docs under `docs/agent-army-v2/`.
- Create index files.
- Create reports.
- Create planning packets.
- Create conflict reports.

Still requires git status verification.

### Category B — Read-Only Inspection

Allowed only when approved.

Examples:

- Read cron job list.
- Read skill list.
- Read logs.
- Read config values without exposing secrets.
- Run `git status` or file listings.

No modifications allowed.

### Category C — Protected Planning

Planning only for future protected changes.

Examples:

- Draft cron repair plan.
- Draft skill patch plan.
- Draft model-routing audit plan.
- Draft config change proposal.

No protected asset modification allowed.

### Category D — Protected Modification

Requires explicit separate Chris approval and likely GPT Codex/Tusk review.

Examples:

- Cron edit.
- Skill edit.
- Config edit.
- Wrapper rename.
- Secret/API/token/env change.
- Automation change.
- Profile creation or modification.

Day 6 does **not** authorize Category D.

## Forbidden Unless Specifically Approved

Do not:

- Modify cron jobs.
- Modify skills.
- Modify profile-local skills.
- Modify configs.
- Modify secrets.
- Modify API keys.
- Modify tokens.
- Modify environment variables.
- Rename wrappers.
- Disable anything.
- Change schedules.
- Create profiles.
- Create cron jobs.
- Change model routing.
- Delete files.
- Move files.
- Commit changes.
- Push changes.
- Deploy anything.
- Publish content.
- Send external messages.
- Access accounts beyond approved read-only scope.
- Touch existing `public/data/stronghold-snapshot.json` unless separately approved.

## Allowed Paths for First Controlled Implementation

Recommended first implementation path:

```text
C:/Users/tophe/agent-army-stronghold/docs/agent-army-v2/
```

Allowed operation:

```text
Create new markdown documentation files only.
```

Forbidden paths for first implementation:

```text
C:/Users/tophe/AppData/Local/hermes/config.yaml
C:/Users/tophe/AppData/Local/hermes/profiles/**
C:/Users/tophe/.local/bin/**
C:/Users/tophe/agent-army-stronghold/src/**
C:/Users/tophe/agent-army-stronghold/public/data/stronghold-snapshot.json
C:/Users/tophe/agent-army-stronghold/data/**
```

## Validation Instructions

After any approved implementation step, verify:

```text
1. What files changed?
2. Were all changed files inside approved paths?
3. Were any protected systems modified?
4. Were cron jobs untouched?
5. Were skills untouched?
6. Were configs/secrets untouched?
7. Were wrappers untouched?
8. Were schedules untouched?
9. Was actual model recorded?
10. Is Tusk QC required/completed?
11. Is rollback possible?
12. Is Chris approval needed for the next step?
```

## Required Verification Commands

For Stronghold docs-only implementation:

```bash
git status --short
```

Optional read-only file listing:

```bash
find docs/agent-army-v2 -maxdepth 1 -type f | sort
```

Do not run destructive cleanup.

Do not run `git reset`, `git checkout --`, `rm`, or `mv` unless explicitly approved.

## Rollback Rules

### Documentation-only rollback

If newly created docs are rejected:

```text
Delete only the newly created rejected docs after Chris approval.
```

### Protected modification rollback

If a future protected modification is approved, rollback must be prepared before change.

Rollback plan must include:

```text
Original file/config snapshot path:
Exact change made:
Exact restore steps:
Validation after restore:
```

### Forbidden rollback behavior

Do not use broad rollback commands that may remove unrelated work.

Forbidden unless explicitly approved:

```bash
git reset --hard
git clean -fd
rm -rf
```

## Tusk Validation Report Template

```text
TUSK IMPLEMENTATION VALIDATION REPORT
Work Card ID:
Implementation Scope:
Allowed Paths:
Changed Files:
Protected Systems Modified: Yes / No
Cron Jobs Modified: Yes / No
Skills Modified: Yes / No
Configs Modified: Yes / No
Secrets Modified: Yes / No
Wrappers Modified: Yes / No
Schedules Modified: Yes / No
Model Verification Status:
Rollback Available: Yes / No
Validation Evidence:
Verdict:
Warnings:
Next Approval Required:
```

## Day 7 Validation Standard

For the recommended Day 7 docs-only implementation, Tusk should pass only if:

- New files are under `docs/agent-army-v2/`.
- No existing protected systems are modified.
- No cron jobs are modified.
- No skills are modified.
- No configs/secrets are modified.
- No wrappers are renamed.
- No schedules are changed.
- Git status is reported.
- Existing `public/data/stronghold-snapshot.json` is not touched.

Expected Day 7 QC verdict if scope followed:

```text
PASS WITH WARNINGS
```

Warnings likely remain:

- Documentation-only; no live integration yet.
- Current model identity may remain unverified.
- Existing cron errors remain unresolved.
- Existing Stronghold snapshot modification remains separate.

## Implementation Stop Conditions

Stop immediately if:

- A command would modify a protected system.
- Required model is unavailable.
- User approval scope is ambiguous.
- A file outside approved paths would change.
- A secret/token/config would be displayed or modified.
- A cron/skill/wrapper would be changed.
- A destructive command seems necessary.
- Tests/verification reveal unexpected changes.

When stopped, create:

```text
BLOCKED IMPLEMENTATION REPORT
Reason:
Risk Level:
Protected System Involved:
Recommended Next Action:
Chris Approval Needed:
```
