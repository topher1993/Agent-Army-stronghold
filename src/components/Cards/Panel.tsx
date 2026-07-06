
import type { ElementType, ReactNode } from 'react';
export function Panel({ title, eyebrow, actions, tone = 'default', padding = 'md', as, id, children }: { title?: string; eyebrow?: string; actions?: ReactNode; tone?: 'default' | 'elevated' | 'subtle'; padding?: 'sm' | 'md' | 'lg'; as?: ElementType; id?: string; children: ReactNode }) {
  const Component = as || 'section';
  const titleId = title ? `${id || title.replace(/\s+/g, '-').toLowerCase()}-title` : undefined;
  const Heading = eyebrow ? 'h3' : 'h2';
  return <Component id={id} className={`panelPrimitive panelPrimitive--${tone} panelPrimitive--pad-${padding}`} aria-labelledby={titleId}>
    {(title || eyebrow || actions) ? <header className="panelPrimitiveHeader">
      <div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}{title ? <Heading id={titleId}>{title}</Heading> : null}</div>
      {actions ? <div className="panelPrimitiveActions">{actions}</div> : null}
    </header> : null}
    <div className="panelPrimitiveBody">{children}</div>
  </Component>;
}
