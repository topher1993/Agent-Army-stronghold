
import type { WorkCardStatus } from '../../types';
import { StatusPill, type StatusPillTone } from '../Feedback/StatusPill';
const toneByStatus: Record<WorkCardStatus, StatusPillTone> = { planned: 'neutral', active: 'info', blocked: 'warning', review: 'accent', complete: 'success' };
export function WorkCard({ id, title, subtitle, laneId, owner, status, priority = 'normal', dueAt, href, selected, onOpen }: { id: string; title: string; subtitle?: string; laneId: WorkCardStatus; owner?: { id: string; name: string; avatarUrl?: string } | string; status: WorkCardStatus; priority?: 'low' | 'normal' | 'high' | 'critical'; dueAt?: string; href?: string; selected?: boolean; onOpen?: (id: string) => void }) {
  const ownerName = typeof owner === 'string' ? owner : owner?.name;
  const content = <><div className="workCardPrimitiveHeader"><h4>{title}</h4><StatusPill tone={toneByStatus[status]} label={status} /></div>{subtitle ? <p className="muted workCardPrimitiveSubtitle">{subtitle}</p> : null}<footer><span>{ownerName || 'Unassigned'}</span>{dueAt ? <span>{new Date(dueAt).toLocaleDateString()}</span> : null}<span className={`priorityDot priorityDot--${priority}`} aria-label={`Priority ${priority}`} /></footer></>;
  const props = { className: `workCardPrimitive ${selected ? 'workCardPrimitive--selected' : ''}`, 'data-lane-id': laneId, 'data-card-id': id } as const;
  return href ? <a {...props} href={href}>{content}</a> : <button {...props} type="button" onClick={() => onOpen?.(id)}>{content}</button>;
}
