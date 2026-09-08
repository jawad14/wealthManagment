/**
 * Leases business logic, including the BR-05 arrears calculation.
 */
import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError, ValidationError } from '@/shared/lib/errors';
import { addDays, addMonths, daysBetween, isBefore } from '@/shared/lib/dates';
import { addMoney, money, scaleMoney, subtractMoney, sumMoney, type Money } from '@/shared/lib/money';
import { asId, type IsoDate, type LeaseId, type PropertyId, type RentChargeId, type UserId } from '@/shared/types/common';
import { propertiesService } from '@/modules/properties/service';
import { leasesRepository } from './repository';
import {
  PERIODS_PER_YEAR,
  type ArrearsPosition,
  type ArrearsState,
  type Lease,
  type LeaseStatus,
  type RentCharge,
  type RentAllocation,
  type RentFrequency,
} from './model';

/** A lease inside this window of its end date is flagged as ending soon. */
const ENDING_SOON_DAYS = 60;

export type LeaseFilter = 'active' | 'ending-soon' | 'ended';

/** Advance a date by one charge period. */
function nextPeriod(date: IsoDate, frequency: RentFrequency): IsoDate {
  if (frequency === 'monthly') return addMonths(date, 1);
  return addDays(date, frequency === 'weekly' ? 7 : 14);
}

export interface LeaseView {
  readonly lease: Lease;
  readonly tenantName: string;
  readonly propertyLabel: string;
  readonly status: LeaseStatus;
  /** Days until the lease ends; negative once it has ended. */
  readonly daysUntilEnd: number;
  /** Null when charging is paused because the lease is disputed. */
  readonly nextChargeOn: IsoDate | null;
}

export const leasesService = {
  list(): readonly Lease[] {
    return leasesRepository.list();
  },

  require(id: LeaseId): Lease {
    const lease = leasesRepository.find(id);
    if (!lease) throw new NotFoundError('Lease', id);
    return lease;
  },

  tenantName(leaseId: LeaseId): string {
    const lease = leasesService.require(leaseId);
    return leasesRepository.findTenant(lease.tenantId)?.name ?? 'Unknown tenant';
  },

  /** "166 Compton Rd · Room 3" — property plus component. */
  propertyLabel(lease: Lease, style: 'long' | 'short' = 'long'): string {
    const property = propertiesService.require(lease.propertyId);
    const component = lease.componentId
      ? propertiesService.listComponents(lease.propertyId).find((entry) => entry.id === lease.componentId)
      : undefined;

    const propertyName = style === 'short' ? property.name.split(',')[0] ?? property.name : property.name;
    if (!component) return propertyName;
    const componentLabel = component.kind === 'whole' ? 'Whole property' : component.label;
    return `${propertyName} · ${componentLabel}`;
  },

  status(lease: Lease, asOf: IsoDate): LeaseStatus {
    if (isBefore(lease.endsOn, asOf)) return 'ended';
    if (lease.disputed) return 'disputed';
    if (daysBetween(asOf, lease.endsOn) <= ENDING_SOON_DAYS) return 'ending-soon';
    return 'active';
  },

  /**
   * The next charge date on or after `asOf`.
   * Returns null for disputed leases — charging reminders are paused, which the
   * UI shows as "Paused" rather than a date.
   */
  nextChargeOn(lease: Lease, asOf: IsoDate): IsoDate | null {
    if (lease.disputed) return null;
    if (isBefore(lease.endsOn, asOf)) return null;

    let cursor = lease.chargeAnchorOn;
    // Bounded walk: at most one year of weekly periods past the anchor.
    for (let step = 0; step < 400 && isBefore(cursor, asOf); step += 1) {
      cursor = nextPeriod(cursor, lease.frequency);
    }
    return isBefore(lease.endsOn, cursor) ? null : cursor;
  },

  view(lease: Lease, asOf: IsoDate): LeaseView {
    return {
      lease,
      tenantName: leasesRepository.findTenant(lease.tenantId)?.name ?? 'Unknown tenant',
      propertyLabel: leasesService.propertyLabel(lease),
      status: leasesService.status(lease, asOf),
      daysUntilEnd: daysBetween(asOf, lease.endsOn),
      nextChargeOn: leasesService.nextChargeOn(lease, asOf),
    };
  },

  listViews(asOf: IsoDate, filter: LeaseFilter = 'active'): readonly LeaseView[] {
    return leasesRepository
      .list()
      .map((lease) => leasesService.view(lease, asOf))
      .filter((view) => {
        switch (filter) {
          case 'active':
            return view.status !== 'ended';
          case 'ending-soon':
            return view.status !== 'ended' && view.daysUntilEnd <= ENDING_SOON_DAYS;
          case 'ended':
            return view.status === 'ended';
        }
      });
  },

  counts(asOf: IsoDate): Record<LeaseFilter, number> {
    return {
      active: leasesService.listViews(asOf, 'active').length,
      'ending-soon': leasesService.listViews(asOf, 'ending-soon').length,
      ended: leasesService.listViews(asOf, 'ended').length,
    };
  },

  /** Monthly-equivalent rent for a lease, annualised then divided by twelve. */
  monthlyEquivalentRent(lease: Lease): Money {
    return scaleMoney(lease.rent, PERIODS_PER_YEAR[lease.frequency] / 12);
  },

  /** Monthly rent roll for a property, counting only leases live on `asOf`. */
  monthlyRentForProperty(propertyId: PropertyId, asOf: IsoDate): Money {
    return sumMoney(
      leasesRepository
        .listForProperty(propertyId)
        .filter((lease) => lease.startsOn <= asOf && lease.endsOn >= asOf)
        .map(leasesService.monthlyEquivalentRent),
    );
  },

  /**
   * Arrears for one lease (BR-05).
   *
   * `arrears = due charges − allocated receipts − approved credits, adjusted for
   * reversals`. Only charges dated on or before `asOf` count: **future rent is
   * not arrears**. A negative outstanding is credit, shown as "paid ahead".
   *
   * Reversals are negative allocations, so a dishonoured payment restores the
   * amount owing without editing or deleting the original receipt.
   */
  arrearsFor(leaseId: LeaseId, asOf: IsoDate): ArrearsPosition {
    const lease = leasesService.require(leaseId);
    // BR-05: future rent is not arrears.
    const charges = leasesRepository.listCharges(leaseId).filter((charge) => charge.dueOn <= asOf);

    const perCharge = charges.map((charge) => {
      const allocations = leasesRepository
        .listAllocations(charge.id)
        .filter((allocation) => allocation.receivedOn <= asOf);

      const of = (kind: RentAllocation['kind']): Money =>
        sumMoney(allocations.filter((allocation) => allocation.kind === kind).map((a) => a.amount));

      const receipts = of('receipt');
      const credits = of('credit');
      const reversals = of('reversal');

      // Reversals carry negative amounts, so adding them reduces what was settled.
      const settled = addMoney(addMoney(receipts, credits), reversals);
      return { charge, receipts, credits, reversals, settled };
    });

    const due = sumMoney(charges.map((charge) => charge.amount));
    const received = sumMoney(perCharge.map((entry) => entry.receipts));
    const credits = sumMoney(perCharge.map((entry) => entry.credits));
    const reversals = sumMoney(perCharge.map((entry) => entry.reversals));
    const settled = sumMoney(perCharge.map((entry) => entry.settled));
    const outstanding = subtractMoney(due, settled);

    const oldestUnpaid = perCharge
      .filter((entry) => entry.settled.cents < entry.charge.amount.cents)
      .map((entry) => entry.charge.dueOn)
      .sort()[0];

    const daysOverdue = oldestUnpaid ? daysBetween(oldestUnpaid, asOf) : null;

    return {
      leaseId,
      tenantName: leasesRepository.findTenant(lease.tenantId)?.name ?? 'Unknown tenant',
      propertyLabel: leasesService.propertyLabel(lease),
      due,
      received,
      credits,
      reversals,
      outstanding,
      daysOverdue,
      disputed: lease.disputed,
      state: resolveArrearsState(outstanding, settled, due, lease.disputed),
    };
  },

  /** Arrears positions with something outstanding, worst first. */
  listArrears(asOf: IsoDate): readonly ArrearsPosition[] {
    return leasesRepository
      .list()
      .map((lease) => leasesService.arrearsFor(lease.id, asOf))
      .filter((position) => position.outstanding.cents > 0)
      .sort((a, b) => b.outstanding.cents - a.outstanding.cents);
  },

  /** Arrears total across the portfolio, and the tenants behind it. */
  arrearsSummary(asOf: IsoDate): {
    readonly total: Money;
    readonly tenantCount: number;
    readonly disputedCount: number;
  } {
    const positions = leasesService.listArrears(asOf);
    return {
      total: sumMoney(positions.map((position) => position.outstanding)),
      tenantCount: positions.length,
      disputedCount: positions.filter((position) => position.disputed).length,
    };
  },

  /** Arrears attributable to one property, used on the property cards. */
  arrearsForProperty(propertyId: PropertyId, asOf: IsoDate): { readonly total: Money; readonly tenantCount: number } {
    const positions = leasesRepository
      .listForProperty(propertyId)
      .map((lease) => leasesService.arrearsFor(lease.id, asOf))
      .filter((position) => position.outstanding.cents > 0);
    return { total: sumMoney(positions.map((position) => position.outstanding)), tenantCount: positions.length };
  },

  /** Balance shown on the property detail row: negative when owing, positive in credit. */
  balanceForLease(leaseId: LeaseId, asOf: IsoDate): Money {
    const position = leasesService.arrearsFor(leaseId, asOf);
    return money(-position.outstanding.cents, position.outstanding.currency);
  },

  /**
   * Apply a receipt to a charge (FR-06).
   *
   * Guarded against duplicate imports: a bank transaction may settle a charge
   * only once. Re-importing the same statement therefore cannot change a
   * balance, which is the FR-06 acceptance criterion.
   */
  recordReceipt(input: {
    readonly chargeId: RentChargeId;
    readonly amount: Money;
    readonly receivedOn: IsoDate;
    readonly bankTransactionId?: string;
    readonly note?: string;
  }): RentAllocation | null {
    const charge = leasesRepository.listAllCharges().find((entry) => entry.id === input.chargeId);
    if (!charge) throw new NotFoundError('Rent charge', input.chargeId);
    if (input.amount.cents <= 0) {
      throw new ValidationError('A receipt must be a positive amount. Use a reversal to undo one.');
    }

    if (input.bankTransactionId) {
      const alreadyApplied = leasesRepository
        .listAllAllocations()
        .some((allocation) => allocation.bankTransactionId === input.bankTransactionId);
      // Idempotent by design: a repeated import is a no-op, not an error.
      if (alreadyApplied) return null;
    }

    return leasesRepository.insertAllocation({
      id: `alloc-${randomUUID()}`,
      chargeId: input.chargeId,
      kind: 'receipt',
      amount: input.amount,
      receivedOn: input.receivedOn,
      ...(input.bankTransactionId ? { bankTransactionId: input.bankTransactionId } : {}),
      ...(input.note ? { note: input.note } : {}),
    });
  },

  /**
   * Apply an approved credit.
   *
   * A credit forgives money that was genuinely owed, so it requires a named
   * approver — it is not something an import or a background job may do.
   */
  recordCredit(input: {
    readonly chargeId: RentChargeId;
    readonly amount: Money;
    readonly appliedOn: IsoDate;
    readonly approvedBy: UserId;
    readonly note: string;
  }): RentAllocation {
    if (input.amount.cents <= 0) throw new ValidationError('A credit must be a positive amount.');
    if (!input.note.trim()) throw new ValidationError('A credit must record why it was granted.');

    return leasesRepository.insertAllocation({
      id: `alloc-${randomUUID()}`,
      chargeId: input.chargeId,
      kind: 'credit',
      amount: input.amount,
      receivedOn: input.appliedOn,
      approvedBy: input.approvedBy,
      note: input.note,
    });
  },

  /**
   * Reverse an earlier allocation — a dishonoured payment or a refund.
   *
   * Recorded as a further negative allocation rather than by editing or deleting
   * the original, so the history remains additive and the reversal is visible.
   */
  recordReversal(input: {
    readonly allocationId: string;
    readonly reversedOn: IsoDate;
    readonly note: string;
  }): RentAllocation {
    const original = leasesRepository
      .listAllAllocations()
      .find((allocation) => allocation.id === input.allocationId);
    if (!original) throw new NotFoundError('Rent allocation', input.allocationId);
    if (original.kind === 'reversal') {
      throw new ValidationError('A reversal cannot itself be reversed.');
    }

    const alreadyReversed = leasesRepository
      .listAllAllocations()
      .some((allocation) => allocation.reversesAllocationId === original.id);
    if (alreadyReversed) throw new ConflictError('This allocation has already been reversed.');

    return leasesRepository.insertAllocation({
      id: `alloc-${randomUUID()}`,
      chargeId: original.chargeId,
      kind: 'reversal',
      amount: money(-original.amount.cents, original.amount.currency),
      receivedOn: input.reversedOn,
      reversesAllocationId: original.id,
      note: input.note,
    });
  },

  /**
   * Generate the expected charges for a lease (FR-05).
   *
   * "Create expected charges from lease dates." Charges are written once, at
   * creation; they are facts about what is owed, not a view recomputed on read,
   * because receipts get allocated against them.
   */
  generateCharges(leaseId: LeaseId): readonly RentCharge[] {
    const lease = leasesService.require(leaseId);
    const created: RentCharge[] = [];

    let cursor = lease.chargeAnchorOn;
    for (let index = 0; index < 1000 && !isBefore(lease.endsOn, cursor); index += 1) {
      created.push(
        leasesRepository.insertCharge({
          id: asId<'RentCharge'>(`chg-${randomUUID()}`),
          leaseId,
          dueOn: cursor,
          amount: lease.rent,
        }),
      );
      cursor = nextPeriod(cursor, lease.frequency);
    }
    return created;
  },

  /**
   * End a lease early (FR-05).
   *
   * "An early termination removes only unearned future charges and leaves
   * receipts intact." Charges on or before the termination date were earned and
   * stay, as does everything allocated against them. Only charges falling
   * entirely after the date are removed — and only if nothing has been allocated
   * to them, because a charge with a receipt against it is no longer unearned.
   */
  terminate(input: {
    readonly leaseId: LeaseId;
    readonly endsOn: IsoDate;
    readonly reason: string;
  }): { readonly lease: Lease; readonly removedCharges: number; readonly keptCharges: number } {
    const lease = leasesService.require(input.leaseId);
    if (isBefore(input.endsOn, lease.startsOn)) {
      throw new ValidationError('A lease cannot end before it started.');
    }
    if (isBefore(lease.endsOn, input.endsOn)) {
      throw new ValidationError('That date is after the lease already ends.');
    }
    if (!input.reason.trim()) {
      throw new ValidationError('Recording a termination requires a reason.');
    }

    const charges = leasesRepository.listCharges(input.leaseId);
    let removed = 0;

    for (const charge of charges) {
      if (!isBefore(input.endsOn, charge.dueOn)) continue; // due on or before the end date: earned

      const allocated = leasesRepository.listAllocations(charge.id);
      // A charge someone has already paid against is not unearned; leave it and
      // its receipts alone.
      if (allocated.length > 0) continue;

      leasesRepository.removeCharge(charge.id);
      removed += 1;
    }

    const updated = leasesRepository.update(input.leaseId, { endsOn: input.endsOn });
    if (!updated) throw new NotFoundError('Lease', input.leaseId);

    return { lease: updated, removedCharges: removed, keptCharges: charges.length - removed };
  },

  /**
   * Change the rent from an effective date (FR-05).
   *
   * Only charges falling on or after the effective date are repriced, and only
   * those nothing has been allocated against. Paid history is never restated —
   * repricing a settled charge would silently create or erase arrears.
   */
  changeRent(input: {
    readonly leaseId: LeaseId;
    readonly newRent: Money;
    readonly effectiveFrom: IsoDate;
  }): { readonly lease: Lease; readonly repricedCharges: number } {
    const lease = leasesService.require(input.leaseId);
    if (input.newRent.cents <= 0) {
      throw new ValidationError('Rent must be greater than zero.');
    }
    if (isBefore(input.effectiveFrom, lease.startsOn)) {
      throw new ValidationError('A rent change cannot take effect before the lease started.');
    }

    let repriced = 0;
    for (const charge of leasesRepository.listCharges(input.leaseId)) {
      if (isBefore(charge.dueOn, input.effectiveFrom)) continue;
      if (leasesRepository.listAllocations(charge.id).length > 0) continue;

      leasesRepository.updateCharge(charge.id, { amount: input.newRent });
      repriced += 1;
    }

    const updated = leasesRepository.update(input.leaseId, { rent: input.newRent });
    if (!updated) throw new NotFoundError('Lease', input.leaseId);
    return { lease: updated, repricedCharges: repriced };
  },

  /**
   * How many charges a proposed lease would generate.
   * Surfaced in the new-lease form so the user sees the commitment before saving.
   */
  projectChargeCount(startsOn: IsoDate, endsOn: IsoDate, frequency: RentFrequency): number {
    let cursor = startsOn;
    let count = 0;
    while (!isBefore(endsOn, cursor) && count < 1000) {
      count += 1;
      cursor = nextPeriod(cursor, frequency);
    }
    return count;
  },
};

function resolveArrearsState(outstanding: Money, settled: Money, due: Money, disputed: boolean): ArrearsState {
  if (disputed) return 'disputed';
  if (outstanding.cents < 0) return 'paid-ahead';
  if (outstanding.cents === 0) return 'clear';
  if (settled.cents > 0 && settled.cents < due.cents) return 'partial';
  return 'overdue';
}
