# Phase 3 Security

Owner: Sentinel  
Status: Implemented MVP guardrails

## Guardrails implemented

- No generic command, execute, shell, git, profile, cron, skill, plugin, memory, or secrets endpoint.
- Agent targets are allowlisted.
- Agent actions are allowlisted.
- Shell-like payloads are denied.
- Secret-like values are denied by request validation and redaction utilities.
- Mock dispatcher is used before any real wrapper dispatch.
- Kill switch primitive blocks dispatch when active.
- Rate limiter primitive is implemented and tested.
- Agent output is artifact-only and requires human review.
- Artifact promotion creates a Phase 2 change request instead of applying directly.

## Current approved actions

```text
agent:plan
agent:review
agent:summarize
agent:validate
agent:test-readonly
```

## Current approved targets

```text
igris
atlas
sentinel
pulse
vector
forge
clix
nexus
belion
```

## Still not implemented

Real wrapper dispatch is intentionally not implemented in this MVP. It requires a Phase 3.x or Phase 4 Sentinel review with strict `spawn(..., shell:false)`, exact wrapper path allowlists, sanitized env, output caps, and timeout enforcement.
