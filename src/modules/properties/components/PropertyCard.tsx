import Link from 'next/link';
import { Chip } from '@/shared/components/Chip';
import { formatMoney, formatPercent, type Money } from '@/shared/lib/money';
import type { Available } from '@/shared/lib/result';
import type { Tone } from '@/shared/types/common';
import type { IconName } from '@/shared/components/IconSprite';
import type { Occupancy, Property, PropertyStatus } from '../model';

const STATUS_CHIP: Record<PropertyStatus, { tone: Tone; icon?: IconName }> = {
  rented: { tone: 'good', icon: 'i-check' },
  'own-home': { tone: 'neutral' },
  vacant: { tone: 'warn', icon: 'i-alert' },
  'under-construction': { tone: 'info', icon: 'i-clock' },
};

export interface PropertyCardProps {
  readonly property: Property;
  readonly occupancyLabel: string;
  readonly occupancy: Occupancy;
  readonly valuation: { readonly amount: Money | null; readonly label: string; readonly isStale: boolean };
  readonly monthlyRent: Money | null;
  readonly rentNote: string;
  readonly debt: { readonly amount: Money; readonly note: string } | null;
  /** Arrears when the property is let, otherwise the LVR — as the design alternates. */
  readonly arrears: { readonly total: Money; readonly tenantCount: number } | null;
  readonly lvr: Available<number>;
}

/**
 * A property tile.
 *
 * Which fourth statistic is shown depends on the property: a let property shows
 * arrears, everything else shows its LVR. That mirrors the design and keeps the
 * most decision-relevant number in the same position on every card.
 */
export function PropertyCard({
  property,
  occupancyLabel,
  occupancy,
  valuation,
  monthlyRent,
  rentNote,
  debt,
  arrears,
  lvr,
}: PropertyCardProps) {
  const chip = STATUS_CHIP[property.status];
  const isConstruction = property.status === 'under-construction';

  return (
    <Link href={`/properties/${property.id}`} className="prop">
      <div className="prop-top">
        <div>
          <b>{property.name}</b>
          <span>{property.ownershipLabel}</span>
        </div>
        <Chip tone={chip.tone} icon={chip.icon}>
          {occupancyLabel}
        </Chip>
      </div>

      <div className="prop-stats">
        <div className="stat">
          <small>{isConstruction ? 'Cost to date' : 'Valuation'}</small>
          <b className="num">
            {formatMoney(isConstruction ? property.constructionCostToDate ?? valuation.amount : valuation.amount)}
          </b>
          <span className="meta" style={valuation.isStale ? { color: 'var(--warn)' } : undefined}>
            {isConstruction ? 'Manual entry · project total' : valuation.label}
          </span>
        </div>

        <div className="stat">
          <small>Rent / month</small>
          <b className="num">{monthlyRent === null ? '—' : formatMoney(monthlyRent)}</b>
          <span className="meta">{rentNote}</span>
        </div>

        <div className="stat">
          <small>{debt?.note.includes('policy') ? 'Debt (pool share)' : 'Debt'}</small>
          <b className="num">{formatMoney(debt?.amount ?? null) === '—' ? '$0' : formatMoney(debt?.amount ?? null)}</b>
          <span className="meta">{debt?.note ?? 'Funded from cash'}</span>
        </div>

        {arrears ? (
          <div className="stat">
            <small>Arrears</small>
            <b className="num" style={arrears.total.cents > 0 ? { color: 'var(--bad)' } : undefined}>
              {formatMoney(arrears.total)}
            </b>
            <span className="meta">
              {arrears.tenantCount} tenant{arrears.tenantCount === 1 ? '' : 's'}
            </span>
          </div>
        ) : (
          <div className="stat">
            <small>LVR</small>
            <b className={lvr.available ? 'num' : undefined}>
              {lvr.available ? formatPercent(lvr.value) : 'Unavailable'}
            </b>
            <span className="meta">{lvr.available ? 'Single property' : 'No eligible valuation'}</span>
          </div>
        )}
      </div>

      {occupancy.total > 1 ? (
        <div className="rooms" aria-label={`Rooms: ${occupancy.let} let, ${occupancy.vacant} vacant`}>
          {occupancy.slots.map((slot) => (
            <i key={slot.componentId} className={slot.isLet ? undefined : 'vac'} />
          ))}
        </div>
      ) : null}
    </Link>
  );
}
