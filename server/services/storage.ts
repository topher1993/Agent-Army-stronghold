import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function readJsonArray<T>(file: string): T[] {
  try { const data = JSON.parse(fs.readFileSync(file, 'utf8')); return Array.isArray(data) ? data as T[] : []; } catch { return []; }
}
export function atomicWriteJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', 'utf8');
  JSON.parse(fs.readFileSync(tmp, 'utf8'));
  fs.renameSync(tmp, file);
}
export function sha256(value: unknown): string {
  return crypto.createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}
