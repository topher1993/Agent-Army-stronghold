// FEATURE 2 — Cron CRUD service
//
// Server-side wrapper around the host's `hermes cron` CLI. The dashboard is
// localhost-only and the server already binds to 127.0.0.1, so invoking a
// child process on the host machine is the correct boundary — we are NOT
// running untrusted code; we are giving the dashboard a thin HTTP front-end
// over the operator's existing scheduler tool.
//
// The dispatcher is structured so tests can swap the implementation by
// mocking callHermesCron (see tests/phaseC-cron.test.ts). The default real
// implementation shells out and parses the JSON `hermes cron list` payload.
//
// All errors from the CLI flow back to the route as a thrown Error so the
// route can map them to 400 / 404 / 502. We tag known error shapes with a
// `code` property so the route can distinguish "not found" from "tool
// failed" without parsing free-form stderr.

import { spawn } from 'node:child_process';

export type CronJob = {
  id: string;
  name: string;
  schedule: string;
  prompt?: string;
  promptSnippet?: string;
  enabled?: boolean;
  lastStatus?: string;
  nextRun?: string;
  profile?: string;
  deliver?: string;
  skills?: string[];
  toolsets?: string[];
  noAgent?: boolean;
  paused?: boolean;
};

export type CronAction = 'list' | 'get' | 'create' | 'update' | 'pause' | 'resume' | 'remove';

export type CronDispatchError = Error & { code?: 'NOT_FOUND' | 'INVALID' | 'TOOL_FAILURE'; stderr?: string };

function tagError(message: string, code: 'NOT_FOUND' | 'INVALID' | 'TOOL_FAILURE', stderr?: string): CronDispatchError {
  const err = new Error(message) as CronDispatchError;
  err.code = code;
  if (stderr) err.stderr = stderr;
  return err;
}

/**
 * Spawn `hermes cron <action> ...` and resolve with parsed JSON when the
 * action returns a payload (list, get, create, update, pause, resume).
 * For `remove` we resolve with `{ ok: true, id }` so the route can write a
 * consistent audit entry. Errors are tagged with a code so the route layer
 * can map them to HTTP statuses.
 *
 * We use spawn() (NOT shell) and pass args as an array — never as a string —
 * so user-supplied fields can never inject shell metacharacters. hermes cron
 * CLI accepts JSON via --json flag for create/edit; we keep args explicit.
 */
export async function callHermesCron(action: CronAction, args: Record<string, unknown> | { id: string }): Promise<unknown> {
  const argv = ['cron'];
  const positional: string[] = [];
  const flags: string[] = [];

  if (action === 'list') {
    argv.push('list', '--all');
  } else if (action === 'get') {
    argv.push('list', '--all');
    // hermes cron list --json returns all jobs; we filter by id in JS to
    // avoid relying on a positional id argument that may not exist.
  } else if (action === 'create') {
    const a = args as { name?: string; schedule: string; prompt?: string; skills?: string[]; deliver?: string; noAgent?: boolean };
    if (a.noAgent) argv.push('create');
    else argv.push('create');
    positional.push(a.schedule);
    if (a.prompt) positional.push(a.prompt);
    if (a.name) flags.push('--name', a.name);
    if (a.deliver) flags.push('--deliver', a.deliver);
    if (Array.isArray(a.skills)) for (const s of a.skills) flags.push('--skill', s);
    if (a.noAgent) flags.push('--no-agent');
  } else if (action === 'update') {
    const a = args as { id: string; name?: string; schedule?: string; prompt?: string; skills?: string[]; deliver?: string };
    argv.push('edit');
    // The hermes cron edit command takes a job-id positional + the new schedule
    // and prompt. We pass schedule + prompt positionally; flags for the rest.
    positional.push(a.id);
    if (a.schedule) positional.push(a.schedule);
    if (a.prompt) positional.push(a.prompt);
    if (a.name) flags.push('--name', a.name);
    if (a.deliver) flags.push('--deliver', a.deliver);
    if (Array.isArray(a.skills)) for (const s of a.skills) flags.push('--skill', s);
  } else if (action === 'pause') {
    const a = args as { id: string };
    argv.push('pause');
    positional.push(a.id);
  } else if (action === 'resume') {
    const a = args as { id: string };
    argv.push('resume');
    positional.push(a.id);
  } else if (action === 'remove') {
    const a = args as { id: string };
    argv.push('remove');
    positional.push(a.id);
  } else {
    throw tagError(`unknown cron action: ${action}`, 'INVALID');
  }

  return new Promise((resolve, reject) => {
    const child = spawn('hermes', [...argv, ...flags, ...positional], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.on('error', err => reject(tagError(`hermes cron ${action} failed to start: ${err.message}`, 'TOOL_FAILURE', stderr)));
    child.on('close', code => {
      if (code !== 0) {
        const lower = stderr.toLowerCase();
        const code2: 'NOT_FOUND' | 'INVALID' | 'TOOL_FAILURE' =
          lower.includes('not found') ? 'NOT_FOUND'
          : lower.includes('invalid') || lower.includes('usage:') ? 'INVALID'
          : 'TOOL_FAILURE';
        return reject(tagError(`hermes cron ${action} exited ${code}: ${stderr.trim() || stdout.trim()}`, code2, stderr));
      }
      // Parse JSON payloads for read actions.
      try {
        if (action === 'list' || action === 'get') {
          const parsed = JSON.parse(stdout);
          if (action === 'get') {
            const id = (args as { id: string }).id;
            const list = Array.isArray(parsed) ? parsed : (Array.isArray((parsed as { jobs?: unknown[] }).jobs) ? (parsed as { jobs: unknown[] }).jobs : Object.values(parsed));
            const found = (list as CronJob[]).find(j => j.id === id);
            if (!found) return reject(tagError(`cron job not found: ${id}`, 'NOT_FOUND', stderr));
            return resolve(found);
          }
          return resolve(parsed);
        }
        if (action === 'remove') return resolve({ ok: true as const, id: (args as { id: string }).id });
        // For create/update/pause/resume: try to parse stdout as JSON; fall
        // back to { ok: true } so the route can always audit success.
        try { return resolve(JSON.parse(stdout)); } catch { return resolve({ ok: true as const }); }
      } catch (err) {
        return reject(tagError(`hermes cron ${action} returned invalid JSON: ${(err as Error).message}`, 'TOOL_FAILURE', stderr));
      }
    });
  });
}

// Validation primitives reused by the route layer.

export const CRON_SKILLS_ALLOWLIST = [
  // Built-in core skills. Listed by directory name; the actual SKILL.md name
  // matches the directory. We deliberately keep this list conservative —
  // operators can extend via a follow-up patch if a new skill is needed.
  'apple-notes', 'autonomous-ai-agents', 'creative', 'data-science', 'devops', 'dogfood',
  'ecc-imports', 'email', 'github', 'media', 'mlops', 'note-taking', 'productivity',
  'red-teaming', 'research', 'smart-home', 'social-media', 'software-development', 'yuanbao',
  // Specific skills (top-level folder names that are leaves).
  'claude-code', 'codex', 'hermes-agent', 'opencode',
  'app-asset-image-generation', 'architecture-diagram', 'ascii-art', 'ascii-video',
  'baoyu-infographic', 'claude-design', 'comfyui', 'design-md', 'excalidraw',
  'humanizer', 'manim-video', 'p5js', 'popular-web-designs', 'pretext', 'sketch',
  'songwriting-and-ai-music', 'touchdesigner-mcp',
  'jupyter-live-kernel',
  'agent-config-github-backups', 'capture-script-pattern', 'expo-metro-restart-windows',
  'hermes-subagent-profiles', 'jisho-phrase-verification', 'kanban-orchestrator',
  'kanban-worker', 'llm-provider-fallbacks',
  'dogfood', 'ecc-agent-army-intake',
  'himalaya',
  'codebase-inspection', 'github-auth', 'github-code-review', 'github-issues',
  'github-pr-workflow', 'github-repo-management',
  'gif-search', 'heartmula', 'songsee', 'youtube-content',
  'huggingface-hub', 'local-ollama-helper', 'windows-cuda-toolkit-setup',
  'evaluation', 'llama-cpp', 'segment-anything-model',
  'obsidian',
  'agent-army-governance', 'airtable', 'beru-kaisel-japanese-study-workflow',
  'google-workspace', 'maps', 'nano-pdf', 'notion', 'ocr-and-documents',
  'powerpoint', 'scheduled-language-tutor-agents', 'teams-meeting-pipeline',
  'godmode',
  'arxiv', 'blogwatcher', 'llm-wiki', 'polymarket',
  'openhue',
  'xurl',
  'engineering-division', 'hermes-agent-skill-authoring', 'node-inspect-debugger',
  'plan', 'react-native-expo-debug', 'react-native-ui-status-badges',
  'requesting-code-review', 'rn-flex-gap-over-margins', 'rn-shared-value-state-leak',
  'simplify-code', 'spike', 'systematic-debugging', 'test-driven-development',
] as const;

export const CRON_DELIVER_ALLOWLIST = ['origin', 'local', 'all', 'platform:chat:thread'] as const;

const CRON_FIELD = '(?:\\*|\\d+|\\*\\/\\d+|\\d+-\\d+|\\d+,\\d+(?:,\\d+)*|\\*/\\d+|[A-Za-z]+)';
const SCHEDULE_RE = new RegExp(`^${CRON_FIELD}(?:\\s+${CRON_FIELD}){4,5}$`);

/**
 * Reject obvious garbage schedules like "every tuesday" or "asap". Accept
 * classic 5-field cron expressions and the 6-field variant (with seconds).
 * Per the brief: 5 or 6 space-separated fields.
 */
export function isLikelyCronSchedule(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Quick reject: words like "every", "tuesday", "asap"
  if (/\b(every|asap|daily|hourly|weekly|monthly|yearly|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|minutely|secondly)\b/i.test(trimmed)) return false;
  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5 && fields.length !== 6) return false;
  return SCHEDULE_RE.test(trimmed);
}

export function hasControlChars(value: string): boolean {
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u001f\u007f]/.test(value);
}

export type CronCreateInput = {
  name?: unknown;
  schedule?: unknown;
  prompt?: unknown;
  skills?: unknown;
  enabled?: unknown;
  deliver?: unknown;
  model?: unknown;
};

export type CronValidationError = { field: string; message: string };

/**
 * Validate the body of POST /api/cron or PATCH /api/cron/:id. Returns an
 * empty array on success or a list of {field, message} entries. The route
 * layer maps these to a 400 response.
 */
export function validateCronInput(input: CronCreateInput, mode: 'create' | 'update' = 'create'): CronValidationError[] {
  const errors: CronValidationError[] = [];

  if (mode === 'create') {
    if (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 80) {
      errors.push({ field: 'name', message: 'name must be a string between 1 and 80 characters' });
    } else if (hasControlChars(input.name)) {
      errors.push({ field: 'name', message: 'name must not contain control characters' });
    }
    if (!isLikelyCronSchedule(input.schedule)) {
      errors.push({ field: 'schedule', message: 'schedule must be a 5- or 6-field cron expression (e.g. "*/5 * * * *")' });
    }
    if (typeof input.prompt !== 'string' || input.prompt.length < 1 || input.prompt.length > 10000) {
      errors.push({ field: 'prompt', message: 'prompt must be a string between 1 and 10000 characters' });
    } else if (hasControlChars(input.prompt)) {
      errors.push({ field: 'prompt', message: 'prompt must not contain control characters' });
    }
  } else {
    if (input.name !== undefined) {
      if (typeof input.name !== 'string' || input.name.length < 1 || input.name.length > 80) {
        errors.push({ field: 'name', message: 'name must be a string between 1 and 80 characters' });
      } else if (hasControlChars(input.name)) {
        errors.push({ field: 'name', message: 'name must not contain control characters' });
      }
    }
    if (input.schedule !== undefined && !isLikelyCronSchedule(input.schedule)) {
      errors.push({ field: 'schedule', message: 'schedule must be a 5- or 6-field cron expression' });
    }
    if (input.prompt !== undefined) {
      if (typeof input.prompt !== 'string' || input.prompt.length < 1 || input.prompt.length > 10000) {
        errors.push({ field: 'prompt', message: 'prompt must be a string between 1 and 10000 characters' });
      }
    }
  }

  if (input.skills !== undefined) {
    if (!Array.isArray(input.skills)) {
      errors.push({ field: 'skills', message: 'skills must be an array of strings' });
    } else {
      for (const s of input.skills) {
        if (typeof s !== 'string' || !CRON_SKILLS_ALLOWLIST.includes(s as typeof CRON_SKILLS_ALLOWLIST[number])) {
          errors.push({ field: 'skills', message: `skill not in allowlist: ${String(s)}` });
        }
      }
    }
  }

  if (input.deliver !== undefined) {
    if (typeof input.deliver !== 'string' || !CRON_DELIVER_ALLOWLIST.includes(input.deliver as typeof CRON_DELIVER_ALLOWLIST[number])) {
      errors.push({ field: 'deliver', message: `deliver must be one of: ${CRON_DELIVER_ALLOWLIST.join(', ')}` });
    }
  }

  if (input.model !== undefined) {
    if (typeof input.model !== 'object' || input.model === null) {
      errors.push({ field: 'model', message: 'model must be { provider, model }' });
    } else {
      const m = input.model as { provider?: unknown; model?: unknown };
      if (typeof m.provider !== 'string' || !/^(custom:[a-z0-9-]+|[a-z0-9_-]+)$/.test(m.provider)) {
        errors.push({ field: 'model.provider', message: 'provider must match /^custom:[a-z0-9-]+$|^[a-z0-9_-]+$/' });
      }
      if (typeof m.model !== 'string' || m.model.length < 1 || m.model.length > 100) {
        errors.push({ field: 'model.model', message: 'model must be a string between 1 and 100 characters' });
      }
    }
  }

  return errors;
}
