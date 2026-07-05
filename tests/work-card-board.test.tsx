import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  filterCards,
  groupCardsByStatus,
  uniqueOwners,
  WorkCardBoard,
} from '../src/components/WorkCardBoard';
import type { WorkCard } from '../src/types';

function makeCard(overrides: Partial<WorkCard> = {}): WorkCard {
  return {
    workCardId: 'WC-TEST-1',
    project: 'stronghold',
    risk: 'GREEN',
    owner: 'Igris',
    qc: 'Tusk',
    created: '2026-07-05',
    status: 'active',
    title: 'Test card',
    filePath: 'C:/tmp/test.md',
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe('WorkCardBoard pure helpers', () => {
  it('groups cards into the right status lanes', () => {
    const cards: WorkCard[] = [
      makeCard({ workCardId: 'A', status: 'planned' }),
      makeCard({ workCardId: 'B', status: 'active' }),
      makeCard({ workCardId: 'C', status: 'blocked' }),
      makeCard({ workCardId: 'D', status: 'review' }),
      makeCard({ workCardId: 'E', status: 'complete' }),
    ];
    const grouped = groupCardsByStatus(cards);
    expect(grouped.planned).toHaveLength(1);
    expect(grouped.active).toHaveLength(1);
    expect(grouped.blocked).toHaveLength(1);
    expect(grouped.review).toHaveLength(1);
    expect(grouped.complete).toHaveLength(1);
    expect(grouped.active[0].workCardId).toBe('B');
  });

  it('groups empty input into empty lanes', () => {
    const grouped = groupCardsByStatus([]);
    expect(Object.values(grouped).every(arr => arr.length === 0)).toBe(true);
  });

  it('filters by owner (case-insensitive)', () => {
    const cards = [
      makeCard({ workCardId: 'A', owner: 'Igris' }),
      makeCard({ workCardId: 'B', owner: 'Kaisel' }),
      makeCard({ workCardId: 'C', owner: 'igris' }),
    ];
    expect(filterCards(cards, { owner: 'Igris' }).map(c => c.workCardId)).toEqual(['A', 'C']);
  });

  it('filters by risk', () => {
    const cards = [
      makeCard({ workCardId: 'A', risk: 'GREEN' }),
      makeCard({ workCardId: 'B', risk: 'RED' }),
    ];
    expect(filterCards(cards, { risk: 'RED' }).map(c => c.workCardId)).toEqual(['B']);
  });

  it('stacks owner + risk filters', () => {
    const cards = [
      makeCard({ workCardId: 'A', owner: 'Igris', risk: 'GREEN' }),
      makeCard({ workCardId: 'B', owner: 'Igris', risk: 'RED' }),
      makeCard({ workCardId: 'C', owner: 'Kaisel', risk: 'RED' }),
    ];
    expect(filterCards(cards, { owner: 'Igris', risk: 'RED' }).map(c => c.workCardId)).toEqual(['B']);
  });

  it('treats empty filter strings as no-ops', () => {
    const cards = [makeCard({ workCardId: 'A' })];
    expect(filterCards(cards, { owner: '', risk: null })).toEqual(cards);
    expect(filterCards(cards, {})).toEqual(cards);
  });

  it('deduplicates and sorts owners', () => {
    const cards = [
      makeCard({ owner: 'Zara' }),
      makeCard({ owner: 'Igris' }),
      makeCard({ owner: 'Zara' }),
    ];
    expect(uniqueOwners(cards)).toEqual(['Igris', 'Zara']);
  });
});

describe('WorkCardBoard component', () => {
  it('renders the board shell even when no cards have loaded', () => {
    const html = renderToStaticMarkup(<WorkCardBoard refreshMs={999999} />);
    expect(html).toContain('data-work-card-board="true"');
    expect(html).toContain('Work Card Board');
    expect(html).toContain('planned');
    expect(html).toContain('active');
    expect(html).toContain('blocked');
    expect(html).toContain('review');
    expect(html).toContain('complete');
  });

  it('renders one lane per status with stable order', () => {
    const html = renderToStaticMarkup(<WorkCardBoard refreshMs={999999} />);
    const laneOrder = ['planned', 'active', 'blocked', 'review', 'complete'];
    let cursor = 0;
    for (const lane of laneOrder) {
      const index = html.indexOf(`data-lane="${lane}"`);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeGreaterThanOrEqual(cursor);
      cursor = index;
    }
  });

  it('renders filter controls', () => {
    const html = renderToStaticMarkup(<WorkCardBoard refreshMs={999999} />);
    expect(html).toContain('All owners');
    expect(html).toContain('All risks');
  });
});