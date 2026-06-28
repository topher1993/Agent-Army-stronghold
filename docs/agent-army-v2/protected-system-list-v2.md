# Agent Army v2.0 — Protected System List v2

**Created:** 2026-06-17  
**Mode:** Documentation-only refinement  
**Rule:** Inventory only. No protected system was modified.

## Protection Levels

### P-A: Critical Protected Production Asset

Do not modify without explicit Chris approval and a Red or Yellow work card.

Includes:

- Secrets
- API keys
- OAuth tokens
- Environment variables
- Active cron jobs
- Working production configurations
- Gateway configuration
- Credential stores

### P-B: Protected Workflow Asset

Do not modify without explicit approved work card.

Includes:

- Skills
- Profile-local skills
- Wrappers
- Aliases
- Scheduled workflow prompts
- Memory files
- Project workflow docs that agents depend on

### P-C: Documentation / Planning Asset

May be created or updated only when the approved scope allows documentation work.

Includes:

- New governance docs
- Inventory docs
- Conflict reports
- Planning files

## Protected Cron Jobs

### `e90094c57b64` — Nightly Hermes GitHub backup

- **Protection:** P-A
- **Status:** enabled; last status ok
- **Schedule:** `0 3 * * *`
- **Delivery:** local
- **Script:** `hermes_github_backup.py`
- **Day 2 action:** Documented only.
- **Change approval required:** Yes.

### `da3378be9991` — SENSEI Japanese N5-to-N2 Daily Tutor

- **Protection:** P-A
- **Status:** enabled; last status error
- **Schedule:** `0 8 * * *`
- **Delivery:** origin
- **Profile:** sensei
- **Skills:** `word-explainer`, `lesson-history`
- **Day 2 action:** Documented only.
- **Change approval required:** Yes.

### `0646d5c0211e` — Daily Agent Army Morning Checkup

- **Protection:** P-A
- **Status:** enabled; last status ok
- **Schedule:** `0 7 * * *`
- **Delivery:** origin
- **Profile:** default
- **Skills:** `hermes-agent`, `agent-army-governance`
- **Repair pass action:** Documentation updated to match current cron metadata; cron schedule/prompt/enabled state unchanged.
- **Change approval required:** Yes.

### `12bd56eb8975` — Kaisel Archive Sensei Japanese Lesson to Google Drive

- **Protection:** P-A
- **Status:** enabled; last status error
- **Schedule:** `10 8 * * *`
- **Delivery:** origin
- **Profile:** kaisel
- **Skills:** `google-workspace`, `japanese-study-drive-archive`
- **Day 2 action:** Documented only.
- **Change approval required:** Yes.

### `a83855395113` — Kamish Daily AI Usage and Cost Report

- **Protection:** P-A
- **Status:** enabled; last status error
- **Schedule:** `30 7 * * *`
- **Delivery:** origin
- **Profile:** kamish
- **Skills:** `ai-cost-limit-monitoring`, `local-ollama-helper`
- **Day 2 action:** Documented only.
- **Change approval required:** Yes.

## Protected Profiles and Wrappers

### Existing Profiles

- default (Belion command identity)
- iron
- tusk
- greed
- atlas
- beru
- cipher
- clix
- forge
- igris
- kaisel
- kamish
- nexus
- nova
- pulse
- sensei
- sentinel
- titan
- vector

**Protection:** P-B for profile definitions and wrappers; P-A for secrets/configs inside profiles.

### Wrapper Rule

Existing wrappers under `C:/Users/tophe/.local/bin/` are protected.

Particularly important:

- `cipher-agent` remains the preferred database-specialist command because Windows has a built-in `cipher` command.
- `visual-review` remains the protected VS Code review helper.
- `local-helper` remains protected local-model helper tooling.
- `belion` maps to `hermes -p default`.
- `iron`, `tusk`, and `greed` wrappers map to their dedicated command profiles.

Repair pass created/updated command-profile wrappers only after Chris approved the repair request.

## Protected Skills

### Default Profile Notable Local Skills

- `agent-config-github-backups`
- `hermes-subagent-profiles`
- `llm-provider-fallbacks`
- `local-ollama-helper`
- `windows-cuda-toolkit-setup`
- `agent-army-governance`
- `beru-kaisel-japanese-study-workflow`
- `scheduled-language-tutor-agents`
- `engineering-division`

### Profile-Local Skills / Workflows

- Sensei: `word-explainer`, `lesson-history`
- Kaisel: `japanese-study-drive-archive`
- Kamish: `ai-cost-limit-monitoring`
- Default finance skills: `financial-division`, `ledger`, `mansa`, `rockefeller`, `morgan`, `rothschild`, `medici`

**Protection:** P-B. No skill modifications allowed without specific approval.

## Protected Config and Credentials

Protected configuration categories:

- Main Hermes config
- Profile configs
- Gateway config
- OpenRouter key config
- OpenAI Codex OAuth
- Gemini keys
- Ollama Cloud credential
- Google OAuth token for Kaisel
- Any `.env`, `auth.json`, token, lock, or credential file

**Protection:** P-A. Do not modify without explicit approval.

## Protected Workflow Groups

### Japanese Study Workflow

- Sensei daily tutor cron
- Kaisel archive cron
- Japanese lesson doc format
- Google Drive archive script and credentials

Status: Protected even though cron jobs currently show errors.

### AI Usage / Cost Monitoring Workflow

- Kamish profile
- Kamish cron
- `ai-cost-limit-monitoring` skill
- `local-ollama-helper` skill

Status: Protected even though cron job currently shows error.

### Engineering Stronghold Workflow

- Stronghold project: `C:/Users/tophe/agent-army-stronghold`
- Engineering Division docs
- Visual review helper
- Existing Stronghold app/source files

Status: Protected project. Day 2 created only new governance docs under `docs/agent-army-v2/`.

## Approval Requirements

Any future change must specify:

```text
Work Card ID:
Protected System Affected:
Allowed Change:
Forbidden Change:
Rollback Plan:
Tusk QC Required: Yes / No
Chris Approval: Required / Not Required
```
