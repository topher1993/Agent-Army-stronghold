import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    // Run test files serially. Several tests share real on-disk state under
    // data/ (e.g. data/change-requests.json) and a parallel burst from the
    // rate-limit suite can race the interactive-workflow suite, which does a
    // strict create -> approve -> apply chain on the same file. Serial
    // execution is the smallest change that keeps the suites deterministic
    // without changing the test logic itself.
    fileParallelism: false,
  },
});
