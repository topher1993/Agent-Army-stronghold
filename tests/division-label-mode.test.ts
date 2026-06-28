import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_AGENT_TARGETS } from '../server/safety/agentAllowlist';
import { createAgentRequest, approveAgentRequest, enqueueAgentRequest } from '../server/services/agentRequestService';
import { dispatchMockAgentRequest } from '../server/services/mockAgentDispatcher';
import { ENGINEERING_DIVISION_ROSTER, ENGINEERING_DIVISION_TARGETS, PHASE3_DIVISION_EXECUTION_MODE, PHASE3_DIVISION_WRAPPER } from '../shared/divisions';

function tempAgentFiles() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stronghold-division-labels-'));
  const files = { requests: path.join(dir, 'agent-requests.json'), runs: path.join(dir, 'agent-runs.json'), artifacts: path.join(dir, 'agent-artifacts.json'), runLog: path.join(dir, 'agent-runs.jsonl'), audit: path.join(dir, 'audit-log.jsonl') };
  for (const file of [files.requests, files.runs, files.artifacts]) fs.writeFileSync(file, '[]');
  fs.writeFileSync(files.runLog, '');
  fs.writeFileSync(files.audit, '');
  return files;
}

describe('Engineering Division Phase 3 label mode', () => {
  it('declares division targets as mock-only roster labels aligned with the allowlist', () => {
    expect(PHASE3_DIVISION_EXECUTION_MODE).toBe('mock-label-only');
    expect(PHASE3_DIVISION_WRAPPER).toBe('mock');
    expect(ENGINEERING_DIVISION_TARGETS).toEqual(['igris', 'atlas', 'clix', 'forge', 'pulse', 'sentinel', 'vector', 'nexus']);
    expect(ENGINEERING_DIVISION_TARGETS.every(target => ALLOWED_AGENT_TARGETS.includes(target as never))).toBe(true);
    expect(ENGINEERING_DIVISION_ROSTER.every(entry => entry.executionMode === 'mock-label-only' && entry.wrapper === 'mock' && entry.owner === 'Igris')).toBe(true);
  });

  it('uses one shared mock dispatcher for every division target and records label metadata', () => {
    for (const targetAgent of ENGINEERING_DIVISION_TARGETS) {
      const files = tempAgentFiles();
      const request = createAgentRequest(files.requests, { kind: 'mission.plan', title: `Plan ${targetAgent}`, prompt: 'Summarize safe next step', requestedBy: 'Chris', targetAgent });
      const approved = approveAgentRequest(files.requests, request.id, 'Igris');
      const queued = enqueueAgentRequest(files.requests, approved.id);
      const { run, artifact } = dispatchMockAgentRequest(files, queued.id);

      expect(run.wrapper).toBe('mock');
      expect(run.targetAgent).toBe(targetAgent);
      expect(artifact.requiresHumanApply).toBe(true);
      expect(artifact.metadata).toEqual({
        divisionTarget: targetAgent,
        divisionExecutionMode: 'mock-label-only',
        wrapper: 'mock',
        behavior: 'shared-mock-dispatcher',
      });
    }
  });

  it('documents that division targets are labels, not real dispatch behavior', () => {
    const readme = fs.readFileSync('README.md', 'utf8');
    const architecture = fs.readFileSync('docs/phase-3-architecture.md', 'utf8');
    const operations = fs.readFileSync('docs/phase-3-operations.md', 'utf8');
    expect(readme).toContain('Engineering Division targets are roster labels');
    expect(architecture).toContain('not behaviorally distinct executors');
    expect(operations).toContain('does not invoke that specialist\'s wrapper');
  });

  it('keeps the generated snapshot and roster data explicit about label-only dispatch', () => {
    const snapshot = JSON.parse(fs.readFileSync('public/data/stronghold-snapshot.json', 'utf8')) as { roster: Array<{ target?: string; name: string; wrapper: string; executionMode?: string; behavior?: string; dispatchNote?: string }> };
    const divisionAgents = snapshot.roster.filter(agent => ENGINEERING_DIVISION_TARGETS.includes(agent.target as never));
    expect(divisionAgents.map(agent => agent.target)).toEqual(ENGINEERING_DIVISION_TARGETS);
    expect(divisionAgents.every(agent => agent.wrapper === 'mock' && agent.executionMode === 'mock-label-only' && agent.behavior === 'shared-mock-dispatcher')).toBe(true);
    expect(divisionAgents.every(agent => agent.dispatchNote?.includes('does not invoke this specialist wrapper'))).toBe(true);

    // Phase D brief removed the on-screen Roster / Inventory cards (their data was
    // stale/fake). The label-only + dispatch semantics now live entirely in the
    // snapshot + the Orchestration panel + the docs. The dashboard surfaces the
    // snapshot-driven counts via the Agentic OS hero stats, so we assert that
    // path instead.
    const appSource = fs.readFileSync('src/App.tsx', 'utf8');
    const dashboardSource = fs.readFileSync('src/components/AgenticOsDashboard.tsx', 'utf8');
    expect(appSource).toContain('AgenticOsDashboardPanel');
    expect(dashboardSource).toContain('buildHeroStats');
    expect(dashboardSource).toContain('snapshot.health');

    const orchestrationSource = fs.readFileSync('src/components/AgentOrchestration.tsx', 'utf8');
    expect(orchestrationSource).toContain('all dispatch remains mock-only');
  });
});
