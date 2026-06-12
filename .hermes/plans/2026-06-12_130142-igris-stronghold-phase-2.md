# Agent-Army Stronghold Phase 2 Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Owner:** Igris, Engineering Director  
**Coordinator:** Belion  
**Mode:** Plan-only — no implementation in this turn  
**Goal:** Add safe, gated mission/task management to the Stronghold while preserving Phase 1 safety guarantees.

**Architecture:** Phase 2 introduces a localhost-only backend boundary for validated, audited, allowlisted writes to Stronghold-owned data files only. The browser may propose mission/task changes, but a backend must validate, authorize, audit, and persist them. No arbitrary command execution, Hermes profile mutation, cron mutation, secret access, Google API access, or agent execution is allowed in Phase 2.

**Tech Stack:** React + TypeScript + Vite, Node.js TypeScript local backend, Vitest, file-backed JSON/JSONL storage, localhost-only runtime.

---

## Phase 2 Scope

### Included

1. Local backend boundary for Stronghold-owned data only.
2. Mission/task creation and updates.
3. Request/approval workflow.
4. Append-only audit log.
5. Shared schema validation.
6. Shared redaction/safety utilities.
7. UI proposal/review/apply flow.
8. Regression tests proving Phase 1 safety remains intact.
9. Documentation for architecture, security, operations, and QA.

### Explicit non-goals

Phase 2 does **not** include:

- Browser command execution.
- Agent execution from UI.
- Hermes profile edits.
- Cron edits.
- Skill/plugin/memory mutation.
- Git operations from UI/API.
- Package install/update from UI/API.
- Google/Gmail/Calendar/OAuth/API access.
- Internet deployment.
- Multi-user/public authentication.
- Arbitrary filesystem writes.

---

## Phase 2 Safety Law

The only approved write targets for Phase 2 are:

```text
data/missions.json
data/tasks.json
data/change-requests.json
data/audit-log.jsonl
public/data/stronghold-snapshot.json
```

Rules:

- `public/data/stronghold-snapshot.json` may be written only by the existing approved snapshot generator path.
- `data/audit-log.jsonl` is append-only from the application perspective.
- All other file writes are denied by default.
- If audit logging fails, the protected write fails closed.
- Every denied write attempt must still produce an audit event when possible.

---

## Specialist Assignments

- **Igris:** final plan owner, acceptance, sequencing, technical review.
- **Atlas:** Phase 2 architecture doc, data contracts, backend boundary review.
- **Sentinel:** threat model, guardrails, path locks, secret redaction review.
- **Forge:** backend, validation, file persistence, audit writer, snapshot integration.
- **Clix:** UI proposal/review/apply flows, mission/task controls, safety indicators.
- **Pulse:** tests, regression suite, UI workflow validation, final QA report.
- **Vector:** local operations guide, run scripts, localhost checks, troubleshooting.
- **Nexus:** documentation index and Phase 3 backlog notes.

---

## Proposed Project Shape

Add these directories/files:

```text
server/
  index.ts
  config.ts
  routes/
    health.ts
    snapshot.ts
    missions.ts
    tasks.ts
    changeRequests.ts
    audit.ts
  services/
    storage.ts
    auditLog.ts
    approvalWorkflow.ts
    snapshotBridge.ts
  safety/
    pathGuard.ts
    redaction.ts
    capabilities.ts
    requestGuards.ts
  schemas/
    mission.ts
    task.ts
    changeRequest.ts
    auditEvent.ts

src/
  api/
    strongholdApi.ts
  components/
    MissionEditor.tsx
    TaskEditor.tsx
    ApprovalQueue.tsx
    AuditTrail.tsx
    SafetyBoundary.tsx
  state/
    missionWorkflow.ts

shared/
  types.ts
  constants.ts

data/
  tasks.json
  change-requests.json
  audit-log.jsonl

tests/
  phase1-regression.test.ts
  path-guard.test.ts
  redaction.test.ts
  write-gate.test.ts
  approval-workflow.test.ts
  audit-log.test.ts
  mission-edit.test.ts
  task-edit.test.ts
  api-localhost.test.ts
  ui-approval.test.tsx

docs/
  phase-2-architecture.md
  phase-2-security.md
  phase-2-operations.md
  phase-2-qa.md
```

Modify likely files:

```text
package.json
vite.config.ts
src/types.ts or shared/types.ts
src/App.tsx
src/data.ts
scripts/generate-snapshot.mjs
README.md
docs/architecture.md
docs/security.md
docs/operations.md
data/missions.json
```

---

## Data Contracts

### Mission status and priority

```ts
export type MissionStatus =
  | 'planned'
  | 'active'
  | 'blocked'
  | 'review'
  | 'complete'
  | 'cancelled';

export type MissionPriority = 'low' | 'medium' | 'high' | 'critical';
```

### Mission

```ts
export type Mission = {
  id: string;
  title: string;
  owner: string;
  status: MissionStatus;
  priority: MissionPriority;
  summary: string;
  specialists: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
};
```

### Task

```ts
export type TaskStatus =
  | 'todo'
  | 'active'
  | 'blocked'
  | 'review'
  | 'done'
  | 'cancelled';

export type Task = {
  id: string;
  missionId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  owner?: string;
  specialists: string[];
  priority: MissionPriority;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  dueAt?: string;
  blockedReason?: string;
};
```

### Change request

```ts
export type ChangeRequestStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'applied';

export type ChangeRequestKind =
  | 'mission.create'
  | 'mission.update'
  | 'task.create'
  | 'task.update'
  | 'assignment.update';

export type ChangeRequest = {
  id: string;
  kind: ChangeRequestKind;
  status: ChangeRequestStatus;
  title: string;
  rationale: string;
  requestedBy: string;
  reviewers: string[];
  payload: unknown;
  validationSummary: ValidationResult;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
};
```

### Audit event

```ts
export type AuditOutcome =
  | 'requested'
  | 'validated'
  | 'approved'
  | 'rejected'
  | 'applied'
  | 'denied'
  | 'failed';

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  capability: string;
  action: string;
  targetType: 'mission' | 'task' | 'changeRequest' | 'system';
  targetId?: string;
  targetPath?: string;
  outcome: AuditOutcome;
  reason?: string;
  requestId?: string;
  policyVersion: string;
  beforeHash?: string;
  afterHash?: string;
  redactionApplied: boolean;
  metadata?: Record<string, string | number | boolean | null>;
};
```

---

## API Surface

Backend must bind to `127.0.0.1` only.

```text
GET  /api/health
GET  /api/snapshot
GET  /api/missions
POST /api/missions/propose
GET  /api/tasks?missionId=:id
POST /api/tasks/propose
GET  /api/change-requests
POST /api/change-requests/:id/approve
POST /api/change-requests/:id/reject
POST /api/change-requests/:id/apply
GET  /api/audit
```

No generic endpoint such as these may exist:

```text
POST /api/write
POST /api/command
POST /api/execute
POST /api/profile
POST /api/cron
POST /api/git
```

---

# Milestone 0 — Baseline Commit and Phase 2 Gate

**Objective:** Lock Phase 1 as a known-good baseline before changing architecture.

**Files:**
- Review: all current Phase 1 files
- Optional commit: entire current repo except ignored artifacts

**Steps:**

1. Run:
   ```bash
   cd /c/Users/tophe/agent-army-stronghold
   npm test
   npm run build
   git status --short
   ```
2. Confirm Phase 1 still passes.
3. Chris visually reviews in VS Code using:
   ```bash
   visual-review .
   ```
4. If Chris approves, create baseline commit:
   ```bash
   git add .
   git commit -m "chore: baseline stronghold phase 1"
   ```

**Acceptance:** Phase 1 baseline exists or Chris explicitly waives baseline commit.

---

# Milestone 1 — Atlas/Sentinel Architecture and Security Docs

**Objective:** Document Phase 2 boundary before code changes.

**Files:**
- Create: `docs/phase-2-architecture.md`
- Create: `docs/phase-2-security.md`
- Modify: `docs/architecture.md`
- Modify: `docs/security.md`

**Steps:**

1. Write `docs/phase-2-architecture.md` describing:
   - backend boundary
   - API surface
   - storage files
   - approval workflow
   - snapshot fallback
2. Write `docs/phase-2-security.md` describing:
   - allowed write paths
   - denied operations
   - path traversal protections
   - approval gate
   - audit log requirements
   - localhost-only rules
3. Update Phase 1 docs to link to Phase 2 docs.
4. Run docs/grep safety check:
   ```bash
   grep -R "command\|execute\|cron\|profile" docs -n
   ```
   Expected: only non-goal/denied-operation references.

**Acceptance:** Atlas and Sentinel agree no ambiguous write boundary remains.

---

# Milestone 2 — Shared Types and Schemas

**Objective:** Move from UI-only types to shared contracts used by frontend and backend.

**Files:**
- Create: `shared/types.ts`
- Create: `shared/constants.ts`
- Create: `server/schemas/mission.ts`
- Create: `server/schemas/task.ts`
- Create: `server/schemas/changeRequest.ts`
- Create: `server/schemas/auditEvent.ts`
- Modify: `src/types.ts`
- Test: `tests/schema.test.ts`

**Steps:**

1. Add shared status/priority constants.
2. Add mission/task/change request/audit event types.
3. Add runtime validators using plain TypeScript functions first; avoid adding dependencies unless needed.
4. Write tests for valid/invalid mission data.
5. Write tests for invalid enum values, duplicate IDs, empty title, unknown specialists, and oversized fields.

**Verification:**

```bash
npm test -- tests/schema.test.ts
npm run build
```

**Acceptance:** Bad mission/task data cannot enter Phase 2 storage through validators.

---

# Milestone 3 — Sentinel Safety Utilities

**Objective:** Build reusable safety primitives before write-capable routes.

**Files:**
- Create: `server/safety/pathGuard.ts`
- Create: `server/safety/redaction.ts`
- Create: `server/safety/capabilities.ts`
- Create: `server/safety/requestGuards.ts`
- Test: `tests/path-guard.test.ts`
- Test: `tests/redaction.test.ts`
- Test: `tests/write-gate.test.ts`

**Required behavior:**

- Allow only exact approved repo-local target files.
- Deny `..`, symlinks/junction escapes, absolute paths outside repo, UNC paths, drive changes, secret-like paths.
- Redact sensitive object keys and string values.
- Default deny unknown capabilities.

**Verification:**

```bash
npm test -- tests/path-guard.test.ts tests/redaction.test.ts tests/write-gate.test.ts
```

**Acceptance:** Sentinel path and redaction tests pass before backend writes exist.

---

# Milestone 4 — Forge Backend Skeleton

**Objective:** Add localhost-only backend with read endpoints first.

**Files:**
- Create: `server/index.ts`
- Create: `server/config.ts`
- Create: `server/routes/health.ts`
- Create: `server/routes/snapshot.ts`
- Create: `server/routes/missions.ts`
- Create: `server/routes/tasks.ts`
- Modify: `package.json`
- Test: `tests/api-localhost.test.ts`

**Package scripts to add:**

```json
{
  "server:dev": "tsx server/index.ts",
  "dev:full": "npm run snapshot && concurrently \"npm run server:dev\" \"vite --host 127.0.0.1 --port 5174\""
}
```

If adding dependencies, prefer:

```bash
npm install express zod
npm install -D tsx supertest @types/express @types/supertest concurrently
```

**Acceptance:**

- Server binds to `127.0.0.1` only.
- `GET /api/health` returns healthy.
- Read endpoints work.
- No write endpoints are enabled yet.

---

# Milestone 5 — Forge Storage and Audit Services

**Objective:** Create safe file-backed persistence and append-only audit logging.

**Files:**
- Create: `server/services/storage.ts`
- Create: `server/services/auditLog.ts`
- Create: `data/tasks.json`
- Create: `data/change-requests.json`
- Create: `data/audit-log.jsonl`
- Test: `tests/audit-log.test.ts`

**Storage rules:**

- Atomic JSON writes: temp file → validate → rename.
- Audit append must happen for proposal, denial, approval, rejection, apply, and failure.
- Audit payloads must be redacted.
- If audit append fails, protected write fails closed.

**Verification:**

```bash
npm test -- tests/audit-log.test.ts
```

**Acceptance:** Audit log proves every write attempt path is observable and secret-safe.

---

# Milestone 6 — Approval Workflow Engine

**Objective:** Implement request lifecycle before mission/task mutation.

**Files:**
- Create: `server/services/approvalWorkflow.ts`
- Create: `server/routes/changeRequests.ts`
- Test: `tests/approval-workflow.test.ts`

**Workflow:**

```text
draft/requested → pending_review → approved → applied
                              ↘ rejected
                              ↘ cancelled
```

**Rules:**

- Proposed edits do not mutate mission/task files.
- Rejected/cancelled requests leave source data unchanged.
- Stale approvals cannot be replayed.
- Changed proposal payload invalidates prior approval.
- Double-submit cannot duplicate writes.

**Verification:**

```bash
npm test -- tests/approval-workflow.test.ts
```

**Acceptance:** No direct edit bypass exists.

---

# Milestone 7 — Mission and Task Write MVP

**Objective:** Add the first safe write capability for Stronghold-owned mission/task files.

**Files:**
- Modify: `server/routes/missions.ts`
- Modify: `server/routes/tasks.ts`
- Modify: `server/services/storage.ts`
- Test: `tests/mission-edit.test.ts`
- Test: `tests/task-edit.test.ts`
- Modify: `data/missions.json`
- Modify: `data/tasks.json`

**Allowed operations:**

- Propose mission create/update.
- Propose task create/update.
- Approve/reject proposal.
- Apply approved proposal.

**Denied operations:**

- Any direct write without approval.
- Invalid status/priority.
- Duplicate ID.
- Unknown mission ID for task.
- Secret-shaped content.
- Path escape.

**Verification:**

```bash
npm test -- tests/mission-edit.test.ts tests/task-edit.test.ts tests/approval-workflow.test.ts tests/audit-log.test.ts
```

**Acceptance:** Approved mission/task writes work; denied writes fail closed and are audited.

---

# Milestone 8 — Clix UI Proposal and Approval Flow

**Objective:** Add operator-safe UI controls that propose changes rather than silently writing.

**Files:**
- Create: `src/api/strongholdApi.ts`
- Create: `src/components/MissionEditor.tsx`
- Create: `src/components/TaskEditor.tsx`
- Create: `src/components/ApprovalQueue.tsx`
- Create: `src/components/AuditTrail.tsx`
- Create: `src/components/SafetyBoundary.tsx`
- Create: `src/state/missionWorkflow.ts`
- Modify: `src/App.tsx`
- Test: `tests/ui-approval.test.tsx`
- Modify: `tests/app.test.tsx`

**UI rules:**

- Default state still clearly says guarded/local mode.
- No buttons labelled “run”, “execute”, “modify cron”, or “edit profile”.
- Use language like “Propose”, “Review”, “Approve”, “Reject”, “Apply approved change”.
- Approval reason/confirmation required before apply.
- Audit trail visible after action.

**Verification:**

```bash
npm test -- tests/app.test.tsx tests/ui-approval.test.tsx
```

**Acceptance:** User cannot mutate from one accidental click; UI clearly shows proposal and approval state.

---

# Milestone 9 — Snapshot/API Integration

**Objective:** Keep the Phase 1 snapshot working while Phase 2 backend adds live state.

**Files:**
- Create: `server/services/snapshotBridge.ts`
- Modify: `scripts/generate-snapshot.mjs`
- Modify: `src/data.ts`
- Modify: `src/api/strongholdApi.ts`
- Test: `tests/phase1-regression.test.ts`

**Rules:**

- If backend is unavailable, dashboard can still render static snapshot.
- If backend is available, dashboard can fetch `/api/snapshot`.
- Snapshot regeneration still writes only approved path.
- Cron bodies, prompts, scripts, outputs remain redacted.

**Verification:**

```bash
npm test -- tests/phase1-regression.test.ts tests/snapshot.test.ts
npm run build
```

**Acceptance:** Phase 1 read-only fallback remains intact.

---

# Milestone 10 — Pulse/Sentinel/Vector Final Hardening

**Objective:** Verify Phase 2 is safe, tested, and operable.

**Files:**
- Create: `docs/phase-2-qa.md`
- Create: `docs/reviews/phase-2-validation.md`
- Modify: `docs/phase-2-operations.md`
- Modify: `README.md`

**Commands:**

```bash
npm test
npm run build
npm run server:dev
curl -I --max-time 5 http://127.0.0.1:<backend-port>/api/health
visual-review .
```

**Required reports:**

- Atlas final architecture acceptance.
- Sentinel final security acceptance.
- Pulse final QA report.
- Vector operations verification.
- Igris final technical acceptance.

**Acceptance:** Chris can review Phase 2 in VS Code with a generated `visual-review` artifact.

---

## Required Tests Before Phase 2 Acceptance

Phase 2 is not accepted unless all pass:

```bash
npm test
npm run build
```

Required coverage:

- Phase 1 regression tests.
- Path guard tests.
- Redaction tests.
- Write gate tests.
- Approval workflow tests.
- Audit log tests.
- Mission edit tests.
- Task edit tests.
- API localhost tests.
- UI approval tests.

---

## Risks and Mitigations

1. **Scope creep into agent execution**  
   Mitigation: Phase 2 only creates mission/task requests and audit trails. Agent execution remains Phase 3+.

2. **Unsafe write paths**  
   Mitigation: pathGuard exact allowlist, symlink/drive/UNC denial, tests.

3. **Secrets in user-provided fields**  
   Mitigation: shared redaction, value/key/path scanning, audit redaction tests.

4. **Audit bypass**  
   Mitigation: storage service requires audit event before protected write; fail closed.

5. **UI accidental mutation**  
   Mitigation: proposal → approval → apply workflow, no single-click writes.

6. **Backend accidentally binds publicly**  
   Mitigation: config hardcodes `127.0.0.1`; API tests verify localhost binding.

7. **Phase 1 fallback breakage**  
   Mitigation: phase1-regression tests and static snapshot fallback.

---

## Open Questions for Chris Before Execution

1. Should Phase 2 include only **mission/task edits**, or also **agent request queue records**?
2. Should approval require just Chris, or Chris + Igris/Sentinel labels in the record?
3. Should the backend use a new port such as `127.0.0.1:5175`, or share Vite through a proxy?
4. Should Phase 2 baseline commit Phase 1 first before implementation begins?

Igris recommendation:

- Baseline commit Phase 1 first.
- Start Phase 2 with mission/task edits only.
- Add request queue records as Phase 2.5.
- Do not add agent execution until Phase 3 with separate Sentinel review.

---

## Execution Gate

Implementation begins only when Chris says:

```text
Igris, execute Phase 2 of Agent-Army Stronghold exactly as planned: mission/task management first, gated approvals, append-only audit log, localhost-only backend, no command execution, no Hermes profile or cron edits, with Atlas architecture review, Sentinel security review, Pulse testing, and Vector operations validation.
```

Until then, this remains planning only.
