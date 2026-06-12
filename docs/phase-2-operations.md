# Phase 2 Operations

Owner: Vector  
Status: Verified locally

## Run frontend

```bash
cd /c/Users/tophe/agent-army-stronghold
npm run dev
```

Frontend dev URL:

```text
http://127.0.0.1:5174/
```

## Run backend

```bash
npm run server:dev
```

Backend API:

```text
http://127.0.0.1:5175/api/health
```

## Build and verify

```bash
npm test
npm run build
```

## Production preview

```bash
npm run preview
```

Preview URL:

```text
http://127.0.0.1:4174/
```

## Smoke checks

```bash
curl -s http://127.0.0.1:5175/api/health
curl -s http://127.0.0.1:5175/api/missions
```

Expected health summary:

```json
{"ok":true,"phase":2,"host":"127.0.0.1","writeGate":"approval-required"}
```

## Troubleshooting

If port `5175` is busy:

```bash
netstat -ano | grep ':5175'
taskkill //PID <pid> //F
```

Do not bind the backend to `0.0.0.0` for Phase 2.
