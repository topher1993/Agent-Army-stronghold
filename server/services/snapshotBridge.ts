import fs from 'node:fs';
import path from 'node:path';
import { PROJECT_ROOT } from '../safety/pathGuard';
export function readSnapshot(): unknown {
  const file = path.join(PROJECT_ROOT, 'public', 'data', 'stronghold-snapshot.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
