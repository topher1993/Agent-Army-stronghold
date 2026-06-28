# Protected Cron Diagnostic Report — Sensei Daily Tutor

**Created:** 2026-06-17  
**Work Card:** WC-LEARN-CRON-DIAG-SENSEI-001  
**Commander:** Belion  
**Supporting Agents:** Beru, Sensei, Tusk  
**Scope:** Read-only diagnosis  
**Protected System:** SENSEI Japanese N5-to-N2 Daily Tutor cron  
**Job ID:** `da3378be9991`

## Scope Compliance

Approved actions performed:

- Read-only cron metadata/output inspection for Sensei only.
- Read-only Sensei log inspection.
- Read-only Sensei skill metadata inspection.
- Created diagnostic report documentation.

Forbidden actions not performed:

- Did not run cron jobs.
- Did not modify cron jobs.
- Did not modify skills.
- Did not modify configs.
- Did not modify secrets or tokens.
- Did not change schedules.
- Did not repair anything.

## Cron Metadata

```text
Job ID: da3378be9991
Name: SENSEI Japanese N5-to-N2 Daily Tutor
Profile: sensei
Schedule: 0 8 * * *
Delivery: origin
Enabled: true
State: scheduled
Last Run: 2026-06-17T08:00:38.090433+09:00
Last Status: error
Next Run: 2026-06-18T08:00:00+09:00
Skills Listed: word-explainer, lesson-history
Enabled Toolsets: web, terminal, file, skills
Model Override: none
Provider Override: none
```

## Sources Inspected

Read-only sources:

- `cronjob(action='list')` metadata for job `da3378be9991`.
- `C:/Users/tophe/AppData/Local/hermes/profiles/sensei/logs/errors.log`.
- `C:/Users/tophe/AppData/Local/hermes/profiles/sensei/logs/agent.log` tail.
- Filtered global Hermes logs for Sensei cron ID `cron_da3378be9991_20260617_080027`.
- Latest Sensei cron request dump:
  - `C:/Users/tophe/AppData/Local/hermes/profiles/sensei/sessions/request_dump_cron_da3378be9991_20260617_080027_20260617_080036_585543.json`
- Sensei skill metadata:
  - `C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/japanese/word-explainer/SKILL.md`
  - `C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/japanese/lesson-history/SKILL.md`

Notes:

- No OAuth/token/secret file contents were intentionally read.
- The request dump display included an already-redacted Authorization header preview from Hermes tooling; no secret was used or preserved.

## Observed Evidence

### Evidence 1 — Latest request dump

Latest request dump reports:

```text
Session ID: cron_da3378be9991_20260617_080027
Timestamp: 2026-06-17T08:00:36.585543
Reason: max_retries_exhausted
Request URL: https://chatgpt.com/backend-api/codex/responses
Model: gpt-5.5
```

The request body began with a warning:

```text
Skill(s) not found and skipped: word-explainer, lesson-history
```

### Evidence 2 — Latest global Hermes log entries

Filtered global logs for 2026-06-17 show:

```text
2026-06-17 08:00:27 ... conversation turn: session=cron_da3378be9991_20260617_080027 model=gpt-5.5 provider=openai-codex platform=cron
2026-06-17 08:00:29 ... credential pool: no available entries (all exhausted or empty)
2026-06-17 08:00:29 ... API call failed (attempt 1/3) ... RateLimitError ... HTTP 429: The usage limit has been reached
2026-06-17 08:00:32 ... API call failed (attempt 2/3) ... RateLimitError ... HTTP 429: The usage limit has been reached
2026-06-17 08:00:36 ... API call failed (attempt 3/3) ... RateLimitError ... HTTP 429: The usage limit has been reached
2026-06-17 08:00:36 ... API call failed after 3 retries. HTTP 429: The usage limit has been reached | provider=openai-codex model=gpt-5.5 msgs=2 tokens=~5,886
2026-06-17 08:00:36 ... Job 'SENSEI Japanese N5-to-N2 Daily Tutor' failed: RuntimeError: HTTP 429: The usage limit has been reached
```

### Evidence 3 — Historical Sensei profile error log

Sensei profile `errors.log` shows the same failure pattern on 2026-06-14:

```text
HTTP 429: The usage limit has been reached
provider=openai-codex
model=gpt-5.5
Job 'SENSEI Japanese N5-to-N2 Daily Tutor' failed
```

### Evidence 4 — Skill files exist in Sensei profile

Read-only skill metadata confirms these files exist:

```text
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/japanese/word-explainer/SKILL.md
C:/Users/tophe/AppData/Local/hermes/profiles/sensei/skills/japanese/lesson-history/SKILL.md
```

Their frontmatter names are:

```text
name: word-explainer
name: lesson-history
```

This conflicts with the cron request warning that both listed skills could not be found and were skipped.

## Likely Failure Categories

Primary category:

```text
MODEL_PROVIDER_LIMIT
```

Reason:

- Latest run failed after 3 attempts with `HTTP 429: The usage limit has been reached` from `openai-codex` using `gpt-5.5`.
- Credential pool also reported no available entries / exhausted or empty during retries.

Secondary category:

```text
SKILL_NOT_FOUND_OR_NOT_LOADED
```

Reason:

- Request dump says the cron job could not find `word-explainer` and `lesson-history`.
- Skill files with matching frontmatter names exist in the Sensei profile.
- This suggests a skill discovery/path/profile loading issue or stale cron skill resolution behavior, not missing files.

Possible contributing category:

```text
PROFILE_CONFIG_OR_SKILL_INDEX_ISSUE
```

Reason:

- Skill files exist under `skills/japanese/...`, but the cron run still skipped them.
- No config inspection was performed because config edits/secrets were forbidden and this work card focused only on Sensei logs/skill metadata.

## Root Cause Assessment

Most likely immediate cause of latest cron failure:

```text
OpenAI Codex / GPT-5.5 usage limit reached before Sensei could generate the daily lesson.
```

Secondary issue requiring separate repair planning:

```text
The Sensei cron job's listed skills are not being loaded even though matching skill files exist in the Sensei profile.
```

Confidence:

```text
High for MODEL_PROVIDER_LIMIT.
Medium for SKILL_NOT_FOUND_OR_NOT_LOADED because skill files exist but loader behavior/config was not modified or deeply inspected.
```

## Impact

- Sensei daily lesson automation remains enabled but likely fails while OpenAI Codex quota is exhausted.
- Skill context may be absent during Sensei cron runs, reducing lesson quality even if the model call succeeds later.
- Kaisel archive may also fail or archive poor/missing content if Sensei does not produce a usable lesson.

## Repair Recommendations — Not Executed

No repair was performed.

Recommended next repair-planning work cards:

### 1. Model fallback / quota planning for Sensei cron

Create a work card to propose safer model routing for Sensei's daily cron.

Potential direction, not approved yet:

- Use a lower-cost/free model for routine daily lessons.
- Preserve GPT Codex for engineering, not daily teaching content.
- Require Tusk/Belion approval before changing cron model/provider fields.

### 2. Sensei skill loader diagnosis

Create a work card to inspect skill discovery/index behavior for the Sensei profile.

Potential read-only checks, not approved yet:

- Verify Hermes profile skill index behavior.
- Inspect profile skill config/snapshot metadata if approved.
- Determine whether cron resolves profile-local skills by category path correctly.
- Determine whether skill names must be qualified or installed differently for cron.

### 3. Limit Recovery Report for Sensei cron

Create a Limit Recovery Report if daily lesson automation should continue while Codex is limited.

## Future Approval Prompt — Repair Planning Only

```text
Belion, proceed with WC-LEARN-SENSEI-REPAIR-PLAN-001.
Allowed actions:
- Create documentation files only.
- Propose Sensei cron repair options.
- Propose model routing/fallback options.
- Propose skill loader diagnostic steps.
Forbidden actions:
- Do not run cron jobs.
- Do not modify cron jobs.
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets or tokens.
- Do not change schedules.
- Do not repair anything.
```

## Tusk QC Report

```text
TUSK QC REPORT
Work Card ID: WC-LEARN-CRON-DIAG-SENSEI-001
Task Title: Read-Only Diagnosis — Sensei Daily Japanese Tutor Cron
Risk Level: Yellow
Protected System: SENSEI Japanese N5-to-N2 Daily Tutor cron
Protected Systems Modified: No
Cron Jobs Run: No
Cron Jobs Modified: No
Skills Modified: No
Configs Modified: No
Secrets/Tokens Modified: No
Schedule Changed: No
Logs Inspected: Yes, read-only
Skill Metadata Inspected: Yes, read-only
Root Cause Claimed: Immediate cause only

Verdict: PASS WITH WARNINGS
Warnings:
- Diagnosis found a clear model provider quota failure, but no repair was attempted.
- Skill files exist, but cron skill loading still reports missing skills; this requires separate investigation.
- Current session model identity remains unverified.
- Future repair may require protected cron/model/skill/config changes and therefore must be separately approved.
```
