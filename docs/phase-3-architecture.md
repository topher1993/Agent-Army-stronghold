# Phase 3 Architecture

Owner: Igris  
Status: Implemented MVP

## Decision

Phase 3 adds controlled agent request orchestration without arbitrary command execution. Agent requests are persisted, approved, queued, dispatched through a mock dispatcher, and converted into redacted artifacts. Artifacts may be promoted into Phase 2 change requests, but they do not directly mutate Stronghold data.

Engineering Division names are roster/ownership labels in this phase, not behaviorally distinct executors. The selected target is persisted for routing visibility and artifact metadata only; Atlas, Clix, Forge, Pulse, Sentinel, Vector, Nexus, and Igris all use the same shared mock dispatcher.

## Core law

```text
Agent requests create artifacts.
Artifacts may create Phase 2 change requests.
Only approved Phase 2 change requests mutate Stronghold-owned data.
```

## Implemented modules

- `shared/agentTypes.ts` — request/run/artifact/sandbox contracts.
- `server/schemas/agentRequest.ts` — safe request validation.
- `server/safety/agentAllowlist.ts` — approved agents/actions only.
- `server/safety/executionPolicy.ts` — shell-like payload denial and sandbox defaults.
- `server/safety/killSwitch.ts` — dispatch kill switch primitive.
- `server/safety/rateLimiter.ts` — per-actor limiter primitive.
- `server/services/agentRequestService.ts` — create/approve/reject/enqueue request lifecycle.
- `server/services/mockAgentDispatcher.ts` — mock dispatch only; no real wrapper execution yet.
- `shared/divisions.ts` — Engineering Division roster labels and `mock-label-only` execution metadata.
- `server/services/agentArtifactService.ts` — artifact to Phase 2 change request bridge.
- `src/components/AgentOrchestration.tsx` — Phase 3 dashboard panel.

## Data files

```text
data/agent-requests.json
data/agent-runs.json
data/agent-artifacts.json
data/agent-runs.jsonl
data/audit-log.jsonl
```

## Phase 3 MVP boundary

The current implementation uses a mock dispatcher. Real Hermes wrapper dispatch remains future work behind a feature flag and Sentinel review. Division target selection must remain `mock-label-only` until that future review explicitly approves real dispatch.
