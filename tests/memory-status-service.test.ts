// Phase D3 — Memory Status service tests
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { readMemoryStatus, defaultMemoryPath } from '../server/services/memoryStatus';

let tmpDir: string;
let tmpFile: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-status-test-'));
  tmpFile = path.join(tmpDir, 'MEMORY.md');
});

afterEach(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

function writeFile(content: string): string {
  fs.writeFileSync(tmpFile, content, 'utf8');
  return tmpFile;
}

describe('readMemoryStatus', () => {
  it('returns exists=false for a missing file', () => {
    const result = readMemoryStatus(path.join(tmpDir, 'does-not-exist.md'));
    expect(result.exists).toBe(false);
    expect(result.sizeBytes).toBe(0);
    expect(result.lastModified).toBeNull();
    expect(result.sections).toEqual([]);
    expect(result.rawText).toBe('');
    expect(result.path).toContain('does-not-exist.md');
  });

  it('parses a 3-section MEMORY.md with § delimiters correctly', () => {
    const filePath = writeFile(
      [
        '**Audit governance:** MiniMax M3 is the orchestrator and engineer ONLY.',
        '',
        '§',
        '',
        '**Pitfalls:** `QC_REPORTS_DIR` was `~/Desktop`. Sentinel must grep untracked files.',
        '',
        '§',
        '',
        '**Subagent verify-on-disk:** Igris hits the 600s/50-call cap on ~half of features.',
      ].join('\n')
    );

    const result = readMemoryStatus(filePath);

    expect(result.exists).toBe(true);
    expect(result.sizeBytes).toBeGreaterThan(0);
    expect(result.lastModified).not.toBeNull();
    expect(result.sections).toHaveLength(3);

    expect(result.sections[0].title).toBe('Audit governance');
    expect(result.sections[0].firstSentence).toContain('MiniMax M3');
    expect(result.sections[0].charCount).toBeGreaterThan(0);

    expect(result.sections[1].title).toBe('Pitfalls');
    expect(result.sections[1].firstSentence).toContain('QC_REPORTS_DIR');

    expect(result.sections[2].title).toBe('Subagent verify-on-disk');
    expect(result.sections[2].firstSentence).toContain('600s/50-call');

    // rawText may differ from sizeBytes by ±len(lines) on Windows due to CRLF
    expect(Math.abs(result.rawText.length - result.sizeBytes)).toBeLessThanOrEqual(result.rawText.split('\n').length);
  });

  it('handles a single-section file with no delimiters', () => {
    const filePath = writeFile('**Solo:** just one section, no § here.');
    const result = readMemoryStatus(filePath);
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].title).toBe('Solo');
    expect(result.sections[0].firstSentence).toContain('just one section');
  });

  it('uses (untitled) for sections with no bold prefix', () => {
    const filePath = writeFile(
      ['This section has no bold prefix.', '', '§', '', '**Bold one:** has a bold prefix.'].join('\n')
    );
    const result = readMemoryStatus(filePath);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].title).toBe('This section has no bold prefix.');
    expect(result.sections[1].title).toBe('Bold one');
  });

  it('truncates first sentence at 200 chars', () => {
    const longSentence = 'x'.repeat(300);
    const filePath = writeFile(`**Long:** ${longSentence}`);
    const result = readMemoryStatus(filePath);
    expect(result.sections[0].firstSentence.length).toBeLessThanOrEqual(201);
    expect(result.sections[0].firstSentence.endsWith('…')).toBe(true);
  });

  it('returns lineStart/lineEnd that span the file', () => {
    const filePath = writeFile(
      [
        '**A:** first section content.',
        '',
        '§',
        '',
        '**B:** second section content spanning',
        'multiple lines.',
      ].join('\n')
    );
    const result = readMemoryStatus(filePath);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].lineStart).toBe(1);
    expect(result.sections[1].lineStart).toBeGreaterThan(result.sections[0].lineEnd);
    expect(result.sections[1].lineEnd).toBeGreaterThanOrEqual(result.sections[1].lineStart);
  });

  it('charCount matches actual string length', () => {
    const filePath = writeFile('**Exact:** hello world.');
    const result = readMemoryStatus(filePath);
    expect(result.sections[0].charCount).toBe(result.sections[0].firstSentence.length);
  });
});

describe('defaultMemoryPath', () => {
  it('returns a path ending in MEMORY.md', () => {
    const p = defaultMemoryPath();
    expect(p).toMatch(/MEMORY\.md$/);
    expect(p.length).toBeGreaterThan(0);
  });

  it('uses LOCALAPPDATA when available', () => {
    const prev = process.env.LOCALAPPDATA;
    process.env.LOCALAPPDATA = 'C:\\Users\\tophe\\AppData\\Local';
    try {
      expect(defaultMemoryPath()).toContain('hermes\\memories\\MEMORY.md');
    } finally {
      if (prev === undefined) delete process.env.LOCALAPPDATA;
      else process.env.LOCALAPPDATA = prev;
    }
  });
});
