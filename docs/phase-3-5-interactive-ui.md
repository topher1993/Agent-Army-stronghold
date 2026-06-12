# Phase 3.5 Interactive Control UI

Owner: Igris  
Status: Implemented

## Purpose

Phase 3.5 turns the visible Stronghold cockpit from mostly static status panels into an interactive guarded UI for the existing Phase 2/3 backend workflows.

## Added UI controls

- Mission proposal form.
- Task proposal form.
- Backend-backed approval queue.
- Approve/reject/apply buttons for change requests.
- Audit log viewer.
- Agent request form.
- Agent request queue.
- Agent approve/enqueue/mock-dispatch controls.
- Agent run monitor.
- Artifact review panel with promote-to-change-request action.
- Guarded hero state replacing the old read-only badge.

## Safety boundary

Phase 3.5 does not add shell execution or real wrapper dispatch. It only exposes the already-approved guarded backend workflows.

Still forbidden:

```text
/api/execute
/api/command
/api/shell
/api/git
/api/profile
/api/cron
/api/skills
/api/plugins
/api/memories
/api/secrets
```

## Local usage

Run backend:

```bash
npm run server:dev
```

Run UI:

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5174/
```

Expected local state:

```text
Backend: connected on 127.0.0.1:5175
Kill switch: inactive
```

## GitHub Pages behavior

GitHub Pages remains a static hosted cockpit. Interactive controls require the local backend at `127.0.0.1:5175`.
