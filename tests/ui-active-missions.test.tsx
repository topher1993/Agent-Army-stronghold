// FEATURE — Phase E2 Layer 1: Active Missions component tests.

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActiveMissions, type Mission } from '../src/components/ActiveMissions';

describe('ActiveMissions (Phase E2 Layer 1)', () => {
  it('sorts missions by priority (P0 first, P3 last)', () => {
    const missions: Mission[] = [
      { id: 'p3', name: 'low priority', priority: 'P3' },
      { id: 'p0', name: 'critical', priority: 'P0' },
      { id: 'p2', name: 'normal', priority: 'P2' },
      { id: 'p1', name: 'high', priority: 'P1' },
    ];
    const html = renderToStaticMarkup(<ActiveMissions missions={missions} />);
    const p0Idx = html.indexOf('data-testid="active-missions-row-p0"');
    const p1Idx = html.indexOf('data-testid="active-missions-row-p1"');
    const p2Idx = html.indexOf('data-testid="active-missions-row-p2"');
    const p3Idx = html.indexOf('data-testid="active-missions-row-p3"');
    expect(p0Idx).toBeGreaterThan(-1);
    expect(p0Idx).toBeLessThan(p1Idx);
    expect(p1Idx).toBeLessThan(p2Idx);
    expect(p2Idx).toBeLessThan(p3Idx);
  });

  it('renders the priority chip with semantic color modifier for each priority', () => {
    const missions: Mission[] = [
      { id: '1', name: 'a', priority: 'P0' },
      { id: '2', name: 'b', priority: 'P1' },
      { id: '3', name: 'c', priority: 'P2' },
      { id: '4', name: 'd', priority: 'P3' },
    ];
    const html = renderToStaticMarkup(<ActiveMissions missions={missions} />);
    expect(html).toContain('missionRow__priority--P0');
    expect(html).toContain('missionRow__priority--P1');
    expect(html).toContain('missionRow__priority--P2');
    expect(html).toContain('missionRow__priority--P3');
  });

  it('renders the empty state when no missions are provided', () => {
    const html = renderToStaticMarkup(<ActiveMissions missions={[]} />);
    expect(html).toContain('No active missions');
    expect(html).toContain('data-testid="active-missions-empty"');
  });

  it('renders the active count in the title', () => {
    const missions: Mission[] = [
      { id: '1', name: 'a', priority: 'P0' },
      { id: '2', name: 'b', priority: 'P2' },
    ];
    const html = renderToStaticMarkup(<ActiveMissions missions={missions} />);
    expect(html).toContain('2 active');
  });

  it('hides missions beyond defaultVisible and shows "Show all" toggle', () => {
    const missions: Mission[] = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i}`,
      name: `mission-${i}`,
      priority: 'P3' as const,
    }));
    const html = renderToStaticMarkup(<ActiveMissions missions={missions} defaultVisible={3} />);
    // Only 3 rows visible
    expect(html).toContain('data-testid="active-missions-row-m0"');
    expect(html).toContain('data-testid="active-missions-row-m2"');
    expect(html).not.toContain('data-testid="active-missions-row-m3"');
    // Toggle visible
    expect(html).toContain('Show all');
    expect(html).toContain('(5 more)');
  });

  it('renders agent and ETA when provided', () => {
    const missions: Mission[] = [
      { id: '1', name: 'fix bug', priority: 'P1', assignedAgent: 'Igris', eta: '2h' },
    ];
    const html = renderToStaticMarkup(<ActiveMissions missions={missions} />);
    expect(html).toContain('Igris');
    expect(html).toContain('2h');
  });
});
