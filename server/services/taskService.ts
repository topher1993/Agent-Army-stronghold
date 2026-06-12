import type { Task } from '../../shared/types';
import { taskFromInput, validateTaskInput } from '../schemas/task';
import { readJsonArray, atomicWriteJson } from './storage';

export function createTaskFromProposal(file: string, input: Record<string, unknown>, actor: string): Task {
  const valid = validateTaskInput(input);
  if (!valid.ok) throw new Error(valid.errors.join('; '));
  const tasks = readJsonArray<Task>(file);
  const task = taskFromInput(input, actor);
  atomicWriteJson(file, [...tasks, task]);
  return task;
}
export function updateTaskFromProposal(file: string, id: string, patch: Partial<Task>, actor: string): Task {
  const valid = validateTaskInput(patch, true);
  if (!valid.ok) throw new Error(valid.errors.join('; '));
  const tasks = readJsonArray<Task>(file);
  const index = tasks.findIndex(t => t.id === id);
  if (index < 0) throw new Error(`task not found: ${id}`);
  const updated = { ...tasks[index], ...patch, updatedAt: new Date().toISOString(), createdAt: tasks[index].createdAt, createdBy: tasks[index].createdBy } as Task;
  tasks[index] = updated;
  atomicWriteJson(file, tasks);
  void actor;
  return updated;
}
