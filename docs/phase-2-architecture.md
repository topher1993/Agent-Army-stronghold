# Phase 2 Architecture

Owner: Igris  
Status: Implemented MVP

## Decision

Phase 2 adds a localhost-only backend boundary to the Phase 1 static dashboard. The browser may present proposal and approval workflows, but any write-capable behavior must pass through validated backend services.

## Runtime flow

```text
React dashboard
  ↓ static snapshot and guarded API health
Phase 2 local API on 127.0.0.1:5175
  ↓ validators / path guard / redaction / approval workflow
Stronghold-owned data files only
  ↓ snapshot generator
public/data/stronghold-snapshot.json
```

## Implemented modules

- `server/index.ts` — localhost API and testable `inject()` harness.
- `server/safety/pathGuard.ts` — exact write-target allowlist and path escape denial.
- `server/safety/redaction.ts` — key/value redaction and sensitive content detection.
- `server/services/approvalWorkflow.ts` — proposed → approved/rejected → applied state transitions.
- `server/services/auditLog.ts` — append-only redacted JSONL events.
- `server/services/missionService.ts` and `taskService.ts` — validated mission/task persistence services.
- `shared/types.ts` and `shared/constants.ts` — shared contracts.
- `src/components/*` — Phase 2 guarded UI panels.

## Approved write scope

```text
data/missions.json
data/tasks.json
data/change-requests.json
data/audit-log.jsonl
public/data/stronghold-snapshot.json
```

The snapshot output remains anchored to the project root.

## Still out of scope

- Command execution.
- Agent execution.
- Hermes profile edits.
- Cron edits.
- Skill/plugin/memory edits.
- Git operations from the UI/API.
- Google/Gmail/OAuth/API access.
