# Engineering Patch Plan — Profile-Aware Skill Path Resolution

**Created:** 2026-06-17
**Work Card:** WC-ENG-HERMES-PROFILE-SKILL-PATH-001
**Commander:** Belion
**Assigned Agent:** Igris (for implementation)
**Implementation Model:** GPT Codex
**QC:** Tusk
**Scope:** Documentation-only patch planning. No source edits.

## Scope Compliance

Approved actions performed:

- Created documentation files only.
- Created engineering patch plan for profile-aware skill path resolution.
- Identified exact source files likely needing change.
- Identified exact tests/validation needed.

Forbidden actions not performed:

- Did not edit source files.
- Did not run cron jobs.
- Did not modify cron jobs.
- Did not modify skills.
- Did not modify configs.
- Did not modify secrets or tokens.
- Did not change schedules.
- Did not repair anything.

## Executive Summary

This plan addresses a critical bug in Hermes Agent where cron jobs configured with a specific profile cannot correctly load profile-local skills. The root cause is `tools.skills_tool` capturing the default `SKILLS_DIR` at module import time, preventing dynamic resolution to the correct profile's skill directory during a cron job's execution.

The proposed solution involves modifying `tools.skills_tool.py` to ensure `SKILLS_DIR` is resolved dynamically at call-time based on the active `HERMES_HOME`, enabling profile-aware skill loading for cron jobs.

## Problem Statement

Sensei's daily Japanese lesson cron (`da3378be9991`) is configured with `profile: sensei` and lists `word-explainer` and `lesson-history` skills. However, the cron job consistently reports:

```text
Skill(s) not found and skipped: word-explainer, lesson-history
```

This prevents Sensei from using its intended teaching context and potentially affects other profile-scoped cron jobs that rely on profile-local skills.

## Root Cause

**PROFILE_CONTEXT_IMPORT_TIME_SKILLS_DIR_CAPTURE**

The `tools.skills_tool` module, which contains the `skill_view()` function used by the cron scheduler, captures `SKILLS_DIR` at module import time. In a long-running process like the cron scheduler, if `tools.skills_tool` is imported under the default profile (which it typically is at startup), the `SKILLS_DIR` constant remains pointed at the default profile's skills directory:

```text
C:/Users/tophe/AppData/Local/hermes/skills
```

Even when the cron scheduler correctly enters the Sensei profile context using `_job_profile_context`, the `skill_view()` function continues to search the default profile's skill directory, not Sensei's:

```text
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills
```

This mismatch prevents the Sensei cron job from finding its profile-local skills.

## Proposed Solution (Conceptual Direction)

The preferred long-term engineering fix is to make the skills directory resolution dynamic within `tools.skills_tool.py`.

### Change Description

Replace the module-level static `SKILLS_DIR` constant in `tools.skills_tool.py` with a function that resolves `get_hermes_home() / "skills"` at call time. All internal functions within `tools.skills_tool` (e.g., `skill_view()`, `skills_list()`, `_find_all_skills()`) should then use this dynamic resolution.

### Example Conceptual Direction Only

```python
# In tools/skills_tool.py

# Remove:
# HERMES_HOME = get_hermes_home()
# SKILLS_DIR = HERMES_HOME / "skills"

# Add this function:
def _get_profile_skills_dir() -> Path:
    return get_hermes_home() / "skills"

# Replace all uses of SKILLS_DIR with _get_profile_skills_dir()
# For example, in _find_all_skills():
#     search_roots = [(_get_profile_skills_dir(), "local")]
```

## Affected Source Files (Likely Candidates)

```text
C:/Users/tophe/AppData/Local/hermes/hermes-agent/tools/skills_tool.py
```

Specifically, the global/module-level definitions of `HERMES_HOME` and `SKILLS_DIR`, and all subsequent references to `SKILLS_DIR` within functions like `_find_all_skills()`, `_serve_local_skill()`, `skills_list()`, and `skill_view()`.

## Required Tests / Validation

### 1. New Unit Test (or Controlled Script)

A new test case is needed to specifically validate profile-aware skill loading in a scenario mimicking the cron job context.

**Scenario:**
1. Import `tools.skills_tool` under the *default* Hermes profile.
2. Override `HERMES_HOME` to the *Sensei* profile using `set_hermes_home_override()`.
3. Call `skill_view('word-explainer')` and assert that it *succeeds* and returns the skill content from the Sensei profile.

This test will directly prove that `skill_view()` can dynamically resolve skills based on the active `HERMES_HOME` override, even if its module was initially imported under a different profile.

### 2. Existing Test Suite

Run the full existing `pytest` suite for `tools/skills_tool.py` and `cron/scheduler.py` to ensure the change does not introduce regressions.

### 3. Manual Controlled Cron Run (After Approval)

After the patch is applied and unit tests pass, a controlled run of the Sensei cron job should be performed (with explicit Chris approval) to confirm that `word-explainer` and `lesson-history` are no longer reported as "skipped" and the lesson is generated correctly.

## Forbidden Actions (During Implementation)

- Do not modify any files outside `tools/skills_tool.py` unless explicitly approved.
- Do not run cron jobs or modify cron job definitions without separate approval.
- Do not modify skill `SKILL.md` files or skill directories.
- Do not modify any configuration files, secrets, or environment variables.
- Do not change schedules.
- Do not implement any changes without explicit Chris approval for the *exact patch*.

## Tusk QC Planning Verdict

```text
TUSK QC PLANNING REPORT
Work Card ID: WC-ENG-HERMES-PROFILE-SKILL-PATH-001
Task Title: Engineering Patch Plan — Profile-Aware Skill Path Resolution
Risk Level: Yellow
Protected Systems Affected: tools.skills_tool.py (P-B Protected Workflow Asset)
Cron Jobs Run: No
Cron Jobs Modified: No
Skills Modified: No
Configs Modified: No
Secrets/Tokens Modified: No
Schedule Changed: No
Diagnostic Basis: Sensei Skill Loader Diagnostic Report (WC-LEARN-SENSEI-SKILL-LOADER-DIAG-001)
Root Cause Confidence: High
Proposed Solution: Dynamic skills directory resolution in tools.skills_tool.py
Validation Plan: New unit test + existing test suite + controlled cron run (with approval)

Verdict: PASS WITH WARNINGS
Warnings:
- This is a plan only; no source code has been modified.
- Actual implementation will require Igris/Codex to create the patch.
- The patch will affect a core Hermes system file (`tools/skills_tool.py`), requiring careful review and testing.
- The Sensei cron still also has the separate model quota problem, which this patch does not address.
- Explicit Chris approval for the exact patch (source code changes) will be mandatory before any implementation.
