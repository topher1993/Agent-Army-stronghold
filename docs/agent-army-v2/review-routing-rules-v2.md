# Agent Army v2.0 — Review Routing Rules v2

**Created:** 2026-06-17  
**Owner:** Belion  
**Operations:** Iron  
**QC:** Tusk  
**Mode:** Documentation-only Day 4 artifact

## Purpose

Review routing rules decide when work must pass through Tusk, when a specialist reviewer is needed, and when Chris must approve the next action.

The goal is not bureaucracy. The goal is reliable execution without damaging protected systems or wasting cloud models.

## Review Routing Summary

```text
Green task -> Assigned agent may complete -> Optional QC
Yellow task -> Assigned agent completes draft/output -> Tusk reviews -> Belion reports
Red task -> Pause before action -> Chris approval -> Execute only approved scope -> Tusk reviews -> Belion reports
```

## Routing Authorities

### Belion

- Final command routing.
- Decides division owner.
- Enforces approval boundaries.
- Accepts or rejects final result after QC.

### Iron

- Creates and tracks work cards.
- Tracks status, dependencies, handoffs, and schedules.
- Ensures work does not start from vague requests.

### Tusk

- Reviews important work.
- Verifies model compliance.
- Blocks unsafe actions.
- Issues QC verdicts.

### Division Leaders

- Kaisel reviews tool/workflow matters.
- Igris reviews engineering matters.
- GREED reviews finance matters.
- Beru reviews learning matters.

Specialist review may be required before Tusk final QC.

## Review Routing by Division

### Command / Governance

Owner: Belion  
Operations: Iron  
Final QC: Tusk

QC required when:

- Agent Army structure changes.
- New governance docs are created.
- Protected-system rules are changed.
- Model-routing rules are changed.
- Active/reserve/dormant states are changed.

### Operations

Owner: Iron  
Final QC: Tusk for Yellow/Red

QC required when:

- Work-card templates change.
- Schedules or dependencies affect protected systems.
- Daily/weekly reports include important recommendations.
- Operations plans involve multiple divisions.

### Tool Division

Owner: Kaisel  
Final QC: Tusk for Yellow/Red

QC required when:

- Tools, integrations, automations, or workflows are changed.
- Google Workspace workflows are touched.
- Cron jobs or scripts are diagnosed or repaired.
- Credentials, tokens, configs, or APIs could be affected.

### Engineering Division

Owner: Igris  
Specialist reviewers: Atlas, Pulse, Sentinel, Nexus as needed  
Final QC: Tusk for Yellow/Red

QC required when:

- Code is produced.
- Architecture changes are proposed.
- Deployment is involved.
- Security is involved.
- Tests fail or are missing.
- Existing project files are modified.

Suggested reviewer routing:

- Backend -> Forge
- Frontend -> Clix
- Mobile -> Nova
- Desktop -> Titan
- DevOps -> Vector
- Database -> Cipher/cipher-agent
- Security -> Sentinel
- Architecture -> Atlas
- QA/testing -> Pulse
- AI/LLM engineering -> Nexus

### Financial Division

Owner: GREED  
Specialist reviewers: Ledger, Mansa, Rockefeller, Morgan, Rothschild, Medici  
Final QC: Tusk for Yellow/Red

QC required for all financial planning outputs.

Chris approval required for any actual financial action.

Suggested reviewer routing:

- Debt/budget -> Ledger
- Investments/wealth education -> Mansa
- Income growth -> Rockefeller
- Market intelligence -> Morgan
- Capital preservation/risk -> Rothschild
- Financial planning -> Medici

### Learning Division

Owner: Beru  
Specialist reviewer: Sensei for Japanese  
Final QC: Tusk when automated workflows or important plans are involved

QC required when:

- Learning workflow automation changes.
- Sensei cron/job is diagnosed or repaired.
- Long-term curriculum changes are proposed.
- Output will be archived or sent automatically.

## Review Routing by Risk

### Green

Flow:

```text
Request -> Belion/Iron routes -> Agent completes -> Optional QC -> Report
```

Tusk not required unless:

- Output seems uncertain.
- User asks for verification.
- The task unexpectedly touches protected systems.

### Yellow

Flow:

```text
Request -> Work Card -> Assigned Agent -> Specialist Review if needed -> Tusk QC -> Belion final report
```

Tusk required.

Examples:

- Engineering planning.
- Read-only cron diagnosis.
- Financial strategy draft.
- Model routing audit.
- Agent Army governance docs.

### Red

Flow:

```text
Request -> Work Card -> Pause -> Chris specific approval -> Assigned Agent executes approved scope -> Specialist Review -> Tusk QC -> Belion final report
```

Chris approval required before action.

Examples:

- Cron modification.
- Skill modification.
- Config edit.
- Secret/API key/token change.
- Deployment.
- Publishing.
- Sending messages.
- Account or financial actions.
- File deletion.

## Specialist Review Before Tusk

Specialist review happens before final Tusk QC when domain expertise is needed.

Examples:

```text
Engineering code -> Igris/Pulse/Sentinel -> Tusk
Finance budget plan -> GREED/Ledger -> Tusk
Japanese learning workflow -> Beru/Sensei/Kaisel -> Tusk
Tool automation -> Kaisel/Beacon -> Tusk
Architecture decision -> Igris/Atlas -> Tusk
```

## Human Approval Routing

Chris approval is required before:

- Spending money.
- Sending messages.
- Deleting files.
- Changing passwords.
- Opening accounts.
- Making trades.
- Submitting forms.
- Publishing content.
- Deploying code.
- Installing unknown software.
- Accessing sensitive accounts.
- Modifying cron jobs.
- Modifying working skills.
- Disabling automations.
- Changing secrets.
- Changing API keys.
- Changing tokens.
- Changing environment variables.
- Modifying production configurations.

Approval must be specific.

Good approval example:

```text
I approve Work Card WC-TOOL-20260617-004 to inspect logs and create a repair plan only. Do not modify cron jobs, skills, configs, or secrets.
```

## Review Routing Output Format

For important tasks, Belion should report routing like this:

```text
REVIEW ROUTING REPORT
Work Card ID:
Risk Level:
Division Owner:
Assigned Agent:
Specialist Reviewer:
Tusk QC Required:
Chris Approval Required:
Protected Systems Affected:
Routing Reason:
Final Review Path:
```

## Example: Sensei Cron Diagnosis

```text
REVIEW ROUTING REPORT
Work Card ID: WC-LEARN-20260617-001
Risk Level: Yellow
Division Owner: Beru / Kaisel support
Assigned Agent: Belion for read-only diagnosis
Specialist Reviewer: Sensei/Kaisel if logs indicate lesson/archive workflow issue
Tusk QC Required: Yes
Chris Approval Required: Yes for any repair, no for read-only diagnosis if approved
Protected Systems Affected: Sensei cron, Sensei skills, possible model/provider config
Routing Reason: Protected learning automation is failing
Final Review Path: Belion diagnosis -> Beru/Kaisel interpretation -> Tusk QC -> Chris repair approval
```

## Example: Stronghold UI Implementation

```text
REVIEW ROUTING REPORT
Work Card ID: WC-ENG-20260617-002
Risk Level: Yellow locally; Red if deployed
Division Owner: Igris
Assigned Agent: Clix / Forge as needed
Specialist Reviewer: Pulse for tests, Sentinel for security, Atlas for architecture
Tusk QC Required: Yes
Chris Approval Required: Yes before deploy or production changes
Protected Systems Affected: Stronghold project files
Routing Reason: Engineering implementation changes code
Final Review Path: Igris execution -> Pulse tests -> Tusk QC -> Belion report -> Chris approval for deploy
```

## Example: Finance Budget Draft

```text
REVIEW ROUTING REPORT
Work Card ID: WC-FIN-20260617-003
Risk Level: Yellow
Division Owner: GREED
Assigned Agent: Ledger
Specialist Reviewer: GREED
Tusk QC Required: Yes
Chris Approval Required: Yes before any real financial action
Protected Systems Affected: None unless account/files are accessed
Routing Reason: Financial planning must be reviewed and non-executory
Final Review Path: Ledger draft -> GREED review -> Tusk QC -> Belion report -> Chris decision
```

## Review Completion Rule

A task is review-complete only when all required boxes are satisfied:

```text
Work card exists if required.
Risk level assigned.
Required model recorded.
Actual model recorded or marked unverified.
Specialist review completed if required.
Tusk verdict recorded if required.
Chris approval recorded if required.
Protected-system impact documented.
Rollback plan documented if needed.
Belion final report delivered.
```

## Day 4 Completion Criteria

Day 4 is complete when:

- Tusk QC Workflow v2 exists.
- Review Routing Rules v2 exists.
- Docs are verified present.
- No protected system was modified.
- Belion reports Day 4 status and Day 5 approval gate.
