# Agent-Army Stronghold

Phase 3 guarded mission control dashboard for Chris's Hermes agent army and Engineering Division.

## Safety posture

The default dashboard remains safe and local. Phase 2 adds approval-gated mission/task management foundations, and Phase 3 adds controlled mock agent request orchestration while preserving these rules:

- No direct writes from the browser UI; proposals require backend approval flow.
- No generic command execution from the browser UI/API.
- No profile or cron modification from the app.
- No Google Workspace, Gmail, Calendar, or external API calls.
- No secrets, tokens, OAuth files, cookies, or credential values are displayed.
- Vite dev/preview servers bind to `127.0.0.1` only.

The local snapshot generator writes only to this project's `public/data/stronghold-snapshot.json` file so the dashboard can render current metadata. Phase 2 backend writes are restricted to Stronghold-owned data files only.
Phase 3 agent outputs are artifact-only and must become Phase 2 change requests before anything is applied.

## Quick start

```bash
cd /c/Users/tophe/agent-army-stronghold
npm install
npm run dev
```

Run the Phase 2 backend in another shell:

```bash
npm run server:dev
```

Open the local URL printed by Vite, normally:

```text
http://127.0.0.1:5174/
```

## Verification

```bash
npm run snapshot
npm test
npm run build
```

## GitHub Pages

This repository includes `.github/workflows/pages.yml` to build and deploy the static Stronghold UI to GitHub Pages on every push to `main`.

The hosted UI uses the generated snapshot in `public/data/stronghold-snapshot.json`. Local-only Phase 2/3 backend actions remain disabled unless the backend is running on `127.0.0.1:5175` on the viewer's own machine.

## Phase 2 docs

- `docs/phase-2-architecture.md`
- `docs/phase-2-security.md`
- `docs/phase-2-operations.md`
- `docs/reviews/phase-2-validation.md`
- `docs/phase-3-architecture.md`
- `docs/phase-3-security.md`
- `docs/phase-3-operations.md`
- `docs/phase-3-5-interactive-ui.md`

## Data sources

The snapshot generator safely summarizes:

- Hermes profile directory names and presence of safe metadata folders.
- Profile-local skills by `SKILL.md` name/description only.
- Cron job metadata from `cron/jobs.json`, excluding prompts, scripts, outputs, and credential-like values.
- Wrapper command availability under `C:/Users/tophe/.local/bin/`.
- Static Engineering Division roster owned by Igris.
- File-backed mission registry at `data/missions.json`.

## Division ownership

- Owner: Igris, Engineering Director
- Coordinator: Belion
- Architecture: Atlas
- Frontend: Clix
- Backend/snapshot collectors: Forge
- Security: Sentinel
- QA: Pulse
- Ops: Vector
- Documentation: Nexus
