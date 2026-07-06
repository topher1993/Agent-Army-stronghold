import { useCallback, useEffect, useState } from 'react';
import { strongholdApi, type ApprovalCard } from '../api/strongholdApi';

export type SurfaceId =
  | 'dashboard'
  | 'work'
  | 'missions'
  | 'subagents'
  | 'operations'
  | 'approvals'
  | 'cron';

type SurfaceDef = {
  id: SurfaceId;
  label: string;
  icon: string; // SVG path data
  description: string;
};

const ICON = {
  // Lucide-style 24x24 stroke icons (1.5px stroke, currentColor)
  // Dashboard = grid of 4 squares
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  // Work = stacked layers
  work: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  // Missions = target / bullseye
  missions: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12zM12 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4z',
  // Subagents = users
  subagents: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  // Operations = gear
  operations: 'M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  // Approvals = check circle
  approvals: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
  // Cron = clock
  cron: 'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM12 6v6l4 2',
} as const;

export const SURFACES: SurfaceDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: ICON.dashboard, description: 'Hero stats, QC, work items, activity, memory' },
  { id: 'work', label: 'Work', icon: ICON.work, description: 'Work Card Board — lane-grouped, filterable' },
  { id: 'missions', label: 'Missions', icon: ICON.missions, description: 'Mission Board — planned through complete' },
  { id: 'subagents', label: 'Subagents', icon: ICON.subagents, description: 'Profiles, wrappers, skills, and missions' },
  { id: 'operations', label: 'Operations', icon: ICON.operations, description: 'Proposals, audit, orchestration, safety' },
  { id: 'approvals', label: 'Approvals', icon: ICON.approvals, description: 'Pending change requests awaiting decision' },
  { id: 'cron', label: 'Cron', icon: ICON.cron, description: 'Scheduled jobs — pause, edit, run, delete' },
];

const STORAGE_ACTIVE = 'stronghold:activeSurface';
const STORAGE_COLLAPSED = 'stronghold:sidebarCollapsed';

function readStoredSurface(): SurfaceId {
  if (typeof window === 'undefined') return 'dashboard';
  try {
    const stored = window.localStorage.getItem(STORAGE_ACTIVE);
    if (stored && SURFACES.some(s => s.id === stored)) return stored as SurfaceId;
  } catch { /* ignore quota / disabled storage */ }
  return 'dashboard';
}

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_COLLAPSED) === 'true';
  } catch {
    return false;
  }
}

export function useActiveSurface(): [SurfaceId, (next: SurfaceId) => void] {
  const [active, setActive] = useState<SurfaceId>(readStoredSurface);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_ACTIVE, active); } catch { /* ignore */ }
  }, [active]);
  return [active, setActive];
}

export function useSidebarCollapsed(): [boolean, (next: boolean | ((prev: boolean) => boolean)) => void] {
  const [collapsed, setCollapsedState] = useState<boolean>(readStoredCollapsed);
  const setCollapsed = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState(typeof next === 'function' ? (next as (prev: boolean) => boolean)(collapsed) : next);
  }, [collapsed]);
  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_COLLAPSED, String(collapsed)); } catch { /* ignore */ }
  }, [collapsed]);
  return [collapsed, setCollapsed];
}

/**
 * Pending-approvals count for the sidebar badge. Polls /api/approvals every 30s.
 * Returns null when the backend is unreachable (hides the badge rather than
 * showing a misleading 0).
 */
export function usePendingApprovalCount(refreshKey = 0): number | null {
  const [count, setCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const cards = await strongholdApi.listApprovals();
      const pending = Array.isArray(cards) ? cards.filter((c: ApprovalCard) => c.status === 'pending').length : 0;
      setCount(pending);
    } catch {
      setCount(null);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(load, 30_000);
    return () => window.clearInterval(id);
  }, [load, refreshKey]);

  return count;
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg
      className="sidebarIconSvg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export type SidebarProps = {
  active: SurfaceId;
  onSelect: (next: SurfaceId) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  approvalCount: number | null;
  onMobileNavigate?: () => void;
  backendOk?: boolean;
};

/**
 * Left-rail navigation. Two visual modes:
 *  - Expanded (default, 244px): icon + label + optional count badge
 *  - Collapsed (60px): icon-only via chevron toggle
 *
 * Mobile (<720px): the sidebar becomes a slide-in overlay triggered by a
 * hamburger button (rendered separately by the parent layout).
 */
export function Sidebar({ active, onSelect, collapsed, onToggleCollapsed, approvalCount, onMobileNavigate, backendOk = true }: SidebarProps) {
  const widthPx = collapsed ? 60 : 244;

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      aria-label="Stronghold surfaces"
      data-sidebar
      data-sidebar-collapsed={collapsed ? 'true' : 'false'}
      style={{ width: `${widthPx}px` }}
    >
      <div className="sidebarHeader">
        <span className="sidebarLogo" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </span>
        {!collapsed ? (
          <div className="sidebarBrandBlock">
            <span className="sidebarBrand">Stronghold</span>
            <span className="sidebarSubBrand">Engineering</span>
          </div>
        ) : null}
      </div>

      <nav className="sidebarNav" aria-label="Surfaces">
        <ul className="sidebarList">
          {SURFACES.map(surface => {
            const isActive = surface.id === active;
            const showBadge = surface.id === 'approvals' && approvalCount !== null && approvalCount > 0;
            return (
              <li key={surface.id}>
                <button
                  type="button"
                  className={`sidebarItem ${isActive ? 'sidebarItem--active' : ''}`}
                  onClick={() => {
                    onSelect(surface.id);
                    onMobileNavigate?.();
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={collapsed ? surface.label : undefined}
                  title={surface.description}
                  data-surface-id={surface.id}
                  data-sidebar-item={surface.id}
                >
                  <span className="sidebarIcon"><Icon d={surface.icon} /></span>
                  {!collapsed ? <span className="sidebarLabel">{surface.label}</span> : null}
                  {!collapsed && showBadge ? (
                    <span className="sidebarBadge" data-sidebar-badge="approvals">{approvalCount}</span>
                  ) : null}
                  {collapsed && showBadge ? (
                    <span className="sidebarBadgeDot" aria-label={`${approvalCount} pending`} />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="sidebarFooter">
        {!collapsed ? (
          <div className="sidebarStatusRow">
            <span className={`sidebarStatusDot ${backendOk ? 'sidebarStatusDot--live' : 'sidebarStatusDot--down'}`} aria-hidden="true" />
            <span className="sidebarStatusLabel">{backendOk ? 'Backend live' : 'Backend offline'}</span>
          </div>
        ) : (
          <span className={`sidebarStatusDot sidebarStatusDot--center ${backendOk ? 'sidebarStatusDot--live' : 'sidebarStatusDot--down'}`} aria-hidden="true" title={backendOk ? 'Backend live' : 'Backend offline'} />
        )}
        <button
          type="button"
          className="sidebarToggle"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-sidebar-toggle
        >
          {collapsed ? '›' : '‹ Collapse'}
        </button>
      </div>
    </aside>
  );
}