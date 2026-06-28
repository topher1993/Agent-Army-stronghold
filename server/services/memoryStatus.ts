// Phase D3 — Memory Status service
//
// Reads the Hermes MEMORY.md file and reports its structure: file size,
// last-modified timestamp, and a per-section breakdown (title, char count,
// first sentence, line range). Read-only. No writes to MEMORY.md.
//
// The actual MEMORY.md file uses `§` as the section delimiter — observed
// directly from %LOCALAPPDATA%\hermes\memories\MEMORY.md on 2026-06-28.
// The parser splits on that delimiter, then derives a title for each
// section by extracting the leading bold-prefix (**X:**) if present,
// otherwise the first 80 chars of the section text.
import * as fs from 'node:fs';

export type MemorySection = {
  title: string;
  charCount: number;
  firstSentence: string;
  lineStart: number;
  lineEnd: number;
};

export type MemoryStatus = {
  path: string;
  exists: boolean;
  sizeBytes: number;
  lastModified: string | null;
  sections: MemorySection[];
  rawText: string;
};

const SECTION_DELIM = '\u00a7'; // §
const FIRST_SENTENCE_MAX = 200;
const TITLE_MAX = 80;

function deriveTitle(sectionText: string): string {
  const trimmed = sectionText.trim();
  // Match leading **X:** (bold-headed paragraph used by the memory tool).
  const boldMatch = trimmed.match(/^\*\*([^*]+):\*\*/);
  if (boldMatch && boldMatch[1]) {
    return boldMatch[1].trim().slice(0, TITLE_MAX);
  }
  // Otherwise: first line, truncated.
  const firstLine = trimmed.split('\n', 1)[0] ?? '';
  return firstLine.trim().slice(0, TITLE_MAX) || '(untitled)';
}

function deriveFirstSentence(sectionText: string): string {
  const trimmed = sectionText.trim();
  if (!trimmed) return '';
  // Take the first "sentence" — ends at first ". " or end of paragraph.
  const sentenceEnd = trimmed.search(/\.\s/);
  const sentence =
    sentenceEnd > 0 ? trimmed.slice(0, sentenceEnd + 1) : trimmed.split('\n', 1)[0] ?? '';
  return sentence.length > FIRST_SENTENCE_MAX
    ? sentence.slice(0, FIRST_SENTENCE_MAX) + '…'
    : sentence;
}

export function readMemoryStatus(memoryPath: string): MemoryStatus {
  let stat: fs.Stats | null = null;
  try {
    stat = fs.statSync(memoryPath);
  } catch {
    return {
      path: memoryPath,
      exists: false,
      sizeBytes: 0,
      lastModified: null,
      sections: [],
      rawText: '',
    };
  }

  let rawText = '';
  try {
    rawText = fs.readFileSync(memoryPath, 'utf8');
  } catch {
    rawText = '';
  }

  const lines = rawText.split('\n');
  // Split by § delimiter. Each section's text is the trimmed content between
  // delimiters. Line numbers are 1-indexed (matching editor convention).
  const sections: MemorySection[] = [];
  let cursorLine = 1;
  let buffer: string[] = [];

  const flush = () => {
    const sectionText = buffer.join('\n').trim();
    if (!sectionText) {
      buffer = [];
      return;
    }
    const startLine = cursorLine - buffer.length;
    const endLine = cursorLine - 1;
    sections.push({
      title: deriveTitle(sectionText),
      charCount: sectionText.length,
      firstSentence: deriveFirstSentence(sectionText),
      lineStart: Math.max(1, startLine),
      lineEnd: Math.max(1, endLine),
    });
    buffer = [];
  };

  for (const line of lines) {
    if (line.trim() === SECTION_DELIM) {
      flush();
    } else {
      buffer.push(line);
    }
    cursorLine += 1;
  }
  flush();

  return {
    path: memoryPath,
    exists: true,
    sizeBytes: stat.size,
    lastModified: stat.mtime.toISOString(),
    sections,
    rawText,
  };
}

export function defaultMemoryPath(): string {
  // Windows-only. Stronghold server runs on Windows; we resolve via
  // %LOCALAPPDATA% when available, fall back to os.homedir() concatenation.
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    return `${localAppData}\\hermes\\memories\\MEMORY.md`;
  }
  // Non-Windows fallback (tests / dev): use posix-style path under homedir.
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  return `${home}/.local/share/hermes/memories/MEMORY.md`.replace(/\//g, '\\');
}
