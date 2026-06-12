# Agent-Army Stronghold Phase 3 Plan — Controlled Agent Orchestration

**Owner:** Igris, Engineering Director  
**Coordinator:** Belion  
**Mode:** Plan-only — no Phase 3 implementation yet  
**Status:** Phase 3 requires explicit execution gate after Chris reviews Phase 2

## Mission

Phase 3 turns the Stronghold from a guarded mission/task dashboard into a controlled orchestration cockpit for agent requests. The system may queue, approve, dispatch, monitor, and review bounded agent work — but agent output remains an artifact/proposal unless a human promotes it into the Phase 2 change-request workflow.

## Non-negotiable boundary

Phase 3 is **not** arbitrary command execution.

Still forbidden by default:

```text
/api/command
/api/execute
/api/shell
/api/git
/api/profile
/api/cron
/api/skills
/api/plugins
/api/memories
/api/secrets
```

Also forbidden:

- raw shell strings from UI/API
- user-supplied executable paths
- Hermes profile/cron/skill/plugin/memory mutation
- external network dispatch targets
- Google/Gmail/OAuth access
- git push/reset/checkout/merge from UI/API
- dependency install/update from UI/API
- binding services to `0.0.0.0`

## Phase 3 principle

```text
Agent requests create artifacts.
Artifacts may create Phase 2 change requests.
Only approved Phase 2 change requests mutate Stronghold-owned data.
```

Agents do not directly mutate project files, profiles, cron jobs, or missions.

---

## Specialist assignments

- **Igris:** final technical owner, acceptance, sequencing.
- **Atlas:** queue/dispatcher/artifact architecture.
- **Sentinel:** execution policy, allowlists, secrets, kill switch, denial tests.
- **Forge:** backend services, wrapper adapter, queue persistence.
- **Clix:** request queue, run monitor, artifact review UI.
- **Pulse:** mock dispatcher tests, denial tests, state machine coverage, smoke tests.
- **Vector:** local operations, process lifecycle, timeout, runbook.
- **Nexus:** agent prompt contract, artifact schemas, knowledge capture.

---

## New data files

Approved Stronghold-owned files for Phase 3:

```text
data/agent-requests.json
data/agent-runs.json
data/agent-artifacts.json
data/agent-runs.jsonl
data/audit-log.jsonl
```

Do not write outside these new files without a separate Phase 3.x review.

---

## Data contracts

### Agent request

```ts
type AgentRequestStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'queued'
  | 'dispatching'
  | 'running'
  | 'awaiting_human_review'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'rejected';

type AgentRequestKind =
  | 'mission.plan'
  | 'task.breakdown'
  | 'code.review'
  | 'security.review'
  | 'architecture.proposal'
  | 'status.summary'
  | 'artifact.review';

type AgentRequest = {
  id: string;
  kind: AgentRequestKind;
  status: AgentRequestStatus;
  title: string;
  prompt: string;
  requestedBy: string;
  targetAgent: string;
  missionId?: string;
  taskId?: string;
  reviewers: string[];
  sandboxPolicyId: string;
  allowedInputs: AgentInputRef[];
  expectedOutputSchema: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  failureReason?: string;
};
```

### Agent run

```ts
type AgentRun = {
  id: string;
  requestId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'timed_out';
  wrapper: 'hermes';
  targetAgent: string;
  startedAt?: string;
  finishedAt?: string;
  timeoutMs: number;
  inputHash: string;
  outputHash?: string;
  auditEventIds: string[];
};
```

### Agent artifact

```ts
type AgentArtifact = {
  id: string;
  requestId: string;
  runId: string;
  kind: 'plan' | 'review' | 'summary' | 'patch-proposal' | 'risk-report';
  content: string;
  redactionApplied: boolean;
  createdAt: string;
  requiresHumanApply: boolean;
};
```

### Sandbox policy

```ts
type SandboxPolicy = {
  id: string;
  network: 'none' | 'allowlisted';
  filesystem: 'none' | 'read-stronghold-snapshot-only' | 'read-approved-context-bundle';
  writeMode: 'artifact-only';
  maxRuntimeMs: number;
  maxInputBytes: number;
  maxOutputBytes: number;
  allowedContextKinds: string[];
  deniedPatterns: string[];
  redactionRequired: boolean;
};
```

Default policy:

```text
network: none
filesystem: read-approved-context-bundle
writeMode: artifact-only
maxRuntimeMs: 120000
redactionRequired: true
```

---

## API surface

Only specific endpoints are allowed:

```text
GET  /api/agent-requests
POST /api/agent-requests
POST /api/agent-requests/:id/submit
POST /api/agent-requests/:id/approve
POST /api/agent-requests/:id/reject
POST /api/agent-requests/:id/enqueue
POST /api/agent-requests/:id/cancel

GET  /api/agent-runs
GET  /api/agent-artifacts
POST /api/agent-artifacts/:id/create-change-request

GET  /api/orchestration/health
POST /api/orchestration/disable
POST /api/orchestration/enable
```

No generic run/command/shell endpoint may exist.

---

## Execution model

Use wrapper-only dispatch:

- resolved wrapper path must be exact-allowlisted
- no shell interpolation
- use structured arguments only
- default sanitized environment
- timeout required
- output size cap required
- redaction required before storage/UI/audit

Initial safe actions:

```text
agent:plan
agent:review
agent:summarize
agent:validate
agent:test-readonly
```

Initial concurrency:

```text
maxConcurrentRuns = 1
maxQueuedRuns = 3
perAgentCooldown = 60s
maxRuntimeMs = 120000
maxOutputBytes = 65536
```

---

## State machine

```text
draft
  ↓ submit
pending_review
  ↓ approve                 ↓ reject
approved                   rejected
  ↓ enqueue
queued
  ↓ dispatch
dispatching
  ↓ wrapper started
running
  ↓ success                 ↓ fail/timeout/cancel
awaiting_human_review       failed/cancelled
  ↓ accept artifact
completed
```

Rules:

- Pending requests cannot dispatch.
- Rejected requests cannot dispatch.
- Completed requests cannot dispatch again.
- Failed requests need a new retry request.
- Agent output cannot directly mutate data.
- Agent artifact → Phase 2 change request → human approval → apply.

---

## Kill switch

Phase 3 must add a kill switch before any real dispatch.

Controls:

```text
STRONGHOLD_AGENT_EXECUTION=disabled
data/agent-execution-disabled.flag
/api/orchestration/disable
```

When active:

- new runs denied
- queued runs cancelled
- owned child process terminated if safe
- audit event emitted
- UI shows kill switch banner

Default state should be disabled until Chris explicitly enables Phase 3 dispatch.

---

## Milestones

### Milestone 0 — Phase 2 baseline

- Run `npm test` and `npm run build`.
- Run `visual-review .`.
- Optional: commit Phase 2 baseline after Chris approval.

### Milestone 1 — Agent request contracts

Files:

```text
shared/agentTypes.ts
server/schemas/agentRequest.ts
server/schemas/agentRun.ts
server/schemas/agentArtifact.ts
```

Tests:

```text
tests/agent-request-schema.test.ts
tests/agent-state-machine.test.ts
```

### Milestone 2 — Queue and audit-only mock dispatcher

Files:

```text
server/services/agentRequestService.ts
server/services/agentQueue.ts
server/services/agentRunLog.ts
server/services/mockAgentDispatcher.ts
```

Tests:

```text
tests/dispatch-mock.test.ts
tests/dispatch-contract.test.ts
tests/dispatch-denial.test.ts
```

Acceptance: mock dispatch works only after approval and is audited.

### Milestone 3 — Sentinel execution policy and kill switch

Files:

```text
server/safety/agentAllowlist.ts
server/safety/executionPolicy.ts
server/safety/rateLimiter.ts
server/safety/killSwitch.ts
```

Tests:

```text
tests/agent-allowlist.test.ts
tests/kill-switch.test.ts
tests/rate-limit.test.ts
tests/denied-operations.test.ts
```

Acceptance: kill switch blocks dispatch; unknown wrapper/action denied.

### Milestone 4 — Artifact review and Phase 2 bridge

Files:

```text
server/services/agentArtifactService.ts
server/routes/agentArtifacts.ts
src/components/AgentArtifactReview.tsx
```

Acceptance: agent artifact can create a Phase 2 change request, but cannot directly apply changes.

### Milestone 5 — Hermes wrapper adapter behind feature flag

Files:

```text
server/adapters/hermesWrapperAdapter.ts
server/services/agentExecutor.ts
```

Default: disabled.

Feature flag:

```text
STRONGHOLD_AGENT_EXECUTION=enabled
```

Acceptance: wrapper-only execution passes tests and still cannot run arbitrary shell commands.

### Milestone 6 — UI orchestration cockpit

Files:

```text
src/components/AgentRequestQueue.tsx
src/components/AgentRunMonitor.tsx
src/components/AgentArtifactReview.tsx
src/components/KillSwitchBanner.tsx
src/api/agentApi.ts
```

Acceptance: UI clearly shows request approval, run status, kill switch, and artifact review.

### Milestone 7 — Final validation

Required commands:

```bash
npm test
npm run build
npm run server:dev
visual-review .
```

Required reports:

- Atlas architecture acceptance
- Sentinel security acceptance
- Pulse QA acceptance
- Vector operations acceptance
- Igris final technical acceptance

---

## Phase 3 acceptance criteria

Phase 3 is accepted only if:

1. Agent requests persist and display in UI.
2. Requests require approval before dispatch.
3. Queue supports one controlled run at a time.
4. Dispatch uses allowlisted wrapper adapter only.
5. Kill switch blocks dispatch.
6. Rate limits and timeout work.
7. No generic command endpoint exists.
8. No arbitrary file writes exist.
9. Output is stored as artifact only.
10. Artifacts cannot directly mutate mission/task files.
11. Artifact promotion creates Phase 2 change request.
12. Every transition is audited.
13. Redaction applies to prompts, outputs, UI, and audit metadata.
14. Forbidden operations are tested and denied.
15. Existing Phase 1 and Phase 2 tests still pass.

---

## Execution gate

Implementation begins only when Chris says:

```text
Igris, execute Phase 3 of Agent-Army Stronghold exactly as planned: controlled agent request queue first, mock dispatcher before real dispatch, wrapper-only execution, kill switch, rate limits, redacted artifacts, no generic command execution, no Hermes profile or cron edits, with Atlas architecture review, Sentinel security review, Pulse testing, and Vector operations validation.
```

Until then, Phase 3 remains planning only.
