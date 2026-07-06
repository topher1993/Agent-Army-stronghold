import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..');
const HOME = os.homedir();
const HERMES_ROOT = path.join(HOME, 'AppData', 'Local', 'hermes');
const PROFILES_ROOT = path.join(HERMES_ROOT, 'profiles');
const DEFAULT_PROFILE = HERMES_ROOT;
const CRON_JOBS = path.join(HERMES_ROOT, 'cron', 'jobs.json');
const WRAPPER_DIR = path.join(HOME, '.local', 'bin');
const OUT = path.join(PROJECT_ROOT, 'public', 'data', 'stronghold-snapshot.json');
const MISSIONS = path.join(PROJECT_ROOT, 'data', 'missions.json');
const AUDIT_LOG = path.join(PROJECT_ROOT, 'data', 'audit-log.jsonl');
const HEALTH_DIR = path.join(PROJECT_ROOT, 'data', 'health');
const HEALTH_TEST_FILE = path.join(HEALTH_DIR, 'test.json');
const HEALTH_BUILD_FILE = path.join(HEALTH_DIR, 'build.json');
const QC_REPORTS_DIR = path.join(PROJECT_ROOT, 'docs', 'qc-reports');
const WORK_CARDS_DIRS = [
  path.join(HERMES_ROOT, 'plans'),
  path.join(PROJECT_ROOT, '.hermes', 'plans'),
];
const MEMORY_FILES = [
  path.join(HERMES_ROOT, 'memories', 'MEMORY.md'),
  path.join(HERMES_ROOT, 'memories', 'USER.md'),
];
const EXPECTED_OUT = path.resolve(PROJECT_ROOT, 'public', 'data', 'stronghold-snapshot.json');

const SENSITIVE_MARKERS = [
  '.env', 'secret', 'token', 'oauth', 'credential', 'credentials', 'cookie', 'key',
  'api_key', 'password', 'auth', 'session', 'refresh', 'access', 'client_secret'
];

const PHASE3_DIVISION_EXECUTION_MODE = 'mock-label-only';
const PHASE3_DIVISION_WRAPPER = 'mock';
const DIVISION_BEHAVIOR = 'shared-mock-dispatcher';
const divisionRoster = [
  { target: 'igris', name: 'Igris', role: 'Engineering Director', installedWrapper: 'igris', reportsTo: 'Belion', responsibilities: ['Own engineering delivery', 'Assign specialists', 'Final technical review'] },
  { target: 'atlas', name: 'Atlas', role: 'Architecture label', installedWrapper: 'atlas', reportsTo: 'Igris', responsibilities: ['Architecture planning label', 'Data contract review label', 'System design review label'] },
  { target: 'clix', name: 'Clix', role: 'Frontend label', installedWrapper: 'clix', reportsTo: 'Igris', responsibilities: ['UI implementation label', 'Responsive layout label', 'Accessibility review label'] },
  { target: 'forge', name: 'Forge', role: 'Backend/snapshot label', installedWrapper: 'forge', reportsTo: 'Igris', responsibilities: ['Read-only collector label', 'Data normalization label', 'Local API/snapshot label'] },
  { target: 'pulse', name: 'Pulse', role: 'QA label', installedWrapper: 'pulse', reportsTo: 'Igris', responsibilities: ['Test plan label', 'Validation label', 'Quality report label'] },
  { target: 'sentinel', name: 'Sentinel', role: 'Security label', installedWrapper: 'sentinel', reportsTo: 'Igris', responsibilities: ['Secret safety label', 'Read-only review label', 'OWASP checks label'] },
  { target: 'vector', name: 'Vector', role: 'Ops label', installedWrapper: 'vector', reportsTo: 'Igris', responsibilities: ['Local deployment label', 'Ops guide label', 'Runtime checks label'] },
  { target: 'nexus', name: 'Nexus', role: 'Documentation label', installedWrapper: 'nexus', reportsTo: 'Igris', responsibilities: ['AI documentation label', 'Knowledge structure label', 'Backlog documentation label'] },
].map(agent => ({
  ...agent,
  wrapper: PHASE3_DIVISION_WRAPPER,
  executionMode: PHASE3_DIVISION_EXECUTION_MODE,
  behavior: DIVISION_BEHAVIOR,
  dispatchNote: 'Phase 3 roster label only; Stronghold does not invoke this specialist wrapper.',
}));
const roster = [
  { name: 'Belion', role: 'Coordinator', wrapper: 'belion', reportsTo: 'Chris', responsibilities: ['Coordinate agent army', 'Route work to Igris', 'Report final outcomes'] },
  ...divisionRoster,
  { name: 'Cipher', role: 'Database Specialist', wrapper: 'cipher-agent', reportsTo: 'Igris', responsibilities: ['Data modeling', 'Query design', 'Storage review'] },
];

function exists(p) { return fs.existsSync(p); }
function safeReadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
function isSensitivePath(p) {
  const lower = p.toLowerCase();
  return SENSITIVE_MARKERS.some(marker => lower.includes(marker));
}
function listDirs(p) {
  try {
    return fs.readdirSync(p, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
  } catch { return []; }
}
function listSkillSummaries(skillRoot) {
  if (!exists(skillRoot) || isSensitivePath(skillRoot)) return [];
  const results = [];
  const stack = [skillRoot];
  while (stack.length) {
    const current = stack.pop();
    if (!current || isSensitivePath(current)) continue;
    let entries = [];
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (isSensitivePath(full)) continue;
      if (entry.isDirectory()) stack.push(full);
      if (entry.isFile() && entry.name === 'SKILL.md') {
        const text = fs.readFileSync(full, 'utf8').slice(0, 4000);
        const name = text.match(/^name:\s*(.+)$/m)?.[1]?.trim() || path.basename(path.dirname(full));
        const description = text.match(/^description:\s*(.+)$/m)?.[1]?.trim() || 'No description found.';
        results.push({ name, description, relativePath: path.relative(skillRoot, full).replaceAll('\\', '/') });
      }
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
function profileSummary(name, root) {
  const skillRoot = path.join(root, 'skills');
  const cronDir = path.join(root, 'cron');
  return {
    name,
    pathLabel: name === 'default' ? '%LOCALAPPDATA%/hermes' : `%LOCALAPPDATA%/hermes/profiles/${name}`,
    hasSkills: exists(skillRoot),
    skillCount: listSkillSummaries(skillRoot).length,
    skills: listSkillSummaries(skillRoot).slice(0, 40),
    hasCronDir: exists(cronDir),
  };
}
function collectProfiles() {
  const profiles = [profileSummary('default', DEFAULT_PROFILE)];
  for (const name of listDirs(PROFILES_ROOT)) {
    if (name === 'default') continue;
    profiles.push(profileSummary(name, path.join(PROFILES_ROOT, name)));
  }
  return profiles;
}
function wrapperStatus(wrapper) {
  const extensionless = path.join(WRAPPER_DIR, wrapper);
  const bat = path.join(WRAPPER_DIR, `${wrapper}.bat`);
  return { wrapper, available: exists(extensionless) || exists(bat), extensionless: exists(extensionless), bat: exists(bat) };
}
function sanitizeCronJob(job) {
  const schedule = typeof job.schedule === 'string'
    ? job.schedule
    : (job.schedule?.display || job.schedule?.expr || 'unknown');
  return {
    id: String(job.id || job.job_id || 'unknown'),
    name: job.name || 'unnamed',
    schedule,
    profile: job.profile || 'default',
    deliver: job.deliver ? '[configured]' : 'origin/default',
    enabled: job.enabled !== false && job.paused !== true,
    noAgent: Boolean(job.no_agent || job.noAgent),
    skills: Array.isArray(job.skills) ? job.skills : [],
    toolsets: Array.isArray(job.enabled_toolsets) ? job.enabled_toolsets : [],
    safety: 'metadata-only: bodies redacted',
  };
}
function collectCronJobs() {
  const raw = safeReadJson(CRON_JOBS, []);
  const jobs = Array.isArray(raw) ? raw : (Array.isArray(raw.jobs) ? raw.jobs : Object.values(raw));
  return jobs.map(sanitizeCronJob).sort((a, b) => a.name.localeCompare(b.name));
}
function collectMissions() {
  const raw = safeReadJson(MISSIONS, []);
  return Array.isArray(raw) ? raw : [];
}
function countAuditEntries() {
  if (!exists(AUDIT_LOG)) return 0;
  try {
    const text = fs.readFileSync(AUDIT_LOG, 'utf8');
    return text.split(/\r?\n/).filter(line => line.trim().length > 0).length;
  } catch { return 0; }
}
function loadHealthJson(file) {
  if (!exists(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (isSensitivePath(file)) return null;
    return raw;
  } catch { return null; }
}
function isStale(capturedAt, maxAgeMs) {
  if (!capturedAt) return true;
  const t = Date.parse(capturedAt);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > maxAgeMs;
}
function collectHealth() {
  const capturedTest = loadHealthJson(HEALTH_TEST_FILE);
  const capturedBuild = loadHealthJson(HEALTH_BUILD_FILE);
  const oneDayMs = 24 * 60 * 60 * 1000;
  return {
    tests: capturedTest && !isStale(capturedTest.capturedAt, oneDayMs)
      ? {
          status: capturedTest.status,
          files: capturedTest.files,
          tests: capturedTest.tests,
          failedTests: capturedTest.failedTests || 0,
          durationMs: capturedTest.durationMs || 0,
          capturedAt: capturedTest.capturedAt,
          note: capturedTest.note,
        }
      : {
          status: 'unknown',
          files: 0,
          tests: 0,
          durationMs: 0,
          note: capturedTest
            ? `Captured ${capturedTest.capturedAt}; older than 24h. Run \`npm run health:capture\` to refresh.`
            : 'Run `npm run health:capture` then `npm run snapshot` to populate.',
        },
    build: capturedBuild && !isStale(capturedBuild.capturedAt, oneDayMs)
      ? {
          status: capturedBuild.status,
          bundleKb: capturedBuild.bundleKb,
          cssKb: capturedBuild.cssKb,
          modules: capturedBuild.modules,
          durationMs: capturedBuild.durationMs || 0,
          capturedAt: capturedBuild.capturedAt,
          note: capturedBuild.note,
        }
      : {
          status: 'unknown',
          bundleKb: 0,
          cssKb: 0,
          modules: 0,
          note: capturedBuild
            ? `Captured ${capturedBuild.capturedAt}; older than 24h. Run \`npm run health:capture\` to refresh.`
            : 'Run `npm run health:capture` then `npm run snapshot` to populate.',
        },
    auditEntries: countAuditEntries(),
    cronJobs: 0,
    tunnel: {
      publicHost: '127.0.0.1:5174',
      note: 'Stronghold binds localhost only by design.',
    },
  };
}
function collectQcHistory() {
  if (!exists(QC_REPORTS_DIR)) return [];
  const entries = [];
  let files;
  try { files = fs.readdirSync(QC_REPORTS_DIR); } catch { return []; }
  const scoreRegexes = [
    /\*\*Score:\*\*\s*(\d+)\s*\/\s*100/i,
    /(?:^|\n)\s*\d+\.\s*Score:\s*(\d+)\s*\/\s*100/i,
    /Score:\s*(\d+)\s*\/\s*100/i,
  ];
  const verdictRegexes = [
    /\*\*Verdict:\*\*\s*([A-Z][A-Z \-]+?)(?:\n|\r|$)/i,
    /(?:^|\n)\s*\d+\.\s*Verdict:\s*([A-Z][A-Z \-]+?)(?:\n|\r|$)/i,
    /Verdict:\s*([A-Z][A-Z \-]+?)(?:\n|\r|$)/i,
  ];
  for (const name of files) {
    if (!/^tusk-qc-.*-final\.md$/i.test(name)) continue;
    const full = path.join(QC_REPORTS_DIR, name);
    if (isSensitivePath(full)) continue;
    let text;
    try { text = fs.readFileSync(full, 'utf8'); } catch { continue; }
    let scoreMatch = null;
    for (const r of scoreRegexes) { scoreMatch = text.match(r); if (scoreMatch) break; }
    if (!scoreMatch) continue;
    let verdictMatch = null;
    for (const r of verdictRegexes) { verdictMatch = text.match(r); if (verdictMatch) break; }
    const titleMatch = text.match(/^#\s*[^\n]*\(([^\)]+)\)/im);
    entries.push({
      file: name,
      subject: (titleMatch?.[1] || name.replace(/^tusk-qc-/, '').replace(/-final\.md$/, '')).trim(),
      score: Number(scoreMatch[1]),
      verdict: verdictMatch ? verdictMatch[1].trim().toUpperCase() : 'UNKNOWN',
      modifiedAt: (() => { try { return fs.statSync(full).mtime.toISOString(); } catch { return ''; } })(),
    });
  }
  return entries.sort((a, b) => (b.modifiedAt || '').localeCompare(a.modifiedAt || '')).slice(0, 8);
}
function collectWorkItems() {
  const items = [];
  for (const dir of WORK_CARDS_DIRS) {
    let files;
    try { files = fs.readdirSync(dir); } catch { continue; }
    for (const name of files) {
      if (!name.endsWith('.md')) continue;
      const full = path.join(dir, name);
      if (isSensitivePath(full)) continue;
      const stat = fs.statSync(full);
      items.push({
        id: name.replace(/\.md$/, ''),
        title: name.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}_/, ''),
        status: 'planned',
        source: dir.includes('plans') ? 'hermes' : 'stronghold',
        modifiedAt: stat.mtime.toISOString(),
        relativePath: path.relative(PROJECT_ROOT, full).replaceAll('\\', '/'),
      });
    }
  }
  const missions = collectMissions();
  for (const m of missions) {
    items.push({
      id: `mission:${m.id}`,
      title: m.title,
      status: m.status,
      priority: m.priority,
      owner: m.owner,
      source: 'missions',
      modifiedAt: '',
      relativePath: 'data/missions.json',
    });
  }
  return items.sort((a, b) => (b.modifiedAt || '').localeCompare(a.modifiedAt || '')).slice(0, 12);
}
function collectMemory(profilesForMemory) {
  const files = [];
  for (const full of MEMORY_FILES) {
    if (!exists(full)) continue;
    const name = path.basename(full);
    const text = fs.readFileSync(full, 'utf8');
    const headingMatches = text.match(/^##\s+[^\n]+/gm) || [];
    files.push({
      path: path.relative(HERMES_ROOT, full).replaceAll('\\', '/'),
      name,
      sizeBytes: text.length,
      headings: headingMatches.slice(0, 8).map(h => h.replace(/^##\s+/, '').trim()),
    });
  }
  // Use the per-profile skillCount from profileSummary (the real total) rather
  // than the length of any sliced/skills array. This keeps memory.totalSkills
  // aligned with counts.skills in the snapshot.
  const totalSkills = profilesForMemory.reduce((sum, p) => sum + (p.skillCount || 0), 0);
  const sampledSkills = profilesForMemory.flatMap(p => p.skills.slice(0, 8).map(s => ({ profile: p.name, skill: s.name })));
  return { files, skills: sampledSkills.slice(0, 12), totalSkills };
}
function collectActivity() {
  if (!exists(AUDIT_LOG)) return [];
  let lines = [];
  try { lines = fs.readFileSync(AUDIT_LOG, 'utf8').split(/\r?\n/).filter(line => line.trim().length > 0); } catch { return []; }
  const entries = [];
  for (const line of lines) {
    let parsed;
    try { parsed = JSON.parse(line); } catch { continue; }
    entries.push({
      timestamp: parsed.timestamp || '',
      actor: parsed.actor || 'unknown',
      capability: parsed.capability || '',
      action: parsed.action || '',
      outcome: parsed.outcome || '',
      targetId: parsed.targetId || '',
      targetType: parsed.targetType || '',
      reason: parsed.reason || '',
    });
  }
  return entries.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')).slice(0, 12);
}

function collectSubagentsStats({ wrappers, generatedAt }) {
  // dataSources.usageTelemetry: no authoritative per-profile usage source exists in Phase 2, so costToday/tokensToday stay null.
  const costToday = null;
  const tokensToday = null;
  // dataSources.wrapperRuntimeStates: no reliable active/throttled runtime-state source exists yet; wrapper availability is install state, not runtime state.
  const activeRuns = 0;
  // dataSources.wrappers: wrapper statuses are collected during this snapshot run; generatedAt is the wrapper-status collection timestamp.
  const lastWrapperSyncAt = generatedAt;
  void wrappers;
  return { costToday, tokensToday, activeRuns, lastWrapperSyncAt };
}

function safetyFindings({ cronJobs }) {
  return [
    { id: 'read-only-ui', level: 'ok', title: 'Read-only UI boundary', detail: 'Phase 1 has no browser write controls or command execution controls.' },
    { id: 'secret-denylist', level: 'ok', title: 'Sensitive data denylist active', detail: `${SENSITIVE_MARKERS.length} sensitive markers are denied/redacted by the snapshot collector.` },
    { id: 'localhost-only', level: 'ok', title: 'Localhost-only runtime', detail: 'Vite dev and preview configs bind to 127.0.0.1 with strict ports.' },
    { id: 'cron-redaction', level: 'ok', title: 'Cron bodies redacted', detail: `${cronJobs.length} cron jobs summarized without prompts, scripts, or output bodies.` },
  ];
}

const profiles = collectProfiles();
const cronJobs = collectCronJobs();
const wrappers = roster.map(agent => wrapperStatus(agent.installedWrapper || agent.wrapper));
const missions = collectMissions();
const health = collectHealth();
health.cronJobs = cronJobs.length;
const qcHistory = collectQcHistory();
const workItems = collectWorkItems();
const memory = collectMemory(profiles);
const activity = collectActivity();
const generatedAt = new Date().toISOString();
const subagentsStats = collectSubagentsStats({ wrappers, generatedAt });
const snapshot = {
  generatedAt,
  phase: 'Phase 1 MVP',
  readOnly: true,
  owner: 'Igris',
  coordinator: 'Belion',
  dataSources: {
    hermesRoot: '%LOCALAPPDATA%/hermes',
    profilesRoot: '%LOCALAPPDATA%/hermes/profiles',
    cronJobs: '%LOCALAPPDATA%/hermes/cron/jobs.json',
    wrappers: '~/.local/bin',
    missionRegistry: 'data/missions.json',
    usageTelemetry: 'unavailable in Phase 2',
    wrapperRuntimeStates: 'unavailable in Phase 2',
  },
  counts: {
    agents: roster.length,
    profiles: profiles.length,
    wrappersAvailable: wrappers.filter(w => w.available).length,
    skills: profiles.reduce((sum, p) => sum + p.skillCount, 0),
    cronJobs: cronJobs.length,
    missions: missions.length,
    blockedMissions: missions.filter(m => m.status === 'blocked').length,
  },
  roster: roster.map(agent => ({ ...agent, wrapperStatus: wrapperStatus(agent.installedWrapper || agent.wrapper) })),
  profiles,
  wrappers,
  cronJobs,
  missions,
  health,
  qcHistory,
  workItems,
  memory,
  activity,
  subagentsStats,
  safetyFindings: safetyFindings({ cronJobs }),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (path.resolve(OUT) !== EXPECTED_OUT) {
  throw new Error(`Refusing to write outside approved Stronghold snapshot path: ${OUT}`);
}
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
console.log(`Stronghold snapshot written: ${OUT}`);
console.log(`Profiles=${snapshot.counts.profiles} Cron=${snapshot.counts.cronJobs} Skills=${snapshot.counts.skills} Missions=${snapshot.counts.missions}`);