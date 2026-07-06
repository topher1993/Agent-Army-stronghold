import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';
import type { Mission } from '../../src/types';

export type WorkCardRisk = 'GREEN' | 'YELLOW' | 'RED';

export type WorkCardStatus = Mission['status'];

export type WorkCard = {
  workCardId: string;
  project: string;
  risk: WorkCardRisk;
  owner: string;
  qc: string;
  created: string;
  status: WorkCardStatus;
  schedule?: string;
  mode?: string;
  title: string;
  filePath: string;
  lastUpdated: string;
};

type CacheEntry = {
  fingerprint: string;
  cards: WorkCard[];
  parsedAtMs: number;
};

const CACHE_TTL_MS = 30_000;
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const cacheByDirectory = new Map<string, CacheEntry>();

function warn(message: string): void {
  console.warn(`[workCardService] ${message}`);
}

export function defaultWorkCardDirectory(): string {
  // Chris's machine is Windows. The primary agent army lives under %LOCALAPPDATA%/hermes/.
  // The legacy ~/.hermes/ fallback was removed 2026-07-06 (scratchpad tree deletion);
  // if LOCALAPPDATA is somehow missing, throw rather than silently pointing at a wrong path.
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    throw new Error('workCardService: LOCALAPPDATA is not set; Windows-only build');
  }
  return path.join(localAppData, 'hermes', 'agent-army', 'work-cards');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function asYamlString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim();
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function asRisk(value: unknown): WorkCardRisk | null {
  if (value === 'GREEN' || value === 'YELLOW' || value === 'RED') return value;
  return null;
}

function mapStatus(value: unknown): WorkCardStatus | null {
  if (value === 'ready') return 'planned';
  if (value === 'in_progress') return 'active';
  if (value === 'blocked') return 'blocked';
  if (value === 'review') return 'review';
  if (value === 'complete') return 'complete';
  return null;
}

function parseWorkCard(record: Record<string, unknown>, filePath: string, mtime: Date): WorkCard | null {
  const workCardId = asTrimmedString(record.work_card_id);
  const project = asTrimmedString(record.project);
  const risk = asRisk(record.risk);
  const owner = asTrimmedString(record.owner);
  const qc = asTrimmedString(record.qc);
  const created = asYamlString(record.created);
  const status = mapStatus(record.status);
  const title = asTrimmedString(record.title);

  if (!workCardId || !project || !risk || !owner || !qc || !created || !status || !title) {
    warn(`Skipping invalid work card ${filePath}: missing or invalid required frontmatter`);
    return null;
  }

  const schedule = asTrimmedString(record.schedule);
  const mode = asTrimmedString(record.mode);

  return {
    workCardId,
    project,
    risk,
    owner,
    qc,
    created,
    status,
    ...(schedule ? { schedule } : {}),
    ...(mode ? { mode } : {}),
    title,
    // R8 intentionally exposes absolute file paths for local debugging/test assertions.
    // R8.5 needs a security pass to review path exposure before broader deployment.
    filePath,
    lastUpdated: mtime.toISOString(),
  };
}

function parseFile(filePath: string, stat: fs.Stats): WorkCard | null {
  let text: string;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    warn(`Skipping unreadable work card ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    warn(`Skipping work card without leading YAML frontmatter: ${filePath}`);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = loadYaml(match[1]) as unknown;
  } catch (error) {
    warn(`Skipping malformed YAML work card ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }

  if (!isRecord(parsed)) {
    warn(`Skipping invalid work card ${filePath}: frontmatter is not an object`);
    return null;
  }

  return parseWorkCard(parsed, filePath, stat.mtime);
}

function listMarkdownFiles(directory: string): Array<{ filePath: string; stat: fs.Stats }> {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch (error) {
    warn(`Unable to read work-card directory ${directory}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }

  const files: Array<{ filePath: string; stat: fs.Stats }> = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const filePath = path.resolve(directory, entry.name);
    try {
      files.push({ filePath, stat: fs.statSync(filePath) });
    } catch (error) {
      warn(`Skipping unstatable work card ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return files;
}

function fingerprintFiles(files: Array<{ filePath: string; stat: fs.Stats }>): string {
  return files
    .map(({ filePath, stat }) => `${path.basename(filePath)}:${filePath}:${stat.mtimeMs}:${stat.size}`)
    .sort((a, b) => a.localeCompare(b))
    .join('|');
}

function sortCards(cards: WorkCard[]): WorkCard[] {
  return [...cards].sort((a, b) => {
    const newestFirst = Date.parse(b.lastUpdated) - Date.parse(a.lastUpdated);
    if (newestFirst !== 0) return newestFirst;
    return a.workCardId.localeCompare(b.workCardId);
  });
}

export function readWorkCards(directory = defaultWorkCardDirectory(), now = Date.now()): WorkCard[] {
  const resolvedDirectory = path.resolve(directory);
  const files = listMarkdownFiles(resolvedDirectory);
  const fingerprint = fingerprintFiles(files);
  const cached = cacheByDirectory.get(resolvedDirectory);
  if (cached && cached.fingerprint === fingerprint && now - cached.parsedAtMs < CACHE_TTL_MS) {
    return cached.cards;
  }

  const cards = sortCards(files.map(({ filePath, stat }) => parseFile(filePath, stat)).filter((card): card is WorkCard => card !== null));
  cacheByDirectory.set(resolvedDirectory, { fingerprint, cards, parsedAtMs: now });
  return cards;
}

export function resolveWorkCardDirectoryOverride(headerValue: string | string[] | undefined): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmed)) return undefined;
  return path.resolve(trimmed);
}
