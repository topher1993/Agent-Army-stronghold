# Phase 3 Operations

Owner: Vector  
Status: Verified locally

## Run backend

```bash
cd /c/Users/tophe/agent-army-stronghold
npm run server:dev
```

Backend health:

```bash
curl -s http://127.0.0.1:5175/api/orchestration/health
```

Expected:

```json
{"ok":true,"phase":3,"host":"127.0.0.1","dispatchGate":"approval-required","killSwitch":"inactive"}
```

## Run frontend

```bash
npm run dev
```

Or production preview:

```bash
npm run build
npm run preview
```

## Smoke test request lifecycle

```bash
curl -s -X POST http://127.0.0.1:5175/api/agent-requests \
  -H 'content-type: application/json' \
  -d '{"kind":"mission.plan","title":"Smoke request","prompt":"Summarize current Stronghold status","requestedBy":"Chris","targetAgent":"igris"}'
```

Then approve, enqueue, and mock-dispatch via the explicit agent request endpoints. No generic command endpoint exists. Division targets are labels for roster ownership/routing visibility only; selecting a specialist name does not invoke that specialist's wrapper.

## Kill switch

```bash
curl -s -X POST http://127.0.0.1:5175/api/orchestration/disable
curl -s -X POST http://127.0.0.1:5175/api/orchestration/enable
```

Phase 3 defaults to mock dispatch only. Engineering Division artifacts record `divisionExecutionMode: "mock-label-only"`, `wrapper: "mock"`, and `behavior: "shared-mock-dispatcher"` to prevent accidental assumptions that division labels have real execution behavior.
