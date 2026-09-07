import Link from 'next/link';
import { Card, CardHeader } from '@/shared/components/Card';
import { List, ListRow, DateBox } from '@/shared/components/ListRow';
import { OwnerTag } from '@/shared/components/Avatar';
import { formatMoney } from '@/shared/lib/money';
import { UPCOMING_WINDOW_DAYS } from '@/shared/config/app-config';
import type { ObligationView } from '@/modules/obligations/service';

export interface UpcomingListProps {
  readonly items: readonly ObligationView[];
  /** Total count for the "View all N" link. */
  readonly totalCount: number;
}

/** Obligations falling due inside the reminder horizon. */
export function UpcomingList({ items, totalCount }: UpcomingListProps) {
  return (
    <Card>
      <CardHeader
        title={`Due next ${UPCOMING_WINDOW_DAYS} days`}
        aside={<Link href="/obligations">View all {totalCount}</Link>}
      />
      {items.length === 0 ? (
        <div className="card-b">
          <p className="sub" style={{ margin: 0 }}>
            Nothing falls due in the next {UPCOMING_WINDOW_DAYS} days.
          </p>
        </div>
      ) : (
        <List>
          {items.map((item) => (
            <ListRow
              key={item.obligation.id}
              leading={<DateBox date={item.obligation.dueOn} />}
              title={item.obligation.title}
              subtitle={item.obligation.contextLabel}
              trailing={
                <>
                  <div className="li-amt num">{formatMoney(item.obligation.amount)}</div>
                  <OwnerTag name={item.ownerName} short unassignedLabel="Assign owner" />
                </>
              }
            />
          ))}
        </List>
      )}
    </Card>
  );
}
