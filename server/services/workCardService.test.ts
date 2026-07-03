import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readWorkCards } from './workCardService';

let tmpDir = '';

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'work-card-service-'));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeCard(filename: string, frontmatter: string, body = '# Test card\n'): string {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, `---\n${frontmatter.trim()}\n---\n\n${body}`, 'utf8');
  return filePath;
}

function writeRaw(filename: string, content: string): string {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

const validFrontmatter = [
  'work_card_id: TEST-CARD',
  'project: stronghold',
  'title: Test work card',
  'risk: GREEN',
  'owner: Pulse',
  'qc: Tusk',
  'created: 2026-07-03',
  'status: ready',
].join('\n');

describe('readWorkCards', () => {
  it('parses R6-C5-PVE correctly from the live work-card directory', () => {
    const liveWorkCardDir = 'C:/Users/tophe/AppData/Local/hermes/agent-army/work-cards';
    const cards = readWorkCards(liveWorkCardDir);
    const r6 = cards.find(card => card.workCardId === 'R6-C5-PVE');

    if (!r6) {
      throw new Error('Expected live R6-C5-PVE work card to be parsed');
    }

    expect(r6).toMatchObject({
      workCardId: 'R6-C5-PVE',
      project: 'quiz-shoot',
      title: 'C5 — PvE (vs CPU) mode so a single user can play-test end-to-end',
      risk: 'YELLOW',
      owner: 'Igris (engineering); Forge (gameplay primary) + Nova (AI behavior)',
      qc: 'Tusk via GPT-5.5',
      created: '2026-07-02',
      status: 'active',
    });
    expect(r6.filePath).toMatch(/R6-C5-PVE\.md$/);
    expect(Date.parse(r6.lastUpdated)).not.toBeNaN();
  });

  it('handles missing frontmatter gracefully by filtering the file out', () => {
    writeRaw('no-frontmatter.md', '# No frontmatter\n\nThis should not parse.\n');

    expect(readWorkCards(tmpDir)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('without leading YAML frontmatter'));
  });

  it('handles malformed YAML gracefully by filtering the file out', () => {
    writeRaw(
      'malformed-yaml.md',
      ['---', 'work_card_id: BAD-YAML', 'title: [unterminated', '---', '# Broken'].join('\n')
    );

    expect(readWorkCards(tmpDir)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('malformed YAML'));
  });

  it('invalidates the cache when a file mtime and fingerprint change', () => {
    const filePath = writeCard('cache-card.md', validFrontmatter);
    const first = readWorkCards(tmpDir, 1_000);

    expect(first).toHaveLength(1);
    expect(first[0].title).toBe('Test work card');
    expect(first[0].status).toBe('planned');

    const changedFrontmatter = validFrontmatter
      .replace('title: Test work card', 'title: Updated test work card')
      .replace('status: ready', 'status: in_progress');
    fs.writeFileSync(filePath, `---\n${changedFrontmatter}\n---\n\n# Updated body with a different size\n`, 'utf8');
    const futureMtime = new Date(Date.now() + 60_000);
    fs.utimesSync(filePath, futureMtime, futureMtime);

    const second = readWorkCards(tmpDir, 2_000);

    expect(second).toHaveLength(1);
    expect(second[0].title).toBe('Updated test work card');
    expect(second[0].status).toBe('active');
    expect(second[0].lastUpdated).toBe(futureMtime.toISOString());
  });

  it('returns an empty array for an empty directory', () => {
    expect(readWorkCards(tmpDir)).toEqual([]);
  });

  it('filters out files with unknown work-card status instead of defaulting to planned', () => {
    writeCard('unknown-status.md', validFrontmatter.replace('status: ready', 'status: mystery'));

    expect(readWorkCards(tmpDir)).toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('missing or invalid required frontmatter'));
  });
});
