# Operations — Phase 1

## Run locally

```bash
cd /c/Users/tophe/agent-army-stronghold
npm install
npm run dev
```

## Build locally

```bash
npm run build
npm run preview
```

Preview binds to:

```text
127.0.0.1:4174
```

## Refresh data

```bash
npm run snapshot
```

The dashboard refreshes from:

```text
public/data/stronghold-snapshot.json
```

## Troubleshooting

- If the dashboard says snapshot unavailable, run `npm run snapshot`.
- If port 5174 is busy, stop the existing process or edit `vite.config.ts` after Igris approval.
- If profile counts look wrong, confirm Hermes profile directories exist under `C:/Users/tophe/AppData/Local/hermes/profiles`.
