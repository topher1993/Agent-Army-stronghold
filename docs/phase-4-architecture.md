# Phase 4 Architecture Proposal

Owner: Atlas  
Status: Proposed planning only  
Predecessor: Phase 3 controlled mock orchestration

## Decision

Phase 4 should introduce real Hermes wrapper dispatch as a supervised, artifact-only execution path. The existing Phase 3 law remains unchanged: agent requests create artifacts; artifacts may create Phase 2 change requests; only approved Phase 2 change requests mutate Stronghold-owned data.

Phase 4 must not add generic command execution, direct file mutation by agents, automatic patch apply, Hermes profile mutation, cron mutation, plugin mutation, skill mutation, memory mutation, or unrestricted shell access.

## Phase 4 core law

```text
Approved request + approved context bundle
  -> supervised Hermes wrapper adapter
  -> bounded stdout/stderr capture
  -> normalized redacted artifact
  -> human review
  -> optional Phase 2 change request
  -> explicit Phase 2 approval/apply only
```

No agent run may directly write to repository files, Stronghold data files, Hermes profiles, Git state, or the operator environment.

## Target architecture

```text
React Stronghold UI
  -> localhost Stronghold API
  -> request validation / allowlist / rate limit / kill switch
  -> context bundle builder
  -> dispatch supervisor
  -> Hermes wrapper adapter using spawn(..., shell:false)
  -> bounded run capture and redaction
  -> artifact store + run log + audit log
  -> artifact review UI
  -> optional Phase 2 change request bridge
```

## New Phase 4 components

### 1. Hermes wrapper adapter

Introduce a dedicated adapter module, not a generic execution endpoint.

Suggested module:

```text
server/services/hermesWrapperAdapter.ts
```

Responsibilities:

- Resolve an exact Hermes wrapper executable path from configuration.
- Refuse relative wrapper paths, PATH lookup, user-provided commands, shell strings, and interpolated arguments.
- Start the wrapper with `spawn(wrapperPath, fixedArgs, { shell: false })` only.
- Provide a sanitized environment allowlist.
- Set a fixed working directory that is not writable by the wrapper for source/data mutation.
- Send a single structured request payload through stdin or a temporary read-only context path.
- Enforce timeout, stdout cap, stderr cap, and total output cap.
- Capture exit code, signal, duration, input hash, output hash, and redaction status.
- Return normalized run results to the dispatcher; never return raw process authority to routes or UI.

Non-responsibilities:

- No arbitrary command invocation.
- No git operations.
- No direct writes to Stronghold-owned files.
- No mutation of `~/.hermes` profiles, skills, plugins, cron, or memories.
- No network policy bypass.

### 2. Dispatch supervisor

Introduce a supervisor that owns lifecycle transitions and guardrail enforcement.

Suggested module:

```text
server/services/agentDispatchSupervisor.ts
```

Responsibilities:

- Accept only queued, approved requests.
- Re-check kill switch immediately before dispatch.
- Re-check target agent/action allowlists immediately before dispatch.
- Bind request to a sandbox policy and context bundle id.
- Mark run states: queued -> running -> succeeded/failed/timed_out/cancelled.
- Run either mock adapter or Hermes adapter behind an explicit feature flag.
- Record audit events for dispatch accepted, dispatch denied, run started, run completed, run failed, timeout, cancellation, and artifact emitted.
- Ensure failures produce run records and safe failure reasons.

### 3. Sandboxed context bundles

Real dispatch should receive only approved, materialized context bundles, never broad filesystem access.

Suggested modules/data:

```text
server/services/contextBundleService.ts
data/context-bundles.json
data/context-bundles/<bundle-id>/manifest.json
data/context-bundles/<bundle-id>/payload.json
```

A context bundle should contain:

- Bundle id and schema version.
- Request id and mission/task references.
- Allowed input refs copied from the approved request.
- Snapshot excerpts, mission excerpts, task excerpts, or prior artifact excerpts only from approved kinds.
- Redaction report and input byte count.
- SHA-256 hashes for manifest and payload.
- Expiry timestamp.

Bundle rules:

- Immutable after creation.
- Size-limited by `SandboxPolicy.maxInputBytes`.
- Redacted before dispatch.
- Built from exact allowlisted Stronghold data sources.
- No direct source tree globbing.
- No secrets, environment dumps, profile files, credentials, tokens, or local shell history.
- Wrapper receives bundle content or read-only bundle path only.

### 4. Artifact-only output contract

The Hermes adapter should normalize all successful and failed wrapper output into artifacts.

Suggested artifact extensions:

```text
AgentArtifact.sourceWrapper: 'mock' | 'hermes'
AgentArtifact.contentType: 'markdown' | 'json'
AgentArtifact.inputBundleId: string
AgentArtifact.outputHash: string
AgentArtifact.rawOutputStored: false | 'redacted-only'
AgentArtifact.applyMode: 'never-direct'
AgentArtifact.reviewStatus: 'pending' | 'promoted' | 'rejected'
```

Output rules:

- stdout/stderr are capped before storage.
- output is redacted before artifact creation.
- expected output schema is validated when declared.
- invalid schema creates a failed run plus diagnostic artifact, not an applied change.
- patch-like output is stored as a `patch-proposal` artifact only.
- artifact promotion creates a Phase 2 change request payload only.
- no wrapper output may call `applyApprovedChangeRequest` or write data directly.

### 5. No direct apply boundary

Phase 4 must preserve the Phase 2 write gate.

Allowed:

- Create agent request.
- Approve/reject request.
- Enqueue approved request.
- Build approved context bundle.
- Dispatch via supervised adapter.
- Store run and artifact records.
- Promote artifact to Phase 2 change request.
- Human approve and apply Phase 2 change request.

Denied:

- Dispatch endpoint that accepts arbitrary command text.
- Agent output directly mutating `data/*.json`.
- Agent output directly modifying `src`, `server`, `docs`, `.hermes`, Git, cron, skills, plugins, memories, or user home files.
- Auto-apply of patch proposals.
- Wrapper-controlled filesystem destination paths.

## Operational topology

### Local single-operator default

```text
Stronghold API on 127.0.0.1:5175
  -> local dispatch supervisor
  -> local Hermes wrapper adapter
  -> artifact store under project data directory
```

Use this for early Phase 4 implementation. Keep mock dispatch available and make Hermes dispatch opt-in.

Recommended feature flags/config:

```text
STRONGHOLD_AGENT_DISPATCH_MODE=mock|hermes-disabled|hermes
STRONGHOLD_HERMES_WRAPPER_PATH=<absolute allowlisted path>
STRONGHOLD_HERMES_MAX_RUNTIME_MS=120000
STRONGHOLD_HERMES_MAX_OUTPUT_BYTES=65536
STRONGHOLD_HERMES_NETWORK=none|allowlisted
```

Default should be `hermes-disabled` or `mock` until Sentinel approves the wrapper path and runtime policy.

### Split supervisor/worker future topology

```text
Stronghold API
  -> append-only dispatch queue
  -> local worker process
  -> Hermes wrapper adapter
  -> run/artifact store
  -> Stronghold API read/review surface
```

This can reduce UI/API blocking and make cancellation/timeout handling cleaner. It should still use the same request, bundle, run, artifact, and audit contracts.

### Hardening topology

For higher-risk execution, add OS-level isolation outside the TypeScript adapter:

- Dedicated low-privilege OS user.
- Separate working directory with no write access to repository source or Stronghold data except an artifact drop directory controlled by Stronghold.
- Network disabled by default; allowlisted only through policy.
- Process tree termination on timeout/cancel.
- Per-run temp directory removed after capture.
- Optional container or VM boundary if Hermes wrapper behavior cannot be fully constrained by process policy.

## API shape

Do not add `/api/execute` or equivalent.

Suggested routes:

```text
POST /api/agent-requests/:id/build-context-bundle
POST /api/agent-requests/:id/dispatch-hermes
POST /api/agent-runs/:id/cancel
GET  /api/context-bundles/:id
GET  /api/orchestration/health
```

Route requirements:

- All write-like routes require localhost, valid request state, rate limit, and kill switch checks.
- `dispatch-hermes` requires explicit feature flag enabled.
- `dispatch-hermes` accepts no command string, no wrapper path, no env, and no arbitrary args from the request body.
- Cancellation updates Stronghold records and terminates only the supervised run process tree.

## Data model additions

Suggested additions while preserving Phase 3 records:

```text
data/context-bundles.json
data/context-bundles/<bundle-id>/manifest.json
data/context-bundles/<bundle-id>/payload.json
data/agent-runs.jsonl
data/agent-artifacts.json
data/audit-log.jsonl
```

Add or derive these fields:

- `AgentRun.wrapperConfigHash`
- `AgentRun.contextBundleId`
- `AgentRun.exitCode`
- `AgentRun.signal`
- `AgentRun.stderrHash`
- `AgentRun.outputTruncated`
- `AgentRun.redactionApplied`
- `AgentRun.policyId`
- `AgentRun.denialReason`

## Security invariants

- Wrapper path is configured by operator and checked against an exact allowlist.
- No shell invocation; `shell:false` is mandatory.
- No PATH resolution for executable discovery.
- Arguments are fixed by adapter code, not user input.
- Environment is allowlisted and scrubbed.
- stdin/context payload is bounded and hashed.
- stdout/stderr are bounded, redacted, and hashed.
- Kill switch is checked before queueing and immediately before spawn.
- Rate limit applies to request creation, enqueue, bundle build, and dispatch.
- Every dispatch decision writes an audit event.
- Direct apply remains impossible from the agent path.

## Implementation sequence

1. Add Phase 4 contracts for context bundles, wrapper config, adapter result, and extended run/artifact metadata.
2. Add context bundle builder with tests for allowlisted inputs, redaction, size caps, immutability, and path denial.
3. Add Hermes wrapper adapter behind a disabled-by-default feature flag with tests using a local fixture executable/script.
4. Add dispatch supervisor to replace direct route-to-mock coupling.
5. Add `dispatch-hermes` route with no command-bearing request body.
6. Extend UI to show bundle id, wrapper mode, output truncation, redaction, and review status.
7. Add cancellation and timeout tests.
8. Add Sentinel review before enabling real wrapper mode by default.

## Acceptance criteria

- Existing Phase 3 mock orchestration still passes.
- Hermes dispatch is impossible unless feature flag and wrapper path are configured.
- Requests with shell-like payloads, unknown agents, unknown actions, oversized context, or denied input refs are rejected.
- Adapter uses `spawn(..., shell:false)` and exact path allowlist.
- Run timeout and output caps are enforced and tested.
- Context bundle hashes and output hashes are recorded.
- Successful Hermes output creates artifacts only.
- Patch-like output cannot apply directly.
- Artifact promotion still creates Phase 2 change requests only.
- `/api/execute` and generic command/write endpoints remain absent.

## Open questions for Sentinel and Vector

- Which exact Hermes wrapper binary/path should be allowlisted on Windows and other supported hosts?
- Should Phase 4 use stdin-only bundles first, or read-only bundle directories from the start?
- What is the minimum sanitized environment Hermes needs to run reliably?
- Is OS-user isolation required for initial local Phase 4, or can it be a Phase 4 hardening milestone?
- What network posture does real Hermes wrapper dispatch require, if any?
