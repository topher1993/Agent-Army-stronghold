# Phase 2 Security

Owner: Sentinel  
Status: Implemented MVP guardrails

## Guardrails implemented

- Local API binds to `127.0.0.1` only.
- CORS allows the local dashboard origin only.
- No generic command/write endpoint exists.
- Path guard permits only exact Stronghold-owned files.
- Sensitive paths and values are denied/redacted.
- Approval workflow separates proposal, approval/rejection, and apply states.
- Audit events redact metadata before append.
- Phase 1 static snapshot fallback remains available.

## Denied operations

These remain forbidden in Phase 2:

```text
/api/command
/api/execute
/api/profile
/api/cron
/api/git
```

Also forbidden:

- Shell process execution from browser/API.
- External network control endpoints.
- OAuth/token/secret reads.
- Writes outside the approved Stronghold data files.
- Cron/profile/skill/plugin/memory mutation.

## Test evidence

Security tests added:

- `tests/path-guard.test.ts`
- `tests/redaction.test.ts`
- `tests/write-gate.test.ts` planned in Phase 2 expansion; current denial is covered by path/API tests.
- `tests/api-localhost.test.ts`
- `tests/phase1-regression.test.ts`
- `tests/audit-log.test.ts`

Full suite result during validation:

```text
Test Files  12 passed
Tests       18 passed
```
