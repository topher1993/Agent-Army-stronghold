// FEATURE — Phase E2 Layer 0: Status Banner component tests.

import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusBanner } from '../src/components/StatusBanner';

describe('StatusBanner (Phase E2 Layer 0)', () => {
  it('renders the system health pill with the correct label for each state', () => {
    const states: Array<['healthy' | 'warning' | 'critical' | 'offline', string]> = [
      ['healthy', 'HEALTHY'],
      ['warning', 'DEGRADED'],
      ['critical', 'CRITICAL'],
      ['offline', 'OFFLINE'],
    ];
    for (const [health, label] of states) {
      const html = renderToStaticMarkup(
        <StatusBanner health={health} alerts={{ critical: 0, warning: 0, info: 0 }} aiOpsActive={0} />
      );
      expect(html).toContain(`statusBanner__pill--${health}`);
      expect(html).toContain(label);
    }
  });

  it('renders alert counts as colored dots with numeric labels', () => {
    const html = renderToStaticMarkup(
      <StatusBanner
        health="healthy"
        alerts={{ critical: 3, warning: 2, info: 7 }}
        aiOpsActive={2}
      />
    );
    expect(html).toContain('>3<');
    expect(html).toContain('>2<');
    expect(html).toContain('>7<');
    // Numeric AI ops count
    expect(html).toContain('OPS · 2 active');
  });

  it('renders "no alerts" affordance when all counts are zero', () => {
    const html = renderToStaticMarkup(
      <StatusBanner
        health="healthy"
        alerts={{ critical: 0, warning: 0, info: 0 }}
        aiOpsActive={0}
      />
    );
    expect(html).toContain('no alerts');
  });

  it('renders a fixed timestamp when provided as a prop', () => {
    const html = renderToStaticMarkup(
      <StatusBanner
        health="healthy"
        alerts={{ critical: 0, warning: 0, info: 0 }}
        aiOpsActive={0}
        timestamp="2026-06-28 18:30:00Z"
      />
    );
    expect(html).toContain('2026-06-28 18:30:00Z');
    expect(html).toContain('statusBanner__timestamp');
  });

  it('renders the kill switch button', () => {
    const html = renderToStaticMarkup(
      <StatusBanner health="healthy" alerts={{ critical: 0, warning: 0, info: 0 }} aiOpsActive={0} />
    );
    expect(html).toContain('statusBanner__killSwitch');
    expect(html).toContain('KILL');
  });

  it('calls onOpenAlertCenter when the alert count button is clicked', () => {
    let clicked = false;
    const onOpen = () => { clicked = true; };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <StatusBanner
          health="healthy"
          alerts={{ critical: 1, warning: 0, info: 0 }}
          aiOpsActive={0}
          onOpenAlertCenter={onOpen}
        />
      );
    });
    const btn = container.querySelector('[data-testid="status-banner-alerts"]') as HTMLButtonElement | null;
    expect(btn).toBeTruthy();
    act(() => { btn!.click(); });
    expect(clicked).toBe(true);
    act(() => { root.unmount(); });
    document.body.removeChild(container);
  });
});
