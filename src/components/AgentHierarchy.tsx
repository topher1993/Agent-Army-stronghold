// FEATURE — Phase E2 Layer 1: Agent Hierarchy.
//
// Live tree of the actual 6-agent Stronghold roster:
//   Belion (Coordinator)
//     ├── Igris (Engineering)
//     ├── Beru (Learning)
//     ├── GREED (Financial)
//     ├── Kaisel (Tool Division)
//     ├── Tusk (QC)
//     └── Sensei (Japanese Tutor)
//
// Each node shows a status dot with semantic color:
//   green  = healthy / idle
//   amber  = busy / warning
//   red    = critical
//   purple = AI ops
//   grey   = offline / paused
//
// Phase E2 sub-PR 1: status values are passed via props (mocked or wired).
// Phase E2 sub-PR 2: live data from /api/agents/registry + /api/agents/:id/health.

import React from 'react';

export type AgentStatus = 'healthy' | 'warning' | 'critical' | 'ai' | 'idle';

export type AgentNodeData = {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  /** Optional detail shown on the right (e.g. queue depth, last activity). */
  detail?: string;
  /** Optional busy indicator with custom label. */
  busyLabel?: string;
};

export type AgentHierarchyProps = {
  rootName?: string;
  rootRole?: string;
  agents: AgentNodeData[];
  /** Called when a node is clicked. */
  onSelectAgent?: (id: string) => void;
  /** data-testid for the root element. */
  testId?: string;
};

const DEFAULT_AGENTS: AgentNodeData[] = [
  { id: 'igris', name: 'Igris', role: 'Engineering', status: 'healthy' },
  { id: 'beru', name: 'Beru', role: 'Learning', status: 'healthy' },
  { id: 'greed', name: 'GREED', role: 'Financial', status: 'idle' },
  { id: 'kaisel', name: 'Kaisel', role: 'Tool Division', status: 'healthy' },
  { id: 'tusk', name: 'Tusk', role: 'QC', status: 'warning', busyLabel: '1 QC in flight' },
  { id: 'sensei', name: 'Sensei', role: 'Japanese Tutor', status: 'ai' },
];

export function AgentHierarchy({
  rootName = 'Belion',
  rootRole = 'Coordinator',
  agents = DEFAULT_AGENTS,
  onSelectAgent,
  testId = 'agent-hierarchy',
}: AgentHierarchyProps) {
  return (
    <div className="agentHierarchy" data-testid={testId}>
      <div className="agentHierarchy__title">Agent Hierarchy</div>

      <div className="agentHierarchy__root" data-testid={`${testId}-root`}>
        <span className="agentNode__dot agentNode__dot--healthy" aria-hidden="true" />
        <span className="name">{rootName}</span>
        <span className="role" style={{ marginLeft: 8 }}>{rootRole}</span>
      </div>

      <ul
        className="agentHierarchy__list"
        data-testid={`${testId}-list`}
        role="tree"
      >
        {agents.map((agent) => (
          <li key={agent.id} role="treeitem" aria-expanded="false">
            <button
              type="button"
              className="agentNode"
              onClick={() => onSelectAgent?.(agent.id)}
              data-testid={`${testId}-node-${agent.id}`}
              data-agent-id={agent.id}
              data-agent-status={agent.status}
            >
              <span
                className={`agentNode__dot agentNode__dot--${agent.status}`}
                aria-hidden="true"
              />
              <span className="agentNode__name">{agent.name}</span>
              <span className="agentNode__role" style={{ marginLeft: 6 }}>
                ({agent.role})
              </span>
              {agent.busyLabel && (
                <span className="agentNode__busy" style={{ marginLeft: 8 }}>
                  ◐ {agent.busyLabel}
                </span>
              )}
              {agent.detail && (
                <span className="agentNode__detail">{agent.detail}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
