# Sensei Cron Model Routing and Fallback Options

**Created:** 2026-06-17  
**Work Card:** WC-LEARN-SENSEI-REPAIR-PLAN-001  
**Scope:** Documentation-only model routing proposal  
**Protected System:** SENSEI Japanese N5-to-N2 Daily Tutor cron  
**Job ID:** `da3378be9991`

## Purpose

This document proposes model routing and fallback options for Sensei's daily Japanese lesson cron.

No model/provider setting was changed.

## Problem

Sensei's cron currently has no job-level model/provider override, so it inherited the active profile/default model path:

```text
provider=openai-codex
model=gpt-5.5
```

The latest failure was:

```text
HTTP 429: The usage limit has been reached
```

This is not ideal because routine daily language lessons should not consume scarce GPT Codex/engineering-grade quota.

## Routing Requirements

A good Sensei daily-lesson model should:

- Produce clear English explanations.
- Handle Japanese kana/kanji/romaji reliably.
- Follow structured output requirements for Kaisel archiving.
- Be stable for scheduled daily use.
- Be low-cost or free where possible.
- Avoid exhausting GPT Codex quota.
- Support enough context for the lesson prompt and recent history.

## Model Priority Proposal

### Tier 1 — Routine Daily Lesson Model

Preferred for normal Sensei daily cron.

Candidate class:

```text
Gemini free/low-cost cloud model, if available and reliable
```

Reason:

- Better fit for daily tutoring than GPT Codex.
- Cloud quality is likely better than small local models for Japanese nuance.
- Preserves GPT Codex for engineering.

Requirements before implementation:

- Verify exact provider/model name.
- Verify credentials are available without exposing keys.
- Verify cron job can set job-level model/provider safely.
- Tusk review.
- Chris approval.

### Tier 2 — Backup Cloud Model

Candidate class:

```text
Second Gemini key or approved OpenRouter free/cheap model
```

Use when Tier 1 is temporarily limited.

Requirements:

- Must be approved in work card.
- Must record fallback reason.
- Must mark output as fallback-generated if needed.

### Tier 3 — Local Draft/Emergency Mode

Candidate class:

```text
qwen3.5:9b or another approved local model
```

Use only for:

- Simple draft lesson.
- Emergency local lesson stub.
- Prep packet for later cloud rewrite.

Do not use local-only output as final if quality is not verified.

Recommended label:

```text
DRAFT LESSON — LOCAL MODEL, CLOUD REVIEW PENDING
```

### Tier 4 — GPT Codex

Use only if:

- Chris explicitly wants Sensei to use GPT Codex for a special lesson.
- Other approved lesson models fail.
- The task requires high-reasoning lesson design and quota is available.

Default recommendation:

```text
Do not use GPT Codex for routine daily Sensei cron.
```

## Fallback Policy

Recommended fallback field design for future cron update:

```text
Required Model: approved daily teaching model
Backup Model: approved secondary cloud model
Fallback Allowed: Yes, cloud-to-cloud for daily lesson generation
Local Fallback Allowed: Draft only
GPT Codex Fallback: Manual approval only
```

## Proposed Work Card for Model Routing Change

```text
WORK CARD ID: WC-LEARN-SENSEI-MODEL-ROUTING-PLAN-001
Title: Sensei Daily Tutor Model Routing Plan
Goal: Select exact model/provider routing for Sensei daily cron without modifying it yet.
Risk Level: Yellow
Required Model: qwen3.5:9b for planning; Gemini/GPT Codex for review if needed
Allowed Actions: Read-only model/provider availability checks, docs only
Forbidden Actions: No cron/config/secret changes, no schedule changes, no cron runs
Expected Output: Exact proposed required model, backup model, fallback policy, and approval prompt
```

## Future Approval Prompt — Model Routing Planning Only

```text
Belion, proceed with WC-LEARN-SENSEI-MODEL-ROUTING-PLAN-001.
Allowed actions:
- Create documentation files only.
- Read-only model/provider availability checks that do not expose secrets.
- Propose exact Sensei cron model/provider and fallback settings.
Forbidden actions:
- Do not modify cron jobs.
- Do not modify configs.
- Do not modify secrets or tokens.
- Do not change schedules.
- Do not run cron jobs.
- Do not repair anything.
```

## Future Approval Prompt — Actual Model Patch

Only after planning is accepted:

```text
Belion, proceed with WC-LEARN-SENSEI-CRON-MODEL-PATCH-001.
Allowed actions:
- Modify only Sensei cron job `da3378be9991` model/provider fields as specified below.
- Set Required Model: [exact model]
- Set Provider: [exact provider]
- Set Backup Model/Fallback policy: [exact policy]
- Do not change schedule, prompt, skills, delivery, profile, or toolsets.
Forbidden actions:
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets or tokens.
- Do not change schedule.
- Do not run cron job unless separately approved.
Rollback:
- Restore prior model/provider fields: none/null.
```

## Validation Requirements After Future Patch

After any approved model patch:

- List cron metadata.
- Confirm only Sensei job changed.
- Confirm schedule unchanged.
- Confirm prompt unchanged.
- Confirm skills unchanged.
- Confirm delivery unchanged.
- Confirm provider/model fields match approved values.
- Do not trigger run unless approved.

## Tusk QC Verdict for This Proposal

```text
PASS WITH WARNINGS
```

Warnings:

- No exact model selected yet.
- Model availability was not checked under this work card.
- Actual cron patch requires separate explicit approval.
