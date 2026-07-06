
import type { ReactNode } from 'react';
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: { label: string; onClick?: () => void; href?: string } }) {
  return <div className="emptyState" role="status" aria-label={title} data-empty-state>
    {icon ? <div className="emptyStateIcon" aria-hidden="true">{icon}</div> : null}
    <h3>{title}</h3>
    {description ? <p>{description}</p> : null}
    {action ? action.href ? <a className="btn-secondary" href={action.href}>{action.label}</a> : <button type="button" className="btn-secondary" onClick={action.onClick}>{action.label}</button> : null}
  </div>;
}
