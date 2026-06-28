# Agent Army v2.0 — Protected Cron Future Diagnostic Work Cards

**Created:** 2026-06-17  
**Parent Work Card:** WC-AA-v2-DIAG-PLAN  
**Commander:** Belion  
**Operations:** Iron  
**QC:** Tusk  
**Scope:** Draft future work cards only  
**Important:** These work cards are not approved for execution yet.

## Purpose

This document stages future read-only diagnostic work cards for protected cron jobs currently documented as failing.

No diagnosis was performed while creating this document.

## Global Diagnostic Guardrails

All future diagnostic work cards below must obey:

- Read-only inspection only.
- Do not run cron jobs.
- Do not modify cron jobs.
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets.
- Do not rename wrappers.
- Do not disable anything.
- Do not change schedules.
- Do not repair during diagnosis.
- Stop if secrets/tokens would be exposed.

---

## Work Card 1 — Sensei Daily Tutor Read-Only Diagnosis

```text
WORK CARD ID: WC-LEARN-CRON-DIAG-SENSEI-001
Title: Read-Only Diagnosis — Sensei Daily Japanese Tutor Cron
Original Request: Diagnose why Sensei daily tutor cron is failing.
Goal: Identify likely failure category for Sensei cron without modifying any protected system.
Division: Learning / Operations / QC
Assigned Agent: Belion
Supporting Agents: Beru, Sensei, Tusk
Priority: P1
Risk Level: Yellow
Required Model: qwen3.5:9b for log summarization; Gemini Free Key #1 for review if needed
Backup Model: Gemini Free Key #2 for review only
Actual Model Used:
Model Provider:
Routing Reason: Sensei daily lesson is a protected learning workflow requiring careful read-only diagnosis
Fallback Allowed: Draft/review only
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval for this exact diagnostic work card
Step-by-Step Plan:
1. Inspect cron metadata/output only if approved.
2. Inspect Sensei logs only if approved.
3. Inspect skill names/metadata only; do not edit skills.
4. Classify failure category.
5. Produce diagnostic report.
6. Tusk reviews.
Expected Output: Protected Cron Diagnostic Report for Sensei
Dependencies: Access to read-only cron output/logs
Approval Needed: Yes
Approval Text: Chris must approve read-only diagnosis; no cron runs, repairs, edits, configs, or secrets
Scheduled Time: Not scheduled
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: Sensei cron, Sensei profile logs, Sensei profile-local skills — read-only only
Rollback Needed: No for read-only diagnosis
Rollback Plan: N/A
Completion Evidence: Diagnostic report with sources inspected
Final Status:
```

---

## Work Card 2 — Kaisel Archive Read-Only Diagnosis

```text
WORK CARD ID: WC-TOOL-CRON-DIAG-KAISEL-001
Title: Read-Only Diagnosis — Kaisel Japanese Lesson Archive Cron
Original Request: Diagnose why Kaisel archive cron is failing.
Goal: Identify likely failure category for Kaisel Google Drive archive cron without modifying protected systems or credentials.
Division: Tool / Learning / Operations / QC
Assigned Agent: Belion
Supporting Agents: Kaisel, Beru, Tusk
Priority: P1
Risk Level: Yellow approaching Red if credentials are involved
Required Model: qwen3.5:9b for log/script-output summarization; Gemini Free Key #1 for review if needed
Backup Model: Gemini Free Key #2 for review only
Actual Model Used:
Model Provider:
Routing Reason: Google Workspace archive flow is protected and may involve OAuth/Drive/Docs integration
Fallback Allowed: Draft/review only
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval for this exact diagnostic work card
Step-by-Step Plan:
1. Inspect cron metadata/output only if approved.
2. Inspect Kaisel logs only if approved.
3. Inspect archive script metadata/output only; do not edit scripts.
4. Do not read token contents or modify Google credentials.
5. Classify failure category.
6. Produce diagnostic report.
7. Tusk reviews.
Expected Output: Protected Cron Diagnostic Report for Kaisel archive
Dependencies: Access to read-only cron output/logs/script error summaries
Approval Needed: Yes
Approval Text: Chris must approve read-only diagnosis; no OAuth/token/config/script/cron/skill changes
Scheduled Time: Not scheduled
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: Kaisel cron, Google Workspace workflow, archive script/logs — read-only only
Rollback Needed: No for read-only diagnosis
Rollback Plan: N/A
Completion Evidence: Diagnostic report with sources inspected
Final Status:
```

---

## Work Card 3 — Kamish Cost Monitor Read-Only Diagnosis

```text
WORK CARD ID: WC-OPS-CRON-DIAG-KAMISH-001
Title: Read-Only Diagnosis — Kamish Daily AI Usage and Cost Report Cron
Original Request: Diagnose why Kamish daily cost monitor cron is failing.
Goal: Identify likely failure category for Kamish cron without modifying protected systems.
Division: Operations / Tool / QC
Assigned Agent: Belion
Supporting Agents: Kamish, Kaisel, Tusk
Priority: P1
Risk Level: Yellow
Required Model: qwen3.5:9b for log summarization; Gemini Free Key #1 for review if needed
Backup Model: Gemini Free Key #2 for review only
Actual Model Used:
Model Provider:
Routing Reason: Kamish supports cloud-limit/cost discipline and is a protected monitoring workflow
Fallback Allowed: Draft/review only
Fallback Used:
Fallback Reason:
Model Verification Status:
Input Needed: Chris approval for this exact diagnostic work card
Step-by-Step Plan:
1. Inspect cron metadata/output only if approved.
2. Inspect Kamish logs only if approved.
3. Inspect relevant skill metadata only; do not edit skills.
4. Classify failure category.
5. Produce diagnostic report.
6. Tusk reviews.
Expected Output: Protected Cron Diagnostic Report for Kamish
Dependencies: Access to read-only cron output/logs
Approval Needed: Yes
Approval Text: Chris must approve read-only diagnosis; no cron runs, repairs, edits, configs, or secrets
Scheduled Time: Not scheduled
Status: Draft
QC Required: Yes
Final Reviewer: Tusk / Chris
Protected Systems Affected: Kamish cron, Kamish profile logs, monitoring skills — read-only only
Rollback Needed: No for read-only diagnosis
Rollback Plan: N/A
Completion Evidence: Diagnostic report with sources inspected
Final Status:
```

---

## Recommended Execution Order

When Chris approves diagnostics, execute in this order:

1. Sensei daily tutor.
2. Kaisel archive.
3. Kamish cost monitor.

Reason:

- Sensei feeds Kaisel's archive workflow.
- Kaisel archive may fail because Sensei did not produce usable lesson output.
- Kamish is separate but important for cost discipline.

## Approval Prompt for Next Step

```text
Belion, proceed with WC-LEARN-CRON-DIAG-SENSEI-001.
Allowed actions:
- Read-only cron metadata/output inspection for Sensei only.
- Read-only Sensei logs inspection.
- Read-only skill metadata inspection.
- Create diagnostic report documentation.
Forbidden actions:
- Do not run cron jobs.
- Do not modify cron jobs.
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets or tokens.
- Do not change schedules.
- Do not repair anything.
```
