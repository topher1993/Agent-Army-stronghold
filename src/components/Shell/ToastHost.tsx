
import { Toast, useToast } from '../Controls/Toast';
export function ToastHost({ position = 'bottom-right' }: { position?: 'top-right' | 'bottom-right' | 'bottom-center' }) { const { toasts, dismissToast } = useToast(); return <div className={`toastHost toastHost--${position}`} role="region" aria-label="Notifications">{toasts.map(toast => <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />)}</div>; }
