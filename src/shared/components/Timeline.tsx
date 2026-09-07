import type { ReactNode } from 'react';

export type TimelineState = 'done' | 'fail' | 'next' | 'pending';

export interface TimelineEntry {
  readonly id: string;
  readonly state: TimelineState;
  readonly title: ReactNode;
  readonly meta?: ReactNode;
}

/** Vertical timeline used by reminder schedules and the audit log. */
export function Timeline({ entries }: { readonly entries: readonly TimelineEntry[] }) {
  return (
    <ul className="tl">
      {entries.map((entry) => (
        <li key={entry.id} className={entry.state === 'pending' ? undefined : entry.state}>
          {entry.title}
          {entry.meta ? <small>{entry.meta}</small> : null}
        </li>
      ))}
    </ul>
  );
}
