
import type { ReactNode } from 'react';

export type StatusPillTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'accent';
export type StatusPillProps = { tone: StatusPillTone; label?: string; size?: 'sm' | 'md'; icon?: 'check' | 'x' | 'dot' | 'spinner' | 'pause' | 'play'; children?: ReactNode; 'aria-label'?: string };

export function StatusPill({ tone, label, children, size = 'sm', icon = 'dot', 'aria-label': ariaLabel }: StatusPillProps) {
  const text = label ?? children;
  return <span className={`statusPill statusPill--${tone} statusPill--${size}`} aria-label={ariaLabel} data-status-pill={tone}>
    <span className={`statusPillIcon statusPillIcon--${icon}`} aria-hidden="true">{icon === 'check' ? '✓' : icon === 'x' ? '×' : icon === 'pause' ? 'Ⅱ' : icon === 'play' ? '▶' : ''}</span>
    <span>{text}</span>
  </span>;
}
