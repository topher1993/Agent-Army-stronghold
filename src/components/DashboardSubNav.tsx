import { useCallback, useEffect, useState } from 'react';

/**
 * Phase 46: in-page sub-nav anchors. Each entry scrolls to the matching `id`
 * on the page; on mobile they collapse to a <select> jump menu.
 */
export const DASHBOARD_SUBNAV: Array<{ id: string; label: string }> = [
  { id: 'section-hero', label: 'Hero' },
  { id: 'section-health', label: 'Health' },
  { id: 'section-work', label: 'Work' },
  { id: 'section-coordination', label: 'Coordination' },
  { id: 'section-routing', label: 'Routing' },
  { id: 'section-memory', label: 'Status' },
];

export type DashboardSubNavProps = {
  items?: Array<{ id: string; label: string }>;
};

/**
 * Sticky in-page anchor jump bar. Each button smooth-scrolls to the matching
 * element by id. Wide viewports render horizontal pills; below 720px the list
 * collapses to a <select> jump menu.
 */
export function DashboardSubNav({ items = DASHBOARD_SUBNAV }: DashboardSubNavProps) {
  const [open, setOpen] = useState(false);

  const jumpTo = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <nav className="dashboardSubNav" aria-label="Dashboard sections">
      <ul className="dashboardSubNavList">
        {items.map(item => (
          <li key={item.id}>
            <button
              type="button"
              className="dashboardSubNavLink"
              onClick={() => jumpTo(item.id)}
              data-subnav-id={item.id}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <select
        className="dashboardSubNavSelect"
        aria-label="Jump to dashboard section"
        defaultValue=""
        onChange={event => {
          const value = event.target.value;
          if (value) {
            jumpTo(value);
            event.target.value = '';
            setOpen(true);
          }
        }}
      >
        <option value="">{open ? 'Jump to…' : 'Jump to…'}</option>
        {items.map(item => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
    </nav>
  );
}