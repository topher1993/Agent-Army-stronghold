import type { Mission } from '../../shared/types';
import { missionFromInput, validateMissionInput } from '../schemas/mission';
import { readJsonArray, atomicWriteJson } from './storage';

export function createMissionFromProposal(file: string, input: Record<string, unknown>, actor: string): Mission {
  const valid = validateMissionInput(input);
  if (!valid.ok) throw new Error(valid.errors.join('; '));
  const missions = readJsonArray<Mission>(file);
  const mission = missionFromInput(input, actor);
  if (missions.some(m => m.id === mission.id)) throw new Error('duplicate mission id');
  atomicWriteJson(file, [...missions, mission]);
  return mission;
}
export function updateMissionFromProposal(file: string, id: string, patch: Partial<Mission>, actor: string): Mission {
  const valid = validateMissionInput(patch, true);
  if (!valid.ok) throw new Error(valid.errors.join('; '));
  const missions = readJsonArray<Mission>(file);
  const index = missions.findIndex(m => m.id === id);
  if (index < 0) throw new Error(`mission not found: ${id}`);
  const updated = { ...missions[index], ...patch, updatedAt: new Date().toISOString(), createdAt: missions[index].createdAt, createdBy: missions[index].createdBy } as Mission;
  missions[index] = updated;
  atomicWriteJson(file, missions);
  void actor;
  return updated;
}
