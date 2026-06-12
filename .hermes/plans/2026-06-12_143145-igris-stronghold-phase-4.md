# Agent-Army Stronghold Phase 4 Plan — Real Wrapper Dispatch

**Owner:** Igris, Engineering Director  
**Coordinator:** Belion  
**Mode:** Plan-only — no Phase 4 implementation yet  
**Status:** Requires Chris execution gate after Phase 3 review

## Mission

Phase 4 graduates Stronghold from mock agent orchestration to tightly supervised real wrapper dispatch. The goal is to let Stronghold dispatch approved agent requests to reviewed Hermes wrapper entrypoints while preserving the core Stronghold law:

```text
Agent requests create artifacts.
Artifacts may create Phase 2 change requests.
Only approved Phase 2 change requests mutate Stronghold-owned data.
```

Real wrappers may produce plans, reviews, summaries, and risk reports. They may not directly edit files, run arbitrary commands, mutate Hermes profiles, edit cron jobs, or apply their own output.

## Critical warning

Phase 4 must not execute Windows `.bat`, `.cmd`, `.ps1`, shell interpreters, or user-provided command paths directly. Safe dispatch requires a reviewed native launcher/shim and exact allowlisted wrapper paths with `spawn(..., { shell: false })`.

## Phase 4 scope

Included:

1. Real wrapper adapter behind feature flag.
2. Exact wrapper allowlist.
3. Read-only context bundle generation.
4. Structured JSON stdin contract.
5. Supervised process lifecycle.
6. Timeout, cancellation, output caps, and rate limits.
7. Sanitized environment.
8. Redaction across stdout/stderr/artifacts/audit/UI.
9. Artifact-only wrapper output.
10. Fixture wrappers and integration tests before real wrappers.
11. Browser/operator smoke tests for success, failure, timeout, and kill switch.

Excluded:

- Generic `/api/execute`, `/api/command`, `/api/shell`, `/api/git`, `/api/profile`, `/api/cron`.
- Arbitrary shell strings.
- Git push/reset/checkout/merge from UI/API.
- Dependency installs from UI/API.
- Google/Gmail/OAuth/API access.
- Hermes profile/cron/skill/plugin/memory mutation.
- Direct application of wrapper output.

---

## Specialist assignments

- **Igris:** final phase owner and acceptance.
- **Atlas:** real dispatch architecture, context-bundle topology, adapter interface.
- **Sentinel:** wrapper allowlist, environment sanitizer, kill switch, secrets policy.
- **Forge:** backend adapter, supervisor, fixture wrappers, API endpoints.
- **Clix:** dispatch UI, cancellation controls, artifact review refinements.
- **Pulse:** fixture integration tests, failure matrix, smoke validation.
- **Vector:** local process operations, timeout/cancel runbook, port/process checks.
- **Nexus:** wrapper prompt contract and artifact schemas.

---

## Required new files

```text
server/adapters/hermesWrapperAdapter.ts
server/services/agentDispatchSupervisor.ts
server/services/contextBundleService.ts
server/services/wrapperOutputParser.ts
server/safety/wrapperAllowlist.ts
server/safety/environmentSanitizer.ts
server/safety/outputRedactor.ts
server/safety/processSupervisor.ts
server/routes/agentDispatch.ts

tests/fixtures/wrappers/wrapper-success.*
tests/fixtures/wrappers/wrapper-failure.*
tests/fixtures/wrappers/wrapper-timeout.*
tests/fixtures/wrappers/wrapper-secret-leak.*
tests/fixtures/wrappers/wrapper-invalid-json.*
tests/fixtures/wrappers/wrapper-large-output.*

tests/dispatch-real-fixtures.test.ts
tests/dispatch-real-failure.test.ts
tests/dispatch-real-timeout.test.ts
tests/dispatch-real-cancellation.test.ts
tests/dispatch-real-redaction.test.ts
tests/dispatch-real-artifact-only.test.ts
tests/api-real-dispatch.test.ts

src/components/RealDispatchPanel.tsx
src/components/RunCancellationControls.tsx
src/components/WrapperPolicyPanel.tsx
```

---

## Wrapper adapter contract

```ts
type WrapperDispatchInput = {
  requestId: string;
  runId: string;
  targetAgent: string;
  action: 'agent:plan' | 'agent:review' | 'agent:summarize' | 'agent:validate' | 'agent:test-readonly';
  contextBundlePath: string;
  sandboxPolicyId: string;
  timeoutMs: number;
  maxOutputBytes: number;
};

type WrapperDispatchResult = {
  ok: boolean;
  exitCode: number | null;
  status: 'succeeded' | 'failed' | 'timed_out' | 'cancelled';
  artifactContent?: string;
  stdoutPreview?: string;
  stderrPreview?: string;
  redactionApplied: boolean;
  startedAt: string;
  finishedAt: string;
};
```

Rules:

- Input is structured JSON only.
- Use stdin or temp input file; never shell interpolation.
- Use exact allowlisted executable path.
- Use `shell: false`.
- Use sanitized environment.
- Capture stdout/stderr with size caps.
- Redact before persistence.
- Parse output into `AgentArtifact` only.

---

## Feature flags

Default must remain safe/off:

```text
STRONGHOLD_REAL_WRAPPER_ENABLED=0
STRONGHOLD_AGENT_EXECUTION=disabled
```

Real dispatch requires both:

```text
STRONGHOLD_REAL_WRAPPER_ENABLED=1
STRONGHOLD_AGENT_EXECUTION=enabled
```

Kill switch must override both.

---

## Milestones

### Milestone 0 — Phase 3 baseline

Run:

```bash
npm test
npm run build
visual-review .
```

Acceptance:

- Existing 20 test files / 26 tests still pass.
- Chris approves Phase 3 baseline or explicitly waives commit.

### Milestone 1 — Fixture wrapper harness

Implement fixture wrappers only.

Acceptance:

- Success, failure, timeout, invalid JSON, large output, and secret-leak wrappers exist.
- No real Hermes wrapper dispatch yet.

### Milestone 2 — Wrapper allowlist and environment sanitizer

Implement:

- exact wrapper path allowlist
- no `.bat`/`.cmd`/`.ps1` direct execution
- no PATH lookup
- sanitized env only
- denied shell payloads

Acceptance:

- Unknown wrapper denied.
- Shell-like payload denied.
- Secret env not forwarded.

### Milestone 3 — Dispatch supervisor

Implement supervised process lifecycle:

- start
- timeout
- cancellation
- output cap
- status transition
- cleanup
- audit events

Acceptance:

- Timed-out wrapper is terminated.
- Cancelled wrapper is terminated or safely marked terminal.
- No orphan child process remains.

### Milestone 4 — Artifact-only parser

Implement output parser:

- structured wrapper output → redacted `AgentArtifact`
- invalid output → failed run, no artifact
- oversized output → fail/truncate per policy

Acceptance:

- Artifacts require human apply.
- No direct change-request application.

### Milestone 5 — API and UI integration

Add explicit endpoint only:

```text
POST /api/agent-requests/:id/dispatch
```

UI additions:

- real dispatch gated status
- wrapper policy panel
- cancel controls
- run failure/timeout states

Acceptance:

- Non-queued request cannot dispatch.
- Kill switch blocks dispatch.
- UI displays success/failure/timeout safely.

### Milestone 6 — Real wrapper behind flag

Enable one low-risk wrapper/action first:

```text
agent:status.summary → igris
```

Acceptance:

- Disabled by default.
- Works only when feature flags are explicitly enabled.
- Produces artifact only.
- Sentinel and Pulse approve before expanding.

### Milestone 7 — Final validation

Run:

```bash
npm test
npm run build
npm run server:dev
visual-review .
```

Required reports:

- Atlas architecture acceptance.
- Sentinel security acceptance.
- Pulse QA acceptance.
- Vector operations acceptance.
- Igris final technical acceptance.

---

## Phase 4 acceptance criteria

Phase 4 is accepted only if:

1. Existing Phase 1/2/3 tests pass.
2. Fixture wrapper suite passes.
3. Real wrapper is disabled by default.
4. Unknown wrappers are denied.
5. Wrapper execution uses `shell:false`.
6. Environment is sanitized.
7. Kill switch blocks dispatch.
8. Rate limits block excess dispatch.
9. Timeout terminates process.
10. Cancellation reaches safe terminal state.
11. Output caps prevent unbounded logs/artifacts.
12. Secret-like output is redacted before persistence/UI/audit.
13. Wrapper output becomes artifact only.
14. Artifact promotion creates Phase 2 change request only.
15. No generic command/shell endpoint exists.
16. Browser smoke covers success, failure, timeout, and kill switch.

---

## Execution gate

Implementation begins only when Chris says:

```text
Igris, execute Phase 4 of Agent-Army Stronghold exactly as planned: real wrapper dispatch behind feature flags, fixture wrappers first, exact wrapper allowlist, shell:false execution, sanitized environment, kill switch, rate limits, timeouts, cancellation, redacted artifact-only output, no generic command execution, and full Atlas/Sentinel/Pulse/Vector validation.
```

Until then, Phase 4 remains planning only.
