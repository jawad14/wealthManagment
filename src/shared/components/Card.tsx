import type { CSSProperties, ReactNode } from 'react';

export interface CardProps {
  readonly children: ReactNode;
  readonly id?: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function Card({ children, id, className, style }: CardProps) {
  return (
    <div className={className ? `card ${className}` : 'card'} id={id} style={style}>
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  readonly title?: ReactNode;
  /** Rendered on the right of the header — a link, chip, sub-label or button row. */
  readonly aside?: ReactNode;
  /** Escape hatch for headers with a custom two-block layout (e.g. property detail). */
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
  /** Larger title size used by the property detail card. */
  readonly titleStyle?: CSSProperties;
}

export function CardHeader({ title, aside, children, style, titleStyle }: CardHeaderProps) {
  return (
    <div className="card-h" style={style}>
      {children ?? (
        <>
          {title === undefined ? null : <h3 style={titleStyle}>{title}</h3>}
          {aside}
        </>
      )}
    </div>
  );
}

export interface CardBodyProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export function CardBody({ children, className, style }: CardBodyProps) {
  return (
    <div className={className ? `card-b ${className}` : 'card-b'} style={style}>
      {children}
    </div>
  );
}
