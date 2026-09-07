/**
 * Properties & assets domain model (FR-02).
 *
 * A property is the unit that counts once in net worth. Rooms are *operational
 * components* of a property, not assets in their own right — they carry leases
 * and occupancy but never a separate valuation.
 */
import type { IsoDate, PropertyComponentId, PropertyId, ValuationId } from '@/shared/types/common';
import type { Money } from '@/shared/lib/money';

export type PropertyStatus = 'rented' | 'own-home' | 'vacant' | 'under-construction';

/** How the property earns rent, which decides how occupancy and rent are rolled up. */
export type RentalMode = 'by-room' | 'whole' | 'not-rented';

export interface Property {
  readonly id: PropertyId;
  /** Short name used in lists, e.g. "166 Compton Rd, Woodridge". */
  readonly name: string;
  /** Full address shown on the detail header. */
  readonly fullAddress: string;
  readonly status: PropertyStatus;
  readonly rentalMode: RentalMode;
  /** Ownership summary line, e.g. "Siddique Family Trust · 100%". Derived labels live in the service. */
  readonly ownershipLabel: string;
  /** Long-form holding note including any corporate trustee. */
  readonly holdingNote: string;
  readonly settledOn?: IsoDate;
  /** Set when the property is a development rather than an income asset. */
  readonly constructionCostToDate?: Money;
  /**
   * Whether a consolidation method has been agreed for this property.
   *
   * Jointly-held assets need an explicit decision on how they roll up before
   * their value can be relied on in portfolio totals. Until that is made the
   * property is flagged as an ownership gap rather than silently assumed.
   */
  readonly consolidationMethodChosen: boolean;
}

export type ValuationBasis = 'bank' | 'agent-appraisal' | 'purchase-price' | 'at-cost';

/**
 * Bases that represent an actual assessment of market value.
 *
 * A purchase price or a build cost records what was paid, not what the asset is
 * worth now, so those bases are shown as the last known figure but never treated
 * as current — regardless of how recently they were entered.
 */
export const MARKET_VALUATION_BASES: readonly ValuationBasis[] = ['bank', 'agent-appraisal'];

export function isMarketBasis(basis: ValuationBasis): boolean {
  return MARKET_VALUATION_BASES.includes(basis);
}

export const VALUATION_BASIS_LABELS: Record<ValuationBasis, string> = {
  bank: 'Bank val',
  'agent-appraisal': 'Agent appraisal',
  'purchase-price': 'Purchase price',
  'at-cost': 'At cost',
};

/** Long form used on the detail panel: "bank valuation · 18 Aug 2026 · confidence high". */
export const VALUATION_BASIS_LONG_LABELS: Record<ValuationBasis, string> = {
  bank: 'bank valuation',
  'agent-appraisal': 'agent appraisal',
  'purchase-price': 'purchase price',
  'at-cost': 'at cost',
};

export type ValuationConfidence = 'high' | 'medium' | 'low';

/** How precisely the valuation date is shown — the prototype varies by basis. */
export type ValuationDatePrecision = 'day' | 'month' | 'year' | 'none';

export interface Valuation {
  readonly id: ValuationId;
  readonly propertyId: PropertyId;
  readonly amount: Money;
  readonly basis: ValuationBasis;
  readonly valuedOn: IsoDate;
  readonly confidence: ValuationConfidence;
  readonly datePrecision: ValuationDatePrecision;
}

export type ComponentKind = 'room' | 'whole';

export interface PropertyComponent {
  readonly id: PropertyComponentId;
  readonly propertyId: PropertyId;
  readonly kind: ComponentKind;
  /** "Room 1", or "Whole property" for single-tenancy dwellings. */
  readonly label: string;
  /** Set when the component is currently untenanted. */
  readonly vacantSince?: IsoDate;
  /** Display order within the property. */
  readonly position: number;
}

/**
 * A valuation is *eligible* for ratio maths (LVR, portfolio coverage) only while
 * it is a market assessment inside the staleness window. Stale figures are still
 * displayed — the portfolio should not lose an asset because its valuation aged —
 * but they must not silently drive a ratio, so ratios report "Unavailable".
 */
export interface ValuationStatus {
  readonly valuation: Valuation | null;
  readonly isStale: boolean;
  readonly ageMonths: number | null;
  readonly eligibleForRatios: boolean;
  /** Presentation string, e.g. "Bank val · Aug 2026" or "Purchase price · 2023 · stale". */
  readonly label: string;
}

/** Occupancy roll-up for a property's components. */
export interface Occupancy {
  readonly total: number;
  readonly let: number;
  readonly vacant: number;
  /** Per-room let/vacant flags in display order, for the room strip. */
  readonly slots: readonly { readonly componentId: PropertyComponentId; readonly isLet: boolean }[];
}

export interface OwnershipGap {
  readonly propertyId: PropertyId;
  readonly propertyName: string;
  readonly allocatedShare: number;
  readonly reason: string;
}
