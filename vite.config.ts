import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/Agent-Army-stronghold/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    // Proxy /api/* to the local Node API server so the React app can
    // fetch live data during dev (Discord, activity graph, memory
    // status, approvals, cron). Without this, /api requests hit the
    // Vite SPA fallback ("<!doctype html...") and JSON.parse fails.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5175',
        changeOrigin: false,
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
  },
});
