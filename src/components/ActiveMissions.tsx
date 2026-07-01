// FEATURE — Phase E2 Layer 1: Active Missions.
//
// Compact list of in-flight work sorted by priority (P0 → P3) then age.
// Each row: priority chip · plan name · assigned agent · ETA.
//
// Phase E2 sub-PR 1: missions passed via props (mocked or wired from
// the snapshot). In sub-PR 2 they'll come from a live /api/missions feed.

import React from 'react';

export type MissionPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type Mission = {
  id: string;
  name: string;
  priority: MissionPriority;
  assignedAgent?: string;
  /** Relative or absolute ETA string (e.g. "2m", "01:30"). */
  eta?: string;
};

export type ActiveMissionsProps = {
  missions: Mission[];
  /** Default visible count. Set to Infinity to show all. */
  defaultVisible?: number;
  onSelectMission?: (id: string) => void;
  /** data-testid for the root element. */
  testId?: string;
};

const PRIORITY_LABEL: Record<MissionPriority, string> = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
  P3: 'P3',
};

const PRIORITY_ORDER: Record<MissionPriority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

export function ActiveMissions({
  missions,
  defaultVisible = 5,
  onSelectMission,
  testId = 'active-missions',
}: ActiveMissionsProps) {
  const [expanded, setExpanded] = React.useState(false);

  const sorted = React.useMemo(
    () =>
      [...missions].sort(
        (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      ),
    [missions]
  );

  const visibleCount = expanded ? sorted.length : Math.min(defaultVisible, sorted.length);
  const visible = sorted.slice(0, visibleCount);
  const hidden = sorted.length - visible.length;

  return (
    <div className="activeMissions" data-testid={testId}>
      <div className="activeMissions__title">
        <span>Active Missions</span>
        <span className="activeMissions__count" data-testid={`${testId}-count`}>
          {sorted.length} active
        </span>
      </div>

      {sorted.length === 0 ? (
        <div
          className="missionRow"
          style={{ color: 'var(--text-quaternary)', justifyContent: 'center' }}
          data-testid={`${testId}-empty`}
        >
          No active missions
        </div>
      ) : (
        <ul
          style={{ listStyle: 'none', margin: 0, padding: 0 }}
          data-testid={`${testId}-list`}
        >
          {visible.map((mission) => (
            <li key={mission.id} className="missionRow" data-testid={`${testId}-row-${mission.id}`}>
              <button
                type="button"
                onClick={() => onSelectMission?.(mission.id)}
                style={{
                  display: 'contents',
                  background: 'transparent',
                  border: 'none',
                  cursor: onSelectMission ? 'pointer' : 'default',
                  padding: 0,
                  color: 'inherit',
                  font: 'inherit',
                }}
                aria-label={`Select mission ${mission.name}`}
              >
                <span
                  className={`missionRow__priority missionRow__priority--${mission.priority}`}
                >
                  {PRIORITY_LABEL[mission.priority]}
                </span>
                <span className="missionRow__name">{mission.name}</span>
                {mission.assignedAgent && (
                  <span className="missionRow__agent">· {mission.assignedAgent}</span>
                )}
                {mission.eta && (
                  <span className="missionRow__eta">{mission.eta}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-testid={`${testId}-toggle`}
          style={{
            marginTop: 'var(--space-1)',
            width: '100%',
            padding: '8px',
            background: 'transparent',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-tertiary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          {expanded ? `Show less` : `Show all (${hidden} more)`}
        </button>
      )}
    </div>
  );
}
