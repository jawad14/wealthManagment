import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

export type DeltaDirection = 'up' | 'down' | 'flat';

export interface KpiProps {
  readonly label: ReactNode;
  /** Tooltip text for the "?" help affordance beside the label. */
  readonly help?: string;
  readonly value: ReactNode;
  /** Small trailing text inside the value, e.g. "as of 6 Sep" or "7 items". */
  readonly valueSuffix?: ReactNode;
  readonly valueStyle?: CSSProperties;
  /** Footer content — deltas, chips and links. */
  readonly footer?: ReactNode;
  /** Charcoal hero treatment. Only one tile per screen should use it. */
  readonly accent?: boolean;
  /** Spans two grid columns. */
  readonly wide?: boolean;
}

export function Kpi({
  label,
  help,
  value,
  valueSuffix,
  valueStyle,
  footer,
  accent = false,
  wide = false,
}: KpiProps) {
  const className = ['kpi', accent ? 'accent' : '', wide ? 'wide' : ''].filter(Boolean).join(' ');
  return (
    <div className={className}>
      <div className="kpi-label">
        {label}
        {help ? (
          <span className="help" title={help}>
            ?
          </span>
        ) : null}
      </div>
      <div className="kpi-value num" style={valueStyle}>
        {value}
        {valueSuffix ? <small>{valueSuffix}</small> : null}
      </div>
      {footer ? <div className="kpi-foot">{footer}</div> : null}
    </div>
  );
}

export interface DeltaProps {
  readonly direction: DeltaDirection;
  readonly children?: ReactNode;
}

/** The small up/down/flat pill used inside KPI footers. */
export function Delta({ direction, children }: DeltaProps) {
  return (
    <span className={`delta ${direction}`}>
      {direction === 'flat' ? '–' : <Icon name={direction === 'up' ? 'i-up' : 'i-down'} />}
      {children}
    </span>
  );
}

export function KpiGrid({ children }: { readonly children: ReactNode }) {
  return <div className="kpis">{children}</div>;
}
