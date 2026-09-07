import type { ReactNode } from 'react';
import { toDateBoxParts } from '@/shared/lib/dates';
import type { IsoDate } from '@/shared/types/common';

export function List({ children }: { readonly children: ReactNode }) {
  return <ul className="list">{children}</ul>;
}

/** The bordered day/month tile at the left of a dated list row. */
export function DateBox({ date }: { readonly date: IsoDate }) {
  const { day, month } = toDateBoxParts(date);
  return (
    <div className="date-box">
      <b>{day}</b>
      <span>{month}</span>
    </div>
  );
}

export interface ListRowProps {
  readonly leading?: ReactNode;
  readonly title: ReactNode;
  readonly subtitle?: ReactNode;
  /** Right-hand block — typically an amount stacked above an owner tag. */
  readonly trailing?: ReactNode;
}

export function ListRow({ leading, title, subtitle, trailing }: ListRowProps) {
  return (
    <li>
      {leading}
      <div className="li-main">
        <b>{title}</b>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      {trailing ? <div style={{ textAlign: 'right' }}>{trailing}</div> : null}
    </li>
  );
}
