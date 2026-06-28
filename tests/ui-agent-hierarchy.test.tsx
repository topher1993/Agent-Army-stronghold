// FEATURE — Phase E2 Layer 1: Agent Hierarchy component tests.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AgentHierarchy, type AgentNodeData } from '../src/components/AgentHierarchy';

describe('AgentHierarchy (Phase E2 Layer 1)', () => {
  it('renders the default 6-agent Stronghold roster when no agents prop is passed', () => {
    const html = renderToStaticMarkup(<AgentHierarchy />);
    expect(html).toContain('Igris');
    expect(html).toContain('Beru');
    expect(html).toContain('GREED');
    expect(html).toContain('Kaisel');
    expect(html).toContain('Tusk');
    expect(html).toContain('Sensei');
    expect(html).toContain('Belion');
  });

  it('renders the root pill with the coordinator label', () => {
    const html = renderToStaticMarkup(
      <AgentHierarchy rootName="Belion" rootRole="Coordinator" agents={[]} />
    );
    expect(html).toContain('Belion');
    expect(html).toContain('Coordinator');
    expect(html).toContain('agentHierarchy__root');
  });

  it('renders one button per agent with data-agent-id', () => {
    const agents: AgentNodeData[] = [
      { id: 'igris', name: 'Igris', role: 'Engineering', status: 'healthy' },
      { id: 'kaisel', name: 'Kaisel', role: 'Tool Division', status: 'warning' },
    ];
    const html = renderToStaticMarkup(<AgentHierarchy agents={agents} />);
    expect(html).toContain('data-agent-id="igris"');
    expect(html).toContain('data-agent-id="kaisel"');
  });

  it('applies the correct status dot modifier for each status type', () => {
    const agents: AgentNodeData[] = [
      { id: 'a', name: 'A', role: 'r', status: 'healthy' },
      { id: 'b', name: 'B', role: 'r', status: 'warning' },
      { id: 'c', name: 'C', role: 'r', status: 'critical' },
      { id: 'd', name: 'D', role: 'r', status: 'ai' },
      { id: 'e', name: 'E', role: 'r', status: 'idle' },
    ];
    const html = renderToStaticMarkup(<AgentHierarchy agents={agents} />);
    expect(html).toContain('agentNode__dot--healthy');
    expect(html).toContain('agentNode__dot--warning');
    expect(html).toContain('agentNode__dot--critical');
    expect(html).toContain('agentNode__dot--ai');
    expect(html).toContain('agentNode__dot--idle');
  });

  it('renders a busy pill when busyLabel is provided', () => {
    const agents: AgentNodeData[] = [
      { id: 'tusk', name: 'Tusk', role: 'QC', status: 'warning', busyLabel: '1 QC in flight' },
    ];
    const html = renderToStaticMarkup(<AgentHierarchy agents={agents} />);
    expect(html).toContain('1 QC in flight');
    expect(html).toContain('agentNode__busy');
  });
});
