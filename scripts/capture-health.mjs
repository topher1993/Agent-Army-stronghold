// Capture the latest npm test + npm run build output into local JSON so the
// Agentic OS dashboard can show real test/build state. Safe & local:
// - Runs only `vitest run` and `vite build` (already in the toolchain).
// - Writes only to data/health/ inside the project (gitignored by intent).
// - No shell, no eval, no network. Failures are captured, not thrown, so a
//   red test run still produces a JSON file with status='failed'.

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const HEALTH_DIR = path.join(PROJECT_ROOT, 'data', 'health');
const HEALTH_DIR_RESOLVED = path.resolve(HEALTH_DIR);

function ensureHealthDir() {
  fs.mkdirSync(HEALTH_DIR, { recursive: true });
  // Path-safety: refuse to write outside the project-local data/health dir.
  const resolved = path.resolve(HEALTH_DIR);
  if (!resolved.startsWith(path.resolve(PROJECT_ROOT))) {
    throw new Error(`Refusing to write health JSON outside project: ${resolved}`);
  }
}

function runCommand(cmd, args, { cwd, timeoutMs = 240_000, env } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: false, windowsHide: true, env: env || process.env });
    let stdout = '';
    let stderr = '';
    const startedAt = Date.now();
    const killTimer = setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString('utf8'); });
    child.on('error', (err) => {
      clearTimeout(killTimer);
      resolve({ code: -1, stdout, stderr: stderr + (stderr ? '\n' : '') + String(err && err.message), durationMs: Date.now() - startedAt });
    });
    child.on('exit', (code) => {
      clearTimeout(killTimer);
      resolve({ code: typeof code === 'number' ? code : 1, stdout, stderr, durationMs: Date.now() - startedAt });
    });
  });
}

function stripAnsi(text) {
  // Vitest default reporter emits ANSI color codes on the summary line
  // when stdout is a TTY. Strip them so summary lines are clean text.
  return text.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
}

function parseVitestSummary(text) {
  // Vitest default reporter summary lines look like:
  //   Test Files  32 passed (32)
  //        Tests  75 passed (75)
  //   Start at  ...
  //   Duration  44.99s
  // Or on failure:
  //   Test Files  1 failed | 31 passed (32)
  //        Tests  2 failed | 73 passed (75)
  // Anchor each match to the start of a line so `Test Files 32 passed` does
  // not bleed into the `Tests` regex.
  const clean = stripAnsi(text);
  const filesPassed = clean.match(/^\s*Test Files\b.*?(\d+)\s+passed\b/im);
  const filesFailed = clean.match(/^\s*Test Files\b.*?(\d+)\s+failed\b/im);
  const testsPassed = clean.match(/^\s*Tests\b.*?(\d+)\s+passed\b/im);
  const testsFailed = clean.match(/^\s*Tests\b.*?(\d+)\s+failed\b/im);
  const durationMatch = clean.match(/Duration\s+([0-9]+(?:\.[0-9]+)?)s/i);
  const filesPassedCount = filesPassed ? Number(filesPassed[1]) : 0;
  const filesFailedCount = filesFailed ? Number(filesFailed[1]) : 0;
  return {
    files: filesPassedCount + filesFailedCount,
    tests: testsPassed ? Number(testsPassed[1]) : 0,
    failedTests: testsFailed ? Number(testsFailed[1]) : 0,
    durationMs: durationMatch ? Math.round(Number(durationMatch[1]) * 1000) : 0,
    filesFailed: filesFailedCount,
  };
}

function parseViteBuildSummary(text) {
  // Vite's default reporter prints:
  //  dist/index.html                   0.40 kB │ gzip:  0.27 kB
  //  dist/assets/index-ORFy9VEa.js   173.02 kB │ gzip: 53.72 kB
  //  ✓ built in 108ms
  const jsLine = text.match(/dist\/assets\/[^\s]+\.js\s+([0-9.]+)\s*kB/i);
  const cssLine = text.match(/dist\/assets\/[^\s]+\.css\s+([0-9.]+)\s*kB/i);
  const builtIn = text.match(/built in\s+([0-9]+)ms/i);
  const modules = text.match(/transforming\.\.\.✓\s+([0-9]+)\s+modules\s+transformed/i);
  return {
    bundleKb: jsLine ? Math.round(Number(jsLine[1])) : 0,
    cssKb: cssLine ? Math.round(Number(cssLine[1])) : 0,
    durationMs: builtIn ? Number(builtIn[1]) : 0,
    modules: modules ? Number(modules[1]) : 0,
  };
}

async function captureTest() {
  const startedAt = new Date().toISOString();
  const result = await runCommand(process.execPath, [
    path.join(PROJECT_ROOT, 'node_modules', 'vitest', 'vitest.mjs'),
    'run',
    '--reporter=default',
  ], { cwd: PROJECT_ROOT, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  const summary = parseVitestSummary(result.stdout + '\n' + result.stderr);
  const status = result.code === 0 && summary.tests > 0
    ? 'passed'
    : (result.code === 0 ? 'unknown' : 'failed');
  return {
    status,
    files: summary.files,
    tests: summary.tests,
    failedTests: summary.failedTests || 0,
    durationMs: summary.durationMs || result.durationMs,
    exitCode: result.code,
    capturedAt: startedAt,
    note: status === 'passed'
      ? `Last npm test run captured ${new Date().toISOString()}.`
      : (status === 'failed'
        ? `Tests reported ${summary.failedTests} failure(s). Re-run \`npm test\` for details.`
        : 'Tests did not report a parseable summary; run `npm test` to populate.'),
  };
}

async function captureBuild() {
  const startedAt = new Date().toISOString();
  const result = await runCommand(process.execPath, [
    path.join(PROJECT_ROOT, 'node_modules', 'vite', 'bin', 'vite.js'),
    'build',
  ], { cwd: PROJECT_ROOT, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } });
  const summary = parseViteBuildSummary(result.stdout + '\n' + result.stderr);
  const status = result.code === 0 && summary.bundleKb > 0
    ? 'clean'
    : (result.code === 0 ? 'unknown' : 'failed');
  return {
    status,
    bundleKb: summary.bundleKb,
    cssKb: summary.cssKb,
    modules: summary.modules,
    durationMs: summary.durationMs || result.durationMs,
    exitCode: result.code,
    capturedAt: startedAt,
    note: status === 'clean'
      ? `Last vite build captured ${new Date().toISOString()}.`
      : (status === 'failed'
        ? `Build exited with code ${result.code}. Re-run \`npm run build\` for details.`
        : 'Build did not report a parseable summary; run `npm run build` to populate.'),
  };
}

function writeJson(name, payload) {
  const file = path.resolve(HEALTH_DIR_RESOLVED, name);
  if (!file.startsWith(HEALTH_DIR_RESOLVED)) {
    throw new Error(`Refusing to write health JSON outside ${HEALTH_DIR_RESOLVED}: ${file}`);
  }
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

async function main() {
  ensureHealthDir();
  const testResult = await captureTest();
  const testFile = writeJson('test.json', testResult);
  const buildResult = await captureBuild();
  const buildFile = writeJson('build.json', buildResult);
  console.log(`Health capture written: ${testFile}`);
  console.log(`Health capture written: ${buildFile}`);
  console.log(`tests=${testResult.status} (${testResult.tests}/${testResult.files}) build=${buildResult.status} (${buildResult.bundleKb}KB)`);
}

main().catch((err) => {
  console.error('capture-health failed:', err && err.message ? err.message : err);
  process.exit(1);
});