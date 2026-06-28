# Agent Army v2.0 — Automatic Model Enforcement and Tusk Preflight

**Requested by:** Chris / Topher  
**Executed by:** Belion with Igris/Tusk engineering rules  
**Date:** 2026-06-17  
**Mode:** Controlled Stronghold implementation  

## Work Card

```text
WORK CARD ID: WC-ENG-20260617-MODEL-TUSK-001
Title: Implement automatic model enforcement and automatic Tusk preflight in Stronghold request queue
Original Request: "belion Let us now work with automatic model enforcement and automatic tusk preflight"
Goal: Stop unsafe/wrong-model agent requests before dispatch queue and automatically require Tusk review for Yellow/Red/coding/security/fallback/model-uncertain work.
Division: Engineering / Governance
Assigned Agent: Belion coordinating; Igris ownership implied for engineering artifact
Supporting Agents: Tusk, Iron
Priority: P1
Risk Level: Yellow
Required Model: GPT Codex/current active Hermes engineering model
Backup Model: None for final code changes
Actual Model Used: Current active Hermes session model
Model Provider: Current active Hermes provider
Routing Reason: Stronghold TypeScript implementation with tests
Fallback Allowed: No for final implementation
Fallback Used: No
Fallback Reason: N/A
Model Verification Status: UNVERIFIED MODEL — REVIEW REQUIRED
Verification Source: Active Hermes session and executed local test/build output; provider metadata not exposed in report
Approval Needed: Chris requested implementation in-session
QC Required: Yes
Final Reviewer: Tusk/Chris
Protected Systems Affected: Stronghold project files only; no cron/config/secrets touched
Rollback Needed: Yes if rejected
Rollback Plan: Revert changed Stronghold files listed below
```

## What Was Implemented

### Automatic Tusk Preflight

Added `server/safety/tuskPreflight.ts` with:

- `runTuskPreflight(request)`
- `computeRequiredReviewers(request)`
- `assertTuskPreflightPass(request)`

Tusk is automatically required for:

- Yellow work
- Red work
- code review
- security review
- model fallback
- model uncertainty
- invalid/wrong model status
- required-model-unavailable status

### Automatic Model Enforcement

`enqueueAgentRequest()` now blocks approved requests from entering the dispatch queue when:

- Yellow/Red work lacks required model metadata
- Yellow/Red work lacks actual model metadata
- Yellow/Red work lacks provider metadata
- Yellow/Red work lacks `Verification Source`
- Yellow/Red verification source is only agent self-report
- fallback was used but not allowed
- fallback was used without fallback reason
- actual model does not match required model or approved backup model
- Red work tries to proceed with a local model alone
- model status is `INVALID — WRONG MODEL USED`
- model status is `BLOCKED — REQUIRED MODEL UNAVAILABLE`
- Yellow work remains `UNVERIFIED MODEL — REVIEW REQUIRED`

### Request Metadata

Extended `AgentRequest` with:

- `riskLevel`
- `requiredModel`
- `backupModel`
- `actualModel`
- `modelProvider`
- `verificationSource`
- `modelVerificationStatus`
- `fallbackAllowed`
- `fallbackUsed`
- `fallbackReason`
- `tuskRequired`
- `preflightVerdict`
- `preflightErrors`

### Allowlist Update

Expanded safe agent target allowlist for live Agent Army v2 profiles:

- Belion
- Iron
- Tusk
- Kaisel
- Igris
- GREED
- Beru
- engineering specialists

### Snapshot Regression Fix

Because Belion/default now has `profiles/default/SOUL.md`, the Stronghold snapshot generator could duplicate the `default` profile. Fixed `scripts/generate-snapshot.mjs` to skip `profiles/default` because default is already represented by the Hermes root.

## Files Changed

```text
server/safety/tuskPreflight.ts
server/safety/agentAllowlist.ts
server/services/agentRequestService.ts
shared/agentTypes.ts
tests/model-enforcement-preflight.test.ts
tests/snapshot.test.ts
scripts/generate-snapshot.mjs
public/data/stronghold-snapshot.json
docs/agent-army-v2/automatic-model-enforcement-and-tusk-preflight-20260617.md
```

## Validation

RED test observed first:

```text
tests/model-enforcement-preflight.test.ts — 3 failed before implementation
```

GREEN validation:

```text
npm test -- tests/model-enforcement-preflight.test.ts tests/agent-request-schema.test.ts tests/dispatch-denial.test.ts tests/dispatch-mock.test.ts
4 files passed, 6 tests passed
```

Build validation:

```text
npm run build
passed
```

Snapshot duplicate regression test:

```text
npm test -- tests/snapshot.test.ts tests/model-enforcement-preflight.test.ts
2 files passed, 7 tests passed
```

## Protected-System Compliance

No cron jobs were run or modified.
No schedules changed.
No secrets, tokens, OAuth files, API keys, or environment files were read or modified.
No deployment, push, delete, broad reset, or account action was performed.

## Current Limit

This enforcement is active in the Stronghold agent-request workflow. It does not yet patch Hermes core runtime globally for every Telegram/CLI tool call outside Stronghold.

## Tusk QC Verdict

```text
PASS WITH WARNINGS
```

Trusted for: Stronghold agent-request preflight/queue enforcement.  
Not trusted for: global Hermes runtime enforcement outside Stronghold until a separate Hermes-core hook is designed and approved.
