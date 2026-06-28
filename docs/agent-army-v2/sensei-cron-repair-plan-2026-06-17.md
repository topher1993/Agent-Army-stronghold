# Sensei Cron Repair Plan — Planning Only

**Created:** 2026-06-17  
**Work Card:** WC-LEARN-SENSEI-REPAIR-PLAN-001  
**Commander:** Belion  
**Supporting Agents:** Beru, Sensei, Tusk  
**Scope:** Documentation-only repair planning  
**Protected System:** SENSEI Japanese N5-to-N2 Daily Tutor cron  
**Job ID:** `da3378be9991`

## Scope Compliance

Approved actions performed:

- Created documentation files only.
- Proposed Sensei cron repair options.
- Proposed model routing/fallback options.
- Proposed skill loader diagnostic steps.

Forbidden actions not performed:

- Did not run cron jobs.
- Did not modify cron jobs.
- Did not modify skills.
- Did not modify configs.
- Did not modify secrets or tokens.
- Did not change schedules.
- Did not repair anything.

## Diagnostic Basis

This plan is based on the prior read-only diagnostic report:

```text
C:/Users/tophe/agent-army-stronghold/docs/agent-army-v2/sensei-cron-diagnostic-report-2026-06-17.md
```

Confirmed issues:

1. **Primary immediate failure:** `MODEL_PROVIDER_LIMIT`
   - `openai-codex`
   - `gpt-5.5`
   - `HTTP 429: The usage limit has been reached`
   - failed after 3 retries

2. **Secondary issue:** `SKILL_NOT_FOUND_OR_NOT_LOADED`
   - cron request dump says `word-explainer` and `lesson-history` were skipped as missing
   - both matching skill files exist in Sensei profile under `skills/japanese/...`

## Repair Goals

The repair should make Sensei daily lessons reliable without wasting GPT Codex quota and without breaking protected profile/skill behavior.

Desired final state:

```text
Sensei daily lesson cron runs reliably.
Sensei uses correct teaching context.
Routine Japanese lessons do not consume protected engineering-grade Codex quota unless explicitly needed.
Kaisel archive receives usable Sensei lesson content.
Protected systems remain auditable and reversible.
```

## Repair Option A — Model Routing Only

### Description

Change Sensei cron's model/provider away from `openai-codex/gpt-5.5` to a lower-cost or free model appropriate for daily language lessons.

### Candidate Direction

Potential candidates, subject to future model audit and approval:

```text
Gemini free key model — preferred cloud fallback for polished lesson generation
OpenRouter free/cheap model — fallback only if configured and justified
Local model — draft-only or emergency simple lesson mode
```

### Benefits

- Reduces GPT Codex usage.
- Avoids daily lesson automation failing when Codex is exhausted.
- Preserves GPT Codex for engineering and technical implementation.

### Risks

- Model quality may drop if an underpowered model is chosen.
- Wrong model routing could violate Agent Army v2 verification rules.
- Config/model changes are protected and require explicit approval.

### Approval Needed

Yes. This would modify cron model/provider behavior.

### Recommended Status

```text
Recommended, but only after model-routing audit or explicit approved target model.
```

## Repair Option B — Skill Loader Investigation First

### Description

Before changing the cron, perform a read-only investigation into why profile-local skills exist but cron reports them as missing.

### Candidate Read-Only Checks

Future approved checks could include:

- Inspect Sensei profile skill registry/snapshot metadata.
- Inspect profile skill config/listing behavior.
- Check whether cron resolves profile-local skill names from categorized paths.
- Check whether skills need qualified names, profile-local installation, or reload.
- Compare default-profile skill resolution with Sensei-profile skill resolution.

### Benefits

- Addresses missing `word-explainer` and `lesson-history` context.
- Prevents Sensei from running with incomplete teaching behavior.
- May reveal a broader profile-local skill loading issue affecting other agents.

### Risks

- Diagnosis may lead toward protected skill/config edits.
- If done too aggressively, it could accidentally touch profile configs or skill files.

### Approval Needed

Yes, for read-only investigation. Separate approval required for any repair.

### Recommended Status

```text
Strongly recommended before final repair.
```

## Repair Option C — Combined Safe Repair

### Description

Use a staged repair:

1. Read-only skill loader investigation.
2. Read-only model-routing audit for Sensei cron.
3. Create exact patch plan.
4. Ask Chris approval for exact cron/model/skill change.
5. Apply one change at a time.
6. Validate without broad schedule changes.

### Benefits

- Safest path.
- Handles both confirmed issues.
- Keeps each protected-system modification auditable.

### Risks

- Slower than direct repair.
- Requires more approval gates.

### Approval Needed

Yes, per stage.

### Recommended Status

```text
Best overall path.
```

## Repair Option D — Temporary Manual Lesson Workflow

### Description

Do not change the cron yet. If the scheduled job fails, Chris can ask Sensei manually for the daily lesson in chat until automation is fixed.

### Benefits

- No protected-system changes.
- Avoids rushed repair.
- Lets Sensei still serve the learning mission.

### Risks

- Automation remains broken.
- Kaisel archive may not receive a scheduled lesson automatically.
- Manual flow requires Chris to remember.

### Approval Needed

No system approval needed if Chris manually asks for lessons.

### Recommended Status

```text
Useful fallback while repair is planned.
```

## Recommended Repair Sequence

Belion recommends this order:

```text
1. WC-LEARN-SENSEI-SKILL-LOADER-DIAG-001 — read-only skill loader diagnosis
2. WC-LEARN-SENSEI-MODEL-ROUTING-PLAN-001 — model routing/fallback plan
3. WC-LEARN-SENSEI-CRON-PATCH-PLAN-001 — exact patch plan, no changes yet
4. Chris approval for exact patch
5. Apply one approved change
6. Validate manually or via approved controlled run
7. Tusk QC report
```

## Non-Recommended Actions

Do not immediately:

- Change Sensei cron to a random model.
- Remove skills from the cron to silence warnings.
- Edit Sensei skills without confirming loader behavior.
- Run the cron repeatedly while Codex quota is limited.
- Use GPT Codex for routine daily Japanese lessons long-term.
- Touch secrets/tokens/OAuth files.

## Future Exact Repair Approval Requirements

Any actual repair prompt should include:

```text
Work Card ID:
Exact job ID:
Exact field(s) allowed to change:
Exact model/provider if changing model routing:
Exact skill path/name if changing skill loading:
Forbidden fields:
Backup/snapshot plan:
Rollback plan:
Validation command/method:
Tusk QC required:
```

## Tusk QC Planning Verdict

```text
PASS WITH WARNINGS
```

Warnings:

- This is a plan only; no repair has happened.
- Model routing target is not selected yet.
- Skill loader issue is not root-caused yet.
- Actual repair will require separate approval and likely protected cron/config/skill handling.
