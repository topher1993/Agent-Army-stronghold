import type { StrongholdSnapshot } from './types';

export async function loadSnapshot(): Promise<StrongholdSnapshot> {
  const response = await fetch('/data/stronghold-snapshot.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Snapshot unavailable: ${response.status}`);
  return response.json() as Promise<StrongholdSnapshot>;
}
