
import { useId } from 'react';
import { StatusPill } from '../Feedback/StatusPill';
export function Stat({ label, value, unit, delta, hint, tooltip, id, tone = 'default' }: { label: string; value: string | number; unit?: string; delta?: { value: string; tone: 'success' | 'danger' | 'neutral' }; hint?: string; tooltip?: string; id?: string; tone?: 'default' | 'inverse' }) {
  const auto = useId();
  const tooltipId = `${id || auto}-tip`;
  return <section id={id} className={`statCard statCard--${tone}`} aria-label={label}>
    <p className="statLabel">{label}</p>
    <div className="statValueRow"><strong className="statValue">{value}</strong>{unit ? <span className="statUnit">{unit}</span> : null}{delta ? <StatusPill tone={delta.tone} label={delta.value} /> : null}</div>
    {hint ? <p className="statHint">{hint}</p> : null}
    {tooltip ? <span className="statTooltip" tabIndex={0} aria-describedby={tooltipId}>ⓘ<span id={tooltipId} role="tooltip">{tooltip}</span></span> : null}
  </section>;
}
