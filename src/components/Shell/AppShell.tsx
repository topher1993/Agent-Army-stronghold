import { useEffect, useState, type ReactNode } from 'react';
import { Sidebar, type SurfaceId } from '../Sidebar';
import { ToastProvider } from '../Controls/Toast';
import { ToastHost } from './ToastHost';
import { LiveRegionProvider, useAnnounce } from './LiveRegionProvider';
import { Palette } from './Palette';

type AppShellProps = {
  children: ReactNode;
  activeSurface: SurfaceId;
  onSurfaceChange: (id: SurfaceId) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  approvalCount?: number | null;
  backendOk?: boolean;
  mobileNavOpen?: boolean;
  onMobileNavigate?: () => void;
  onMobileToggle?: () => void;
  onRefreshEverything?: () => void;
};

export function AppShell(props: AppShellProps) {
  return <ToastProvider><LiveRegionProvider><AppShellInner {...props} /></LiveRegionProvider></ToastProvider>;
}

function AppShellInner({ children, activeSurface, onSurfaceChange, collapsed = false, onToggleCollapsed, approvalCount = null, backendOk = true, mobileNavOpen = false, onMobileNavigate, onMobileToggle, onRefreshEverything }: AppShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const announce = useAnnounce();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(value => !value);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    announce(`Navigated to ${labelForSurface(activeSurface)}`);
  }, [activeSurface, announce]);

  return (
    <div className={`appShell ${collapsed ? 'appShell--sidebar-collapsed' : ''} ${mobileNavOpen ? 'appShell--mobile-open' : ''}`}>
      <button
        type="button"
        className="mobileNavTrigger"
        onClick={onMobileToggle}
        aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileNavOpen}
        data-mobile-nav-trigger
      >
        {mobileNavOpen ? '✕' : '☰'}
      </button>
      {mobileNavOpen ? <div className="mobileNavBackdrop" onClick={onMobileNavigate} aria-hidden="true" data-mobile-nav-backdrop /> : null}
      <Sidebar
        active={activeSurface}
        onSelect={onSurfaceChange}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed || (() => undefined)}
        approvalCount={approvalCount}
        backendOk={backendOk}
        onMobileNavigate={onMobileNavigate}
      />
      <main id="main-content" className="appShellMain" data-surface-active={activeSurface}>{children}</main>
      <ToastHost />
      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} onSurfaceChange={onSurfaceChange} onRefreshEverything={onRefreshEverything} />
    </div>
  );
}

function labelForSurface(surface: SurfaceId) {
  return surface.charAt(0).toUpperCase() + surface.slice(1);
}
