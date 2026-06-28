# Agent Army v2.0 — Implementation Work Cards v2

**Created:** 2026-06-17  
**Owner:** Iron — Operations Commander  
**Commander:** Belion  
**QC:** Tusk  
**Mode:** Documentation-only Day 6 artifact

## Purpose

This file stages controlled implementation work cards for Agent Army v2.0. These work cards are drafts until Chris explicitly approves them.

No implementation is authorized by this document alone.

---

## Work Card 1 — Day 7 Documentation Index

```text
WORK CARD ID: WC-AA-v2-DAY7-DOCINDEX
Title: Agent Army v2.0 Documentation Index and Controlled Implementation Report
Original Request: Prepare first controlled implementation step after Day 6.
Goal: Create a single index/report layer for the Agent Army v2.0 documentation without modifying live systems.
Division: Command / Operations / QC
Assigned Agent: GPT Codex, under Belion command
Supporting Agents: Iron, Tusk
Priority: P1
Risk Level: Yellow
Required Model: GPT Codex
Backup Model: None — pause if unavailable
Actual Model Used:
Model Provider:
Routing Reason: Implementation-style docs consolidation is a controlled Codex task
Fallback Allowed: No
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval for this exact work card
Step-by-Step Plan:
1. Read `docs/agent-army-v2/` files.
2. Create new documentation index file under `docs/agent-army-v2/`.
3. Create Day 7 controlled implementation report under `docs/agent-army-v2/`.
4. Run read-only file listing.
5. Run `git status --short`.
6. Produce Tusk QC intake summary.
Expected Output:
- `agent-army-v2-index.md`
- `day-7-controlled-implementation-report.md`
Dependencies: Day 1-6 docs
Approval Needed: Yes
Approval Text: Chris must approve WC-AA-v2-DAY7-DOCINDEX exactly
Scheduled Time: Day 7 after approval
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: None expected; documentation only
Rollback Needed: Yes
Rollback Plan: Delete newly created Day 7 documentation files if rejected
Completion Evidence: File paths, file listing, git status
Final Status:
```

---

## Work Card 2 — Protected System Diagnostic Planning Only

```text
WORK CARD ID: WC-AA-v2-DIAG-PLAN
Title: Protected Cron Diagnostic Planning Packet
Original Request: Prepare future diagnostics for failing protected cron jobs.
Goal: Create diagnostic plan only for Sensei, Kaisel archive, and Kamish cron errors.
Division: Operations / Tool / Learning / QC
Assigned Agent: Belion
Supporting Agents: Iron, Tusk, Kaisel, Beru, Kamish
Priority: P1
Risk Level: Yellow
Required Model: qwen3.5:9b for plan draft; Gemini Free Key #1 or GPT Codex for review if needed
Backup Model: Gemini Free Key #2 for review only
Actual Model Used:
Model Provider:
Routing Reason: Protected cron diagnosis must be planned before any read/repair pass
Fallback Allowed: Only for drafting/review
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval for diagnostic planning
Step-by-Step Plan:
1. List failing cron jobs from protected inventory.
2. Define read-only logs/outputs to inspect later.
3. Define forbidden repair actions.
4. Create separate future diagnostic work cards.
5. Tusk reviews.
Expected Output: Diagnostic planning packet only
Dependencies: Protected-system conflict reports
Approval Needed: Yes
Approval Text: Chris must approve diagnostic planning; no repairs
Scheduled Time: After Day 7 or separate approval
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: Sensei cron, Kaisel archive cron, Kamish cron — planning only
Rollback Needed: No for planning docs
Rollback Plan: N/A
Completion Evidence: Created diagnostic planning document
Final Status:
```

---

## Work Card 3 — Model Routing Audit Planning Only

```text
WORK CARD ID: WC-AA-v2-MODEL-AUDIT-PLAN
Title: Model Routing Audit Planning Packet
Original Request: Prepare future model routing clarity audit.
Goal: Create a read-only model routing audit plan without changing configs.
Division: Command / Tool / QC
Assigned Agent: Belion
Supporting Agents: Kaisel, Tusk
Priority: P1
Risk Level: Yellow
Required Model: qwen3.5:9b for draft; Gemini or GPT Codex for review if needed
Backup Model: None for config changes
Actual Model Used:
Model Provider:
Routing Reason: Current model config ambiguity affects model verification
Fallback Allowed: Draft only
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval for audit planning
Step-by-Step Plan:
1. Define read-only config/auth/log inspection targets.
2. Define exact forbidden edits.
3. Define model metadata verification goals.
4. Create future audit work card.
5. Tusk reviews.
Expected Output: Model routing audit plan only
Dependencies: Model routing and verification docs
Approval Needed: Yes
Approval Text: Chris must approve audit planning only; no config edits
Scheduled Time: After Day 7 or separate approval
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: Hermes config/auth model routing — planning only
Rollback Needed: No for planning docs
Rollback Plan: N/A
Completion Evidence: Created audit planning document
Final Status:
```

---

## Work Card 4 — Live Skill Integration Planning Only

```text
WORK CARD ID: WC-AA-v2-SKILL-INTEGRATION-PLAN
Title: Plan Agent Army v2 Skill Integration
Original Request: Prepare future integration of governance rules into skills.
Goal: Plan how to update governance skills without editing them yet.
Division: Command / Tool / QC
Assigned Agent: Belion
Supporting Agents: Kaisel, Tusk
Priority: P2
Risk Level: Yellow
Required Model: GPT Codex for final implementation plan
Backup Model: None for actual skill edits
Actual Model Used:
Model Provider:
Routing Reason: Skill edits are protected and require implementation precision
Fallback Allowed: Draft only
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval
Step-by-Step Plan:
1. Identify skills that may need Agent Army v2 references.
2. Define non-invasive update candidates.
3. Define forbidden edits.
4. Produce exact patch plan.
5. Request approval before any skill edit.
Expected Output: Skill integration plan only
Dependencies: Day 1-6 docs
Approval Needed: Yes
Approval Text: Chris must approve planning only; no skill edits
Scheduled Time: Later phase
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: Skills — planning only
Rollback Needed: No for planning docs
Rollback Plan: N/A
Completion Evidence: Created plan
Final Status:
```

## Day 6 Work Card Completed

```text
WORK CARD ID: WC-AA-v2-DAY6
Title: Prepare Codex Implementation Brief and Controlled Work Cards
Original Request: Proceed with Agent Army v2.0 Day 6 documentation-only scope.
Goal: Prepare Codex implementation brief, implementation work cards, allowed/forbidden changes, rollback, and validation instructions.
Division: Command / Operations / QC
Assigned Agent: Belion
Supporting Agents: Iron, Tusk
Priority: P1
Risk Level: Yellow
Required Model: Current active Hermes session model
Backup Model: None
Actual Model Used: Current active Hermes session model
Model Provider: Current active Hermes provider
Routing Reason: Chris approved Day 6 docs in current session
Fallback Allowed: No
Fallback Used: No
Fallback Reason: N/A
Model Verification Status: UNVERIFIED MODEL — REVIEW REQUIRED
Input Needed: Day 1-5 docs
Step-by-Step Plan: review prior docs -> create Codex brief -> create implementation work cards -> create safety/rollback docs -> verify -> report
Expected Output: Day 6 documentation files only
Dependencies: Day 1-5 docs
Approval Needed: Received from Chris
Approval Text: Documentation files only; no cron/skill/config/secret/wrapper changes
Scheduled Time: Immediate
Status: Completed documentation phase
QC Required: Yes
Final Reviewer: Tusk/Chris
Protected Systems Affected: None modified; documentation only
Rollback Needed: Yes
Rollback Plan: Delete Day 6 documentation files if rejected
Completion Evidence: Created Day 6 docs under `docs/agent-army-v2/`
Final Status: Completed
```
