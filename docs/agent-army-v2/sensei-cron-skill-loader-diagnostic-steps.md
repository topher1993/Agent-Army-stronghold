# Sensei Cron Skill Loader Diagnostic Steps

**Created:** 2026-06-17  
**Work Card:** WC-LEARN-SENSEI-REPAIR-PLAN-001  
**Scope:** Documentation-only diagnostic-step proposal  
**Protected System:** SENSEI Japanese N5-to-N2 Daily Tutor cron  
**Job ID:** `da3378be9991`

## Purpose

This document proposes safe future steps to diagnose why Sensei cron reports `word-explainer` and `lesson-history` as missing even though matching Sensei profile-local skill files exist.

No diagnosis beyond the prior approved read-only inspection was performed here.

No skill files were modified.

## Known Evidence

The latest request dump warned:

```text
Skill(s) not found and skipped: word-explainer, lesson-history
```

But prior read-only inspection confirmed files exist:

```text
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/japanese/word-explainer/SKILL.md
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/japanese/lesson-history/SKILL.md
```

And frontmatter names are:

```text
name: word-explainer
name: lesson-history
```

## Hypotheses

### Hypothesis 1 — Cron skill resolution does not see profile-local category paths

The skills are under:

```text
skills/japanese/word-explainer/
skills/japanese/lesson-history/
```

Cron may be resolving listed skill names against a different profile context or registry snapshot.

### Hypothesis 2 — Profile-local skill index/cache is stale

Files exist, but a cached skill index or prompt snapshot may not include them.

### Hypothesis 3 — Cron starts before profile skill config is loaded correctly

Cron metadata says `profile: sensei`, but the skill resolution warning indicates the skills were not found at job start.

### Hypothesis 4 — Skill platform/config enablement mismatch

Skills may exist on disk but not be enabled or discoverable for cron/gateway context.

### Hypothesis 5 — Skill names may need qualified path references

Cron may need names like category-qualified references, or the skill resolver may not recurse profile-local category directories as expected.

## Future Read-Only Diagnostic Steps

These steps require separate approval before execution.

### Step 1 — Confirm skill discovery via Sensei profile CLI

Potential command category:

```text
hermes --profile sensei skills list
```

Purpose:

- Check whether Hermes itself lists `word-explainer` and `lesson-history` under Sensei profile.

Restrictions:

- Read-only only.
- Do not install/update/remove skills.
- Do not edit skill config.

### Step 2 — Inspect skill configuration metadata only

Potential read-only targets:

```text
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/.skills_prompt_snapshot.json
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/.usage.json
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/.bundled_manifest
```

Purpose:

- Determine whether the skills appear in skill snapshots or usage metadata.

Restrictions:

- Do not edit these files.
- Do not expose secrets.
- If a file contains unexpected sensitive material, stop.

### Step 3 — Compare default vs Sensei skill visibility

Potential read-only comparison:

```text
hermes skills list
hermes --profile sensei skills list
```

Purpose:

- Determine whether the current/default profile sees different skills than Sensei.

Restrictions:

- No skill modifications.

### Step 4 — Inspect cron job skill resolution behavior in docs/source only if needed

Potential read-only source inspection:

```text
Hermes cron scheduler skill-loading code path
Hermes skill discovery code path
```

Purpose:

- Determine whether cron resolves profile-local skills by name, path, category, or active profile registry.

Restrictions:

- Source read-only.
- No code edits.

### Step 5 — Produce exact loader repair plan

Possible future repair directions, not approved:

- Refresh/rebuild Sensei skill index if such command exists and is safe.
- Update cron job skill references to whatever exact format the resolver expects.
- Move/copy skills only if explicitly approved and rollback exists.
- Patch Hermes skill resolver only if a code bug is confirmed and Chris approves engineering work.

## Forbidden During Skill Loader Diagnosis

Do not:

- Edit `SKILL.md` files.
- Move skill directories.
- Rename skills.
- Install/uninstall/update skills.
- Modify profile config.
- Modify cron job skill list.
- Run the Sensei cron.
- Read secrets/tokens.

## Proposed Future Work Card

```text
WORK CARD ID: WC-LEARN-SENSEI-SKILL-LOADER-DIAG-001
Title: Sensei Cron Skill Loader Read-Only Diagnosis
Goal: Determine why Sensei cron cannot load `word-explainer` and `lesson-history` despite files existing.
Risk Level: Yellow
Required Model: qwen3.5:9b for diagnostic summary; GPT Codex if source-code analysis is needed
Allowed Actions:
- Read-only Sensei profile skill listing commands.
- Read-only skill metadata/snapshot inspection.
- Read-only comparison of default vs Sensei skill visibility.
- Read-only Hermes source inspection if needed.
Forbidden Actions:
- No cron runs.
- No cron modifications.
- No skill modifications.
- No config modifications.
- No secret/token inspection.
- No schedule changes.
Expected Output:
- Skill loader diagnostic report.
- Exact repair recommendation.
```

## Approval Prompt for Next Step

```text
Belion, proceed with WC-LEARN-SENSEI-SKILL-LOADER-DIAG-001.
Allowed actions:
- Read-only Sensei profile skill listing.
- Read-only skill metadata/snapshot inspection.
- Read-only default vs Sensei skill visibility comparison.
- Read-only Hermes source inspection if needed.
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

## Tusk QC Verdict for This Plan

```text
PASS WITH WARNINGS
```

Warnings:

- This is diagnostic planning only.
- Actual loader cause is not confirmed yet.
- Read-only CLI checks may reveal next steps but must not drift into repair.
- Any skill/cron/config change requires separate approval.
