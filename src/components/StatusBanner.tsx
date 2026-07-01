// FEATURE — Phase E2 Layer 0: Status Banner.
//
// Full-width strip across the top of the dashboard. Always visible.
// Renders: system health · alert counts · AI ops heartbeat · timestamp.
//
// Phase E2 sub-PR 1: renders with mocked/wired-up data via the same pattern
// as MemoryStatusPanel. In sub-PR 2 the alert counts will be wired to
// the new /api/alerts endpoint.

import React, { useEffect, useState } from 'react';

export type SystemHealth = 'healthy' | 'warning' | 'critical' | 'offline';
export type AlertCounts = { critical: number; warning: number; info: number };

export type StatusBannerProps = {
  health: SystemHealth;
  alerts: AlertCounts;
  aiOpsActive: number;
  onOpenAlertCenter?: () => void;
  onActivateKillSwitch?: () => void;
  /** Override the timestamp; defaults to now() updated every second. */
  timestamp?: string;
  /** data-testid for the root element. */
  testId?: string;
};

const HEALTH_LABEL: Record<SystemHealth, string> = {
  healthy: 'HEALTHY',
  warning: 'DEGRADED',
  critical: 'CRITICAL',
  offline: 'OFFLINE',
};

export function StatusBanner({
  health,
  alerts,
  aiOpsActive,
  onOpenAlertCenter,
  onActivateKillSwitch,
  timestamp,
  testId = 'status-banner',
}: StatusBannerProps) {
  const [now, setNow] = useState<string>(() => new Date().toISOString().slice(0, 19).replace('T', ' ') + 'Z');

  useEffect(() => {
    if (timestamp) return;
    const id = window.setInterval(() => {
      setNow(new Date().toISOString().slice(0, 19).replace('T', ' ') + 'Z');
    }, 1000);
    return () => window.clearInterval(id);
  }, [timestamp]);

  const totalAlerts = alerts.critical + alerts.warning + alerts.info;

  return (
    <div className="statusBanner" data-testid={testId} role="status" aria-live="polite">
      <div className="statusBanner__group">
        <span
          className={`statusBanner__pill statusBanner__pill--${health}`}
          data-testid={`${testId}-health`}
        >
          <span className="dot" aria-hidden="true" />
          {HEALTH_LABEL[health]}
        </span>
      </div>

      <button
        type="button"
        className="statusBanner__alertCount"
        onClick={onOpenAlertCenter}
        data-testid={`${testId}-alerts`}
        aria-label={`Open Alert Center: ${alerts.critical} critical, ${alerts.warning} warning, ${alerts.info} info`}
      >
        <span aria-hidden="true" style={{ color: 'var(--semantic-critical)' }}>●</span>
        <span className={`count ${alerts.critical === 0 ? 'count--zero' : ''}`}>{alerts.critical}</span>
        <span aria-hidden="true" style={{ color: 'var(--semantic-warning)' }}>●</span>
        <span className={`count ${alerts.warning === 0 ? 'count--zero' : ''}`}>{alerts.warning}</span>
        <span aria-hidden="true" style={{ color: 'var(--semantic-info)' }}>●</span>
        <span className={`count ${alerts.info === 0 ? 'count--zero' : ''}`}>{alerts.info}</span>
        {totalAlerts === 0 && <span style={{ color: 'var(--text-quaternary)', marginLeft: 4 }}>no alerts</span>}
      </button>

      <div className="statusBanner__group">
        <span
          className="statusBanner__pill statusBanner__pill--ai"
          data-testid={`${testId}-ai-ops`}
          aria-label={`AI ops: ${aiOpsActive} active`}
        >
          <span className="dot" aria-hidden="true" />
          OPS · {aiOpsActive} active
        </span>
      </div>

      <div className="statusBanner__group statusBanner__group--right">
        <span className="statusBanner__timestamp" data-testid={`${testId}-timestamp`}>
          {timestamp ?? now}
        </span>
        <button
          type="button"
          className="statusBanner__killSwitch"
          onClick={onActivateKillSwitch}
          data-testid={`${testId}-kill-switch`}
          aria-label="Activate kill switch"
        >
          KILL
        </button>
      </div>
    </div>
  );
}
