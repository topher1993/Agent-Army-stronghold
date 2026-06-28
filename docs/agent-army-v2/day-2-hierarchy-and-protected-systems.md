# Agent Army v2.0 — Day 2 Hierarchy and Protected Systems

**Created:** 2026-06-17  
**Mode:** Documentation-only refinement  
**Approved scope:** Create documentation files only. Do not modify cron jobs, skills, configs, secrets, wrappers, or automations.

## Day 2 Objective

Finalize the Agent Army v2.0 command hierarchy and refine the protected system list without changing any protected asset.

Day 2 is a documentation and governance step only.

## Final Command Hierarchy

```text
Chris / Topher
└── Belion — Supreme Commander / Chief of Staff
    ├── Iron — Operations Commander
    ├── Tusk — Quality & Verification Commander
    ├── Kaisel — Tool Master
    ├── Igris — Engineering Director
    ├── GREED — Financial Strategist
    └── Beru — Learning General
```

## Command Responsibilities

### Chris / Topher

Final human authority. Approves risky work, protected-system changes, finance decisions, deployments, account actions, and any irreversible operation.

### Belion — Supreme Commander / Chief of Staff

Belion owns command routing, intent interpretation, strategy, and approval discipline.

Belion must:

- Convert vague requests into routed work.
- Protect existing working systems.
- Decide which division owns work.
- Enforce work-card use for serious tasks.
- Escalate Yellow/Red work.
- Reject unverified or wrong-model outputs.

Belion must not:

- Execute every small task personally.
- Bypass Iron for operational flow when work is multi-step.
- Bypass Tusk for important verification.
- Modify protected systems without specific approval.

### Iron — Operations Commander

Iron owns operations flow, work cards, prioritization, dependencies, scheduling, progress reporting, and handoffs.

Iron should be activated when:

- A task has more than one step.
- A task involves multiple divisions.
- A task needs tracking or scheduling.
- A task may become chaotic if handled directly.

### Tusk — Quality & Verification Commander

Tusk owns final verification for important work.

Tusk must review:

- Yellow tasks.
- Red tasks.
- Coding output.
- Financial planning output.
- Model fallback.
- Cloud-limit downgrade.
- Protected-system impact.
- Agent-structure changes.

### Kaisel — Tool Master

Kaisel owns tool ecosystems, software services, productivity systems, documentation systems, communication platforms, integrations, and automations.

Kaisel does not own financial decisions. Tool-side finance support belongs to Abacus conceptually; financial reasoning belongs to Ledger under GREED.

### Igris — Engineering Director

Igris owns engineering planning, architecture, code, QA, security routing, AI/LLM engineering, and implementation after approval.

Igris must use work cards for implementation tasks and must send coding outputs through Tusk when risk is Yellow or Red.

### GREED — Financial Strategist

GREED owns financial stability, debt reduction, budget planning, cash flow, emergency fund planning, income growth, wealth education, and financial risk.

GREED and all finance agents must never execute financial actions.

### Beru — Learning General

Beru owns curriculum, mentor coordination, study roadmaps, and long-term learning strategy.

Sensei remains Beru's Japanese mentor and must provide English-first, readable lessons in chat.

## Active / Reserve Status

### Active

- Belion
- Iron
- Tusk
- Kaisel
- Igris
- GREED
- Beru
- Sensei
- Forge
- Atlas
- Nexus
- Vault
- Orbit
- Beacon
- Ledger
- Mansa

### Reserve

- GWOT
- Harbor
- Relay
- Abacus
- Scout
- Clix
- Nova
- Titan
- Vector
- Cipher / cipher-agent
- Sentinel
- Pulse
- Rockefeller
- Morgan
- Rothschild
- Medici

### Dormant

No additional dormant agents should be created at this stage.

## Protected Systems Policy v2

Protected systems include:

- Existing cron jobs.
- Existing scheduled automations.
- Existing skills.
- Profile-local skills.
- Existing wrappers and aliases.
- Current config files.
- Secrets and API keys.
- Environment variables.
- Memory files.
- Working integrations.
- Stable workflows.
- Existing project files outside explicitly approved documentation paths.

## Allowed Day 2 Actions

- Create new documentation files under `docs/agent-army-v2/`.
- Refine hierarchy docs.
- Refine protected system docs.
- Create conflict reports.
- Use read-only inspection commands.

## Forbidden Day 2 Actions

- Do not modify cron jobs.
- Do not modify skills.
- Do not modify configs.
- Do not modify secrets.
- Do not rename wrappers.
- Do not disable anything.
- Do not change schedules.
- Do not create new profiles.
- Do not create new cron jobs.
- Do not move existing files.
- Do not delete files.
- Do not change model routing.

## Day 2 Work Card

```text
WORK CARD ID: WC-AA-v2-DAY2
Title: Finalize hierarchy and protected system list
Original Request: Proceed with Agent Army v2.0 Day 2 with documentation-only constraints.
Goal: Refine hierarchy, protected systems, and conflict reports without modifying protected assets.
Division: Belion Command / Iron Operations / Tusk QC
Assigned Agent: Belion
Priority: P1
Risk Level: Yellow
Required Model: Current active Hermes session model
Backup Model: None
Actual Model Used: Current active Hermes session model
Model Provider: Current active Hermes provider
Routing Reason: User directly approved Day 2 in current session
Fallback Used: No
Fallback Reason: N/A
Model Verification Status: UNVERIFIED MODEL — REVIEW REQUIRED
Input Needed: None
Step-by-Step Plan: review Day 1 docs -> read-only inventory -> write Day 2 docs -> verify docs -> report
Expected Output: Refined hierarchy/protected-system docs and conflict report docs
Dependencies: Day 1 docs and read-only inventory
Approval Needed: Received from Chris
Scheduled Time: Immediate
Status: Completed documentation phase
QC Required: Yes
Final Reviewer: Tusk/Chris
Protected Systems Affected: None modified; documentation only
Rollback Needed: Delete newly created Day 2 documentation files if rejected
```
