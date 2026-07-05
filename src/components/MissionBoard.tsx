import { useMemo } from 'react';
import type { Mission } from '../types';

const LANES: Mission['status'][] = ['planned', 'active', 'blocked', 'review', 'complete'];

export type MissionBoardProps = {
  missions: Mission[];
};

export function MissionBoard({ missions }: MissionBoardProps) {
  const grouped = useMemo(
    () =>
      Object.fromEntries(
        LANES.map(lane => [lane, missions.filter(m => m.status === lane)]),
      ) as Record<Mission['status'], Mission[]>,
    [missions],
  );

  return (
    <section className="panel wide" aria-label="Mission Board">
      <h2>Mission Board</h2>
      <div className="lanes">
        {LANES.map(lane => (
          <div className="lane" key={lane} data-lane={lane}>
            <h3>{lane}</h3>
            {grouped[lane].map(m => (
              <details className="mission missionDisclosure" key={m.id} data-mission-id={m.id}>
                <summary>
                  <strong>{m.title}</strong>
                  <span aria-hidden="true">▾</span>
                </summary>
                <p>{m.summary}</p>
                <small>{m.owner} · {m.priority} · {m.specialists.join(', ')}</small>
              </details>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}