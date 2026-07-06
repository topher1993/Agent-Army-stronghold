
import { StatusPillTone } from '../Feedback/StatusPill';
export function AgenticOsCard({ label, value, tone, description, cta }: { label: string; value: string | number; tone: Exclude<StatusPillTone, 'info'>; description?: string; cta?: { label: string; href: string } }) {
  return <article className={`agenticOsCardPrimitive agenticOsCardPrimitive--${tone}`}><p className="statLabel">{label}</p><strong className="statValue">{value}</strong>{description ? <p className="statHint">{description}</p> : null}{cta ? <a className="btn-secondary" href={cta.href}>{cta.label}</a> : null}</article>;
}
