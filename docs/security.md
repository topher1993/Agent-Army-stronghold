# Security Review — Phase 1

## Sentinel rules

- Dashboard UI exposes no mutation controls.
- Browser has no command execution path.
- Snapshot generator denies secret-like files and directories.
- Snapshot output is anchored to this repository's `public/data/stronghold-snapshot.json` even when the script is invoked from another working directory.
- Cron prompts/scripts/output bodies are not included.
- OAuth, token, cookie, key, `.env`, and credential paths are denied.
- Google APIs are not called.
- Vite dev and preview bind to `127.0.0.1`.

## Denylist markers

Paths or keys containing these markers are treated as sensitive and skipped/redacted:

```text
.env, secret, token, oauth, credential, credentials, cookie, key, api_key,
password, auth, session, refresh, access, client_secret
```

## Acceptance

Phase 1 is acceptable only while it remains read-only observability. Future write controls require separate Phase 2 approval.
