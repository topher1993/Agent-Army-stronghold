
import type { ReactNode } from 'react';
import { Sidebar, type SurfaceId } from '../Sidebar';
import { ToastProvider } from '../Controls/Toast';
import { ToastHost } from './ToastHost';
import { LiveRegionProvider } from './LiveRegionProvider';
export function AppShell({ children, activeSurface, onSurfaceChange, collapsed = false, onToggleCollapsed, approvalCount = null, backendOk = true, mobileNavOpen = false, onMobileNavigate }: { children: ReactNode; activeSurface: SurfaceId; onSurfaceChange: (id: SurfaceId) => void; collapsed?: boolean; onToggleCollapsed?: () => void; approvalCount?: number | null; backendOk?: boolean; mobileNavOpen?: boolean; onMobileNavigate?: () => void }) { return <ToastProvider><LiveRegionProvider><div className={`appShell ${collapsed ? 'appShellCollapsed' : ''} ${mobileNavOpen ? 'appShell--mobile-open' : ''}`}><Sidebar active={activeSurface} onSelect={onSurfaceChange} collapsed={collapsed} onToggleCollapsed={onToggleCollapsed || (() => undefined)} approvalCount={approvalCount} backendOk={backendOk} onMobileNavigate={onMobileNavigate} /><main id="main-content" className="appShellMain" data-surface-active={activeSurface}>{children}</main><ToastHost /></div></LiveRegionProvider></ToastProvider>; }
