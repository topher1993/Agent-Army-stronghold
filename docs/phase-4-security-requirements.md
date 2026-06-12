# Phase 4 Security Requirements: Real Wrapper Dispatch

Owner: Sentinel  
Status: Planning proposal only  
Scope: Requirements that must be satisfied before replacing Phase 3 mock-only dispatch with real Hermes wrapper execution.

## Non-negotiable security posture

Phase 4 may enable real wrapper dispatch only for approved agent requests. It must not introduce a generic command runner, shell endpoint, cron/profile/plugin/skill editor, filesystem write primitive, secrets endpoint, or arbitrary process execution path.

Real execution must remain:

- Agent-only: dispatch to an exact, known wrapper for an allowlisted agent.
- Action-only: dispatch only for existing allowlisted orchestration actions.
- Artifact-only: wrapper output becomes reviewable artifacts, never direct applied changes.
- Human-gated: request approval is required before enqueue/dispatch, and artifact promotion still requires human review.
- Kill-switchable: one flag or env var must block all dispatch immediately.

## 1. Exact wrapper allowlist

Do not resolve wrappers from user input, `PATH`, shell lookup, package scripts, aliases, or file discovery at dispatch time.

Phase 4 should define a checked-in allowlist mapping canonical target agent IDs to absolute wrapper paths. The wrapper selected for a request must be derived only from `targetAgent` after target allowlist validation.

Initial Phase 4 allowlist:

```ts
export const PHASE4_WRAPPER_ALLOWLIST = {
  belion: 'C:/Users/tophe/.local/bin/belion',
  igris: 'C:/Users/tophe/.local/bin/igris',
  atlas: 'C:/Users/tophe/.local/bin/atlas',
  clix: 'C:/Users/tophe/.local/bin/clix',
  forge: 'C:/Users/tophe/.local/bin/forge',
  pulse: 'C:/Users/tophe/.local/bin/pulse',
  sentinel: 'C:/Users/tophe/.local/bin/sentinel',
  vector: 'C:/Users/tophe/.local/bin/vector',
  nexus: 'C:/Users/tophe/.local/bin/nexus',
} as const;
```

Required validation before spawn:

- `targetAgent` must exactly match an allowlisted key after strict canonicalization to lowercase ASCII.
- Resolved wrapper path must exactly equal the configured absolute path for that key.
- The wrapper file must exist, be a regular file, and not be a symlink/junction/reparse-point.
- Parent directory must be the expected wrapper directory only: `C:/Users/tophe/.local/bin`.
- Deny `.bat`, `.cmd`, `.ps1`, shell scripts requiring implicit shell execution, and any path containing traversal, wildcard, variable expansion, quotes, or shell metacharacters.
- If Windows batch wrappers are currently the only available Hermes wrappers, Phase 4 must not dispatch them directly. Add a separate reviewed native launcher/shim that can be executed with `shell:false`, then allowlist that exact launcher path instead.
- Do not include `cipher-agent` in Phase 4 until Phase 3 target allowlist and ownership model explicitly include it.

## 2. Process spawning requirements

Use `child_process.spawn` or equivalent with a fixed executable and fixed argument vector.

Required spawn settings:

```ts
spawn(wrapperPath, args, {
  shell: false,
  windowsHide: true,
  cwd: STRONGHOLD_REPO_ROOT,
  env: sanitizedEnv,
  stdio: ['pipe', 'pipe', 'pipe'],
});
```

Forbidden:

- `exec`, `execFile` with shell-like strings, `spawn(..., { shell: true })`, package scripts, terminal commands, `bash -lc`, `cmd /c`, `powershell`, `sh`, `node -e`, or dynamic interpreters.
- Concatenated command strings.
- Passing prompt text as command-line arguments if it can be sent via stdin.
- Any wrapper selection from request fields other than canonical `targetAgent`.

Arguments should be minimal and fixed, for example:

```ts
const args = ['--profile', targetAgent, '--stdin-json'];
```

If Hermes wrappers use different invocation syntax, document and test the exact fixed argument vector before enabling production dispatch.

## 3. Sanitized environment

Wrappers must receive a minimal, explicitly constructed environment. Never forward `process.env` wholesale.

Allowed env keys should be limited to runtime essentials and non-secret Stronghold values, for example:

```ts
const sanitizedEnv = {
  HOME: 'C:/Users/tophe',
  USERPROFILE: 'C:/Users/tophe',
  LOCALAPPDATA: 'C:/Users/tophe/AppData/Local',
  APPDATA: 'C:/Users/tophe/AppData/Roaming',
  PATH: 'C:/Users/tophe/.local/bin;C:/Windows/System32',
  HERMES_PROFILE: targetAgent,
  STRONGHOLD_EXECUTION_MODE: 'phase4-wrapper',
  STRONGHOLD_REQUEST_ID: request.id,
};
```

Deny/remove at minimum:

- API keys and auth material: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `NPM_TOKEN`, `HF_TOKEN`, `AWS_*`, `AZURE_*`, `GOOGLE_*`, `*_TOKEN`, `*_SECRET`, `*_KEY`, `*_PASSWORD`, `*_CREDENTIAL*`.
- Shell/config injection variables: `NODE_OPTIONS`, `PYTHONPATH`, `BASH_ENV`, `ENV`, `PROMPT_COMMAND`, `GIT_CONFIG_*`, `SSH_AUTH_SOCK`.
- Proxy variables unless explicitly approved for a network-allowlisted future policy.

Additional requirements:

- Secret-like values in request prompt, title, context refs, stdout, stderr, artifacts, logs, and audit records must be rejected or redacted using the existing redaction policy.
- Audit records must record that env was sanitized, but must not record env values.

## 4. Input contract

The wrapper input must be structured JSON over stdin, capped and validated before spawn.

Required fields:

- `requestId`
- `targetAgent`
- `action`
- `title`
- `prompt`
- `allowedInputs`
- `sandboxPolicyId`
- `expectedOutputSchema`

Input limits:

- Max serialized stdin payload: 16 KiB initially, matching Phase 3 default policy.
- No raw file contents unless explicitly included in an approved context bundle.
- No arbitrary paths. Context refs must pass existing path guards and approved context-kind checks.
- Deny shell-like payloads before dispatch even though `shell:false` is required.

## 5. Output caps and artifact handling

Required output controls:

- Capture stdout and stderr separately.
- Max stdout bytes: 64 KiB.
- Max stderr bytes: 16 KiB.
- Max combined output bytes: 80 KiB.
- Stop reading and terminate the process when caps are exceeded.
- Mark run as `failed` with reason `output_cap_exceeded`; do not create a normal artifact from over-cap output.
- Redact output before persistence.
- Store only redacted, capped output and hashes.
- Never stream raw wrapper output to the browser.

Artifact requirements:

- Artifacts remain `requiresHumanApply: true`.
- Wrapper output cannot directly create, modify, or delete repo files outside the existing Phase 2 approval workflow.
- Patch-like output must be stored as a proposal artifact only.

## 6. Timeouts and process termination

Initial timeout: 120 seconds maximum per run, matching current Phase 3 policy.

Required behavior:

- Set a wall-clock timer before writing stdin.
- On timeout, send graceful termination first.
- If the process is still alive after a short grace period, force kill it.
- Mark run as `timed_out`.
- Record timeout in audit and run log.
- Ensure child process cleanup runs on success, failure, timeout, output cap, request cancellation, server shutdown, and kill switch activation.

Recommended defaults:

- Per-run timeout: 120,000 ms.
- Termination grace period: 2,000 ms.
- Queue wait timeout before dispatch starts: 60,000 ms.

## 7. Kill switch

The existing kill switch must gate every transition into real execution.

Required checks:

- Before approval-to-queue.
- Before dispatch worker picks a queued request.
- Immediately before spawn.
- During long-running processes, poll or subscribe to kill-switch changes and terminate active children when disabled.

Kill switch sources:

- `STRONGHOLD_AGENT_EXECUTION=disabled`
- Stronghold flag file used by current `killSwitch.ts`
- Optional UI/admin disable endpoint, audited and protected from accidental enablement

Fail-safe behavior:

- Default to disabled for real wrapper dispatch unless `STRONGHOLD_AGENT_EXECUTION=enabled` and a Phase 4 config flag are both set.
- If config is missing or malformed, deny dispatch.

## 8. Rate limits and concurrency

Initial limits should be conservative:

- Per actor/requester: 3 dispatches per 15 minutes.
- Global queued dispatches: 10 pending maximum.
- Global active real wrapper processes: 1 initially.
- Per target agent: 1 active process.
- Daily global cap: 25 real wrapper runs until operational confidence improves.

Rate-limit denials must be audited and must not enqueue a run.

## 9. Audit and observability

Every state transition and security decision must append an audit event. Audit logs must be append-only JSONL or equivalent and must never include secrets or raw unredacted prompt/output.

Required audit fields:

- `eventId`
- `timestamp`
- `actor`
- `requestId`
- `runId` when available
- `targetAgent`
- `action`
- `decision`: `allowed` or `denied`
- `reasonCode`
- `wrapperKey`
- `wrapperPathHash`, not raw path if path disclosure is undesirable
- `inputHash`
- `stdoutHash` / `stderrHash` after redaction when available
- `timeoutMs`
- `outputBytesCaptured`
- `redactionApplied`
- `killSwitchState`
- `rateLimitBucket`

Minimum reason codes:

- `target_not_allowlisted`
- `action_not_allowlisted`
- `wrapper_not_allowlisted`
- `wrapper_path_invalid`
- `shell_payload_denied`
- `secret_payload_denied`
- `env_sanitized`
- `rate_limit_exceeded`
- `kill_switch_disabled`
- `spawn_started`
- `spawn_failed`
- `timeout`
- `output_cap_exceeded`
- `completed`

## 10. Secrets policy

Real wrapper dispatch must be designed as if prompts, outputs, logs, artifacts, errors, and audit events are user-visible.

Required controls:

- Reject request creation or dispatch when prompt/title/context contains secret-like values.
- Redact before persistence and before browser response.
- Do not pass API keys or tokens through env, args, stdin, files, or context bundles.
- Do not allow wrappers to access `.env`, credential stores, SSH agents, browser profiles, shell history, or Hermes profile secrets via approved context.
- Do not log process env, full command lines with sensitive args, raw stderr, stack traces containing env, or absolute secret paths.

## 11. Required denial tests before enablement

Phase 4 must include automated tests proving denial and cleanup behavior. Required cases:

- Unknown target such as `powershell` is denied.
- Known target with modified wrapper path is denied.
- Path traversal target/path is denied.
- Symlink/junction wrapper is denied.
- `.bat`, `.cmd`, `.ps1`, and shell interpreter wrappers are denied.
- Unsafe action such as `command:run` is denied.
- Shell-like prompt such as `bash -lc "rm -rf /"` is denied.
- Secret-like prompt/env/output is rejected or redacted.
- `spawn` is called with `shell:false`; a regression test fails if `shell:true` is used.
- Sanitized env excludes representative secret variables.
- Over-size stdin is denied before spawn.
- Stdout cap terminates process and marks run failed.
- Stderr cap terminates process and marks run failed.
- Timeout terminates process and marks run `timed_out`.
- Kill switch blocks queued dispatch before spawn.
- Kill switch activation kills an active child.
- Rate limit denies excess requests.
- Concurrent dispatch limit prevents a second active process.
- Wrapper failure produces failed run plus audit event, not an uncaught server error.
- Artifact output remains human-review-only and cannot apply directly.
- Browser/API cannot access a generic command endpoint.

## 12. Enablement checklist

Do not enable real wrapper dispatch until all are true:

- Security requirements above are implemented.
- Denial tests pass in CI/local test run.
- Positive-path test uses a harmless local fixture wrapper, not a real destructive agent.
- Real dispatch is behind an explicit opt-in config flag and the existing kill switch.
- Documentation states Phase 4 operational limits and rollback steps.
- Audit log review confirms no secrets or raw env values are persisted.
- Sentinel signs off on the exact wrapper allowlist and launcher implementation.

## Recommendation

Proceed with Phase 4 only as a gated implementation behind disabled-by-default configuration. Keep Phase 3 mock dispatch as the default and retain all existing command-endpoint denials. The first real-dispatch milestone should execute only a harmless fixture wrapper under the same security controls before any Hermes wrapper is enabled.
