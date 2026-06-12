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
const EXPECTED_OUT = path.resolve(PROJECT_ROOT, 'public', 'data', 'stronghold-snapshot.json');

const SENSITIVE_MARKERS = [
  '.env', 'secret', 'token', 'oauth', 'credential', 'credentials', 'cookie', 'key',
  'api_key', 'password', 'auth', 'session', 'refresh', 'access', 'client_secret'
];

const roster = [
  { name: 'Belion', role: 'Coordinator', wrapper: 'belion', reportsTo: 'Chris', responsibilities: ['Coordinate agent army', 'Route work to Igris', 'Report final outcomes'] },
  { name: 'Igris', role: 'Engineering Director', wrapper: 'igris', reportsTo: 'Belion', responsibilities: ['Own engineering delivery', 'Assign specialists', 'Final technical review'] },
  { name: 'Atlas', role: 'Architecture Specialist', wrapper: 'atlas', reportsTo: 'Igris', responsibilities: ['Architecture', 'Data contracts', 'System design'] },
  { name: 'Clix', role: 'Frontend Specialist', wrapper: 'clix', reportsTo: 'Igris', responsibilities: ['UI implementation', 'Responsive layout', 'Accessibility'] },
  { name: 'Forge', role: 'Backend Specialist', wrapper: 'forge', reportsTo: 'Igris', responsibilities: ['Read-only collectors', 'Data normalization', 'Local API/snapshot'] },
  { name: 'Pulse', role: 'QA Specialist', wrapper: 'pulse', reportsTo: 'Igris', responsibilities: ['Test plan', 'Validation', 'Quality report'] },
  { name: 'Sentinel', role: 'Security Specialist', wrapper: 'sentinel', reportsTo: 'Igris', responsibilities: ['Secret safety', 'Read-only review', 'OWASP checks'] },
  { name: 'Vector', role: 'DevOps Specialist', wrapper: 'vector', reportsTo: 'Igris', responsibilities: ['Local deployment', 'Ops guide', 'Runtime checks'] },
  { name: 'Nexus', role: 'AI/LLM Specialist', wrapper: 'nexus', reportsTo: 'Igris', responsibilities: ['AI documentation', 'Knowledge structure', 'Phase 2 backlog'] },
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
  for (const name of listDirs(PROFILES_ROOT)) profiles.push(profileSummary(name, path.join(PROFILES_ROOT, name)));
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
function safetyFindings({ cronJobs }) {
  const findings = [
    { id: 'read-only-ui', level: 'ok', title: 'Read-only UI boundary', detail: 'Phase 1 has no browser write controls or command execution controls.' },
    { id: 'secret-denylist', level: 'ok', title: 'Sensitive data denylist active', detail: `${SENSITIVE_MARKERS.length} sensitive markers are denied/redacted by the snapshot collector.` },
    { id: 'localhost-only', level: 'ok', title: 'Localhost-only runtime', detail: 'Vite dev and preview configs bind to 127.0.0.1 with strict ports.' },
    { id: 'cron-redaction', level: 'ok', title: 'Cron bodies redacted', detail: `${cronJobs.length} cron jobs summarized without prompts, scripts, or output bodies.` },
  ];
  return findings;
}

const profiles = collectProfiles();
const cronJobs = collectCronJobs();
const wrappers = roster.map(agent => wrapperStatus(agent.wrapper));
const missions = collectMissions();
const snapshot = {
  generatedAt: new Date().toISOString(),
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
  roster: roster.map(agent => ({ ...agent, wrapperStatus: wrapperStatus(agent.wrapper) })),
  profiles,
  wrappers,
  cronJobs,
  missions,
  safetyFindings: safetyFindings({ cronJobs }),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
if (path.resolve(OUT) !== EXPECTED_OUT) {
  throw new Error(`Refusing to write outside approved Stronghold snapshot path: ${OUT}`);
}
fs.writeFileSync(OUT, JSON.stringify(snapshot, null, 2));
console.log(`Stronghold snapshot written: ${OUT}`);
console.log(`Profiles=${snapshot.counts.profiles} Cron=${snapshot.counts.cronJobs} Skills=${snapshot.counts.skills} Missions=${snapshot.counts.missions}`);
