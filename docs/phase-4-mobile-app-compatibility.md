# Phase 4 Mobile App Compatibility

Owner: Igris  
UI specialists: Clix, Nova  
Status: Implemented

## Purpose

Phase 4 changes Stronghold mobile behavior from a long stacked dashboard page into an app-like command cockpit.

The desktop side-panel layout remains intact. On mobile, Stronghold now uses a compact app shell with bottom tab navigation so Chris can switch between major workspaces instead of scrolling through every desktop panel.

## Mobile sections

Bottom navigation:

- **Command** — guarded controls and agent orchestration.
- **Approvals** — approval queue and audit trail.
- **Missions** — mission/task proposal forms and mission board.
- **Intel** — telemetry, Engineering Division roster, and inventory.
- **Safety** — cron monitor, safety/readiness, and operator notes.

## Mobile behavior

- Compact sticky header.
- One active mobile section visible at a time.
- Fixed bottom tab navigation.
- Mobile viewport scroll is contained to the active section.
- Mission board lanes become horizontal snap cards on mobile.
- Heavy roster/inventory content is compacted to reduce page-like reading.
- No horizontal overflow at 390px mobile viewport.

## Guardrails preserved

Phase 4 does not add any new execution surface.

Still forbidden:

```text
shell command controls
terminal controls
execute command controls
generic command endpoints
profile editors
cron editors
secret viewers
real wrapper dispatch
```

## Verification

Automated:

```bash
npm test
npm run build
```

Mobile emulation:

- 390x844 mobile viewport via Chrome DevTools Protocol.
- Verified document/body width equals viewport width.
- Verified bottom nav includes all tabs, including Safety.
- Verified only the active mobile section is displayed.
