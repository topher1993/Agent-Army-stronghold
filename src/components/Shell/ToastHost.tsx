import { useEffect, useRef } from 'react';
import { Toast, useToast } from '../Controls/Toast';
import { useAnnounce } from './LiveRegionProvider';
export function ToastHost({ position = 'bottom-right' }: { position?: 'top-right' | 'bottom-right' | 'bottom-center' }) {
  const { toasts, dismissToast } = useToast();
  const announce = useAnnounce();
  const seen = useRef(new Set<string>());
  useEffect(() => {
    for (const toast of toasts) {
      if (seen.current.has(toast.id)) continue;
      seen.current.add(toast.id);
      announce(toast.tone === 'danger' ? 'Action failed' : (toast.title || 'Action completed'));
    }
  }, [announce, toasts]);
  return <div className={`toastHost toastHost--${position}`} role="region" aria-label="Notifications">{toasts.map(toast => <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />)}</div>;
}
