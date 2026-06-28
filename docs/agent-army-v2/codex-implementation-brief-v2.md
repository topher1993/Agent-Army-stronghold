# Agent Army v2.0 — Codex Implementation Brief v2

**Created:** 2026-06-17  
**Owner:** Belion — Supreme Commander / Chief of Staff  
**Implementation Lead:** GPT Codex, when approved  
**Operations:** Iron  
**QC:** Tusk  
**Mode:** Documentation-only Day 6 artifact

## Purpose

This brief prepares a future GPT Codex implementation pass for Agent Army v2.0. It does **not** authorize implementation by itself.

Day 6 creates the implementation plan, allowed/forbidden boundaries, rollback requirements, and validation steps so Day 7 can be controlled and safe.

## Core Rule

Do not implement from this brief until Chris approves the specific implementation work card.

This brief is a staging document only.

## Required Model

```text
Required Model: GPT Codex
Backup Model: None for implementation unless Chris explicitly approves exact fallback and scope
```

If GPT Codex is unavailable:

```text
PAUSED — REQUIRED MODEL UNAVAILABLE
```

Then create a Limit Recovery Report.

## Implementation Goal

Integrate Agent Army v2.0 governance into the operating system gradually, without breaking existing systems.

The first controlled implementation should prefer new documentation and non-invasive references before modifying live profiles, skills, cron jobs, configs, or automations.

## Initial Implementation Target

Day 7 should be controlled and narrow.

Recommended Day 7 target:

```text
Create or update documentation/index references only inside Stronghold docs.
Do not modify live Hermes skills, cron jobs, configs, wrappers, profiles, secrets, or automations.
```

Rationale:

- Agent Army v2.0 docs are created but not yet indexed as a single operational reference.
- Live integration should happen only after the docs are reviewed.
- Existing protected systems include failing cron jobs and ambiguous model routing; those require separate diagnostic work cards.

## Explicitly Allowed for First Codex Pass

Only if Chris approves Day 7 with this scope:

- Read Agent Army v2 docs.
- Create a documentation index file under `docs/agent-army-v2/`.
- Create a Day 7 implementation report under `docs/agent-army-v2/`.
- Optionally create a non-invasive checklist document under `docs/agent-army-v2/`.
- Run read-only verification commands.
- Report git status.

## Explicitly Forbidden for First Codex Pass

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
- Create new profiles.
- Create new cron jobs.
- Change provider/model routing.
- Delete files.
- Move files.
- Commit changes.
- Push changes.
- Deploy anything.
- Modify existing Stronghold app/source/data files unless Chris explicitly approves.

## Protected Systems Not To Touch

- Hermes cron jobs.
- Hermes skills and profile-local skills.
- `C:/Users/tophe/AppData/Local/hermes/config.yaml`
- Profile configs.
- Gateway config.
- Credential files.
- Google OAuth token files.
- OpenRouter/OpenAI/Gemini/Ollama credentials.
- Wrappers in `C:/Users/tophe/.local/bin/`.
- Existing Stronghold source/app files.
- Existing `public/data/stronghold-snapshot.json` modification.

## Required Pre-Implementation Checks

Before any future Codex implementation step:

1. Confirm exact approved work card.
2. Confirm allowed file paths.
3. Confirm forbidden paths.
4. Confirm Required Model is GPT Codex.
5. Verify actual model/provider if possible.
6. Confirm no protected systems will be modified.
7. Confirm rollback plan.
8. Confirm Tusk QC requirement.

## Recommended Day 7 Codex Work Card Summary

```text
WORK CARD ID: WC-AA-v2-DAY7-DOCINDEX
Title: Agent Army v2.0 Documentation Index and Controlled Implementation Report
Risk Level: Yellow
Required Model: GPT Codex
Backup Model: None — pause if unavailable
Allowed Changes: Create new docs under `docs/agent-army-v2/` only
Forbidden Changes: No cron/skill/config/secret/wrapper/profile/source/data changes
QC Required: Yes — Tusk
Rollback: Delete newly created Day 7 docs if rejected
```

## Codex Prompt For Day 7

```text
You are GPT Codex operating under Belion's Agent Army v2.0 governance.

Task: Execute Work Card WC-AA-v2-DAY7-DOCINDEX only.

Allowed actions:
- Read files under `C:/Users/tophe/agent-army-stronghold/docs/agent-army-v2/`.
- Create new documentation files only under `C:/Users/tophe/agent-army-stronghold/docs/agent-army-v2/`.
- Create an index/README-style reference that links/summarizes all Agent Army v2 docs.
- Create a Day 7 controlled implementation report.
- Run read-only verification commands such as file listing and git status.

Forbidden actions:
- Do not modify cron jobs.
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets, API keys, tokens, or environment variables.
- Do not rename wrappers.
- Do not disable anything.
- Do not change schedules.
- Do not create profiles.
- Do not create cron jobs.
- Do not modify existing Stronghold app/source/data files.
- Do not touch `public/data/stronghold-snapshot.json`.
- Do not commit, push, publish, or deploy.

Required output:
- New documentation index file path.
- New Day 7 implementation report path.
- Git status output.
- Tusk QC intake summary.

If any required model/config/approval is unavailable, pause and create a Limit Recovery Report instead of continuing.
```

## Validation Requirements

After future implementation:

- Confirm only allowed files changed.
- Confirm no protected system changed.
- Confirm no secrets/configs touched.
- Confirm docs are readable.
- Confirm git status.
- Produce Tusk QC report.

## Rollback Requirements

Rollback for first implementation pass should be simple:

```text
Delete newly created Day 7 docs if rejected.
```

Do not use broad git reset or destructive cleanup unless Chris explicitly approves.
