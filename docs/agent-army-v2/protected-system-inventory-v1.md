# Agent Army v2.0 — Protected System Inventory v1

**Created:** 2026-06-17  
**Mode:** Read-only inventory, documentation-only implementation  
**Protected by:** Belion / Tusk policy

## Protection Rule

All listed systems are protected production assets. Error status does not authorize modification. Any change requires a specific Chris-approved work card.

## Cron Jobs

| Job ID | Name | Profile | Schedule | Delivery | Last Status | Protection |
|---|---|---|---|---|---|---|
| `e90094c57b64` | Nightly Hermes GitHub backup | default/local script | `0 3 * * *` | local | ok | Protected |
| `da3378be9991` | SENSEI Japanese N5-to-N2 Daily Tutor | sensei | `0 8 * * *` | origin | error | Protected |
| `0646d5c0211e` | Daily Agent Army Morning Checkup | default | `0 7 * * *` | origin | ok | Protected |
| `12bd56eb8975` | Kaisel Archive Sensei Japanese Lesson to Google Drive | kaisel | `10 8 * * *` | origin | error | Protected |
| `a83855395113` | Kamish Daily AI Usage and Cost Report | kamish | `30 7 * * *` | origin | error | Protected |

## Profiles

Current Hermes profiles found by `hermes profile list`:

| Profile | Alias | Gateway | Notes |
|---|---|---|---|
| default | — | running | Main Belion/default control profile |
| atlas | atlas | stopped | Engineering architecture specialist |
| beru | beru | stopped | Learning General |
| cipher | cipher-agent | stopped | Database specialist; wrapper avoids Windows `cipher` conflict |
| clix | clix | stopped | Frontend specialist |
| forge | forge | stopped | Backend specialist |
| igris | igris | stopped | Engineering Director |
| kaisel | kaisel | stopped | Tool Master |
| kamish | kamish | stopped | AI usage / cost monitor |
| nexus | nexus | stopped | AI/LLM engineering specialist |
| nova | nova | stopped | Mobile specialist |
| pulse | pulse | stopped | QA/testing specialist |
| sensei | sensei | stopped | Japanese mentor |
| sentinel | sentinel | stopped | Security specialist |
| titan | titan | stopped | Desktop specialist |
| vector | vector | stopped | DevOps/infrastructure specialist |

## Wrappers / Local Commands

Wrappers found under `C:/Users/tophe/.local/bin/` include:

- `belion`, `belion.bat`
- `kaisel`, `kaisel.bat`
- `beru`, `beru.bat`
- `sensei`, `sensei.bat`
- `kamish`, `kamish.bat`
- `igris`, `igris.bat`
- `forge`, `forge.bat`
- `clix`, `clix.bat`
- `nova`, `nova.bat`
- `titan`, `titan.bat`
- `vector`, `vector.bat`
- `cipher-agent`, `cipher-agent.bat`
- `cipher`, `cipher.bat` — note: conflicts conceptually with Windows built-in `cipher`; `cipher-agent` remains preferred.
- `sentinel`, `sentinel.bat`
- `atlas`, `atlas.bat`
- `pulse`, `pulse.bat`
- `nexus`, `nexus.bat`
- `visual-review`, `visual-review.bat`
- `local-helper`, `local-helper.bat`, `local-helper.py`
- `setup-free-cloud-fallbacks`

## Skills Summary

Current default profile skill inventory reports:

- 69 enabled skills
- 61 builtin skills
- 8 local skills
- 0 disabled skills

Notable local/protected skills:

- `agent-config-github-backups`
- `hermes-subagent-profiles`
- `llm-provider-fallbacks`
- `local-ollama-helper`
- `windows-cuda-toolkit-setup`
- `beru-kaisel-japanese-study-workflow`
- `scheduled-language-tutor-agents`
- `engineering-division`

Profile-local protected skills observed:

- `sensei` profile: `word-explainer`, `lesson-history`
- `kaisel` profile: `japanese-study-drive-archive`, profile-local productivity Sensei bridge file
- default profile: `financial-division`, `ledger`, `mansa`, `rockefeller`, `morgan`, `rothschild`, `medici`

## Model / Credential Status Snapshot

From `hermes auth list`:

- copilot: 1 credential
- gemini: 2 credentials
- ollama-cloud: 1 credential
- openai-codex: 1 OAuth credential
- openrouter: 2 credentials

From `hermes config`:

- Default visible model: `gpt-5.5`
- Provider: `openai-codex`
- Context length: `262144`
- OpenRouter model field: `nex-agi/nex-n2-pro:free`
- Telegram gateway configured
- Discord not configured

## Initial Protected Conflict Reports

### Conflict 1: Tool Ledger vs Finance Ledger

- **Type:** Agent naming conflict
- **Risk:** Yellow
- **Current behavior:** Ledger appears in both tool-side and finance-side language.
- **Recommended action:** Keep Financial Ledger under GREED. Rename Tool Division Ledger conceptually to Abacus.
- **Approval required:** Yes, before changing any file, skill, wrapper, cron job, or automation.

### Conflict 2: Sensei / Kaisel cron errors

- **Type:** Protected cron operational error
- **Risk:** Yellow
- **Current behavior:** Sensei tutor and Kaisel archive jobs are enabled but last status is `error`.
- **Recommended action:** Diagnose with a separate approved work card. Do not modify the jobs automatically.
- **Approval required:** Yes.

### Conflict 3: Model config ambiguity

- **Type:** Model routing/config ambiguity
- **Risk:** Yellow
- **Current behavior:** Config displays `default: gpt-5.5`, provider `openai-codex`, plus OpenRouter model `nex-agi/nex-n2-pro:free`.
- **Recommended action:** Resolve through a model-routing work card after Agent Army v2.0 rules are approved.
- **Approval required:** Yes, because model routing and API configuration are protected.
