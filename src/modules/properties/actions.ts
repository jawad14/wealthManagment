'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { runAction, type ActionResult } from '@/shared/lib/action-result';
import { readAmount, readChoice, readString, requireString } from '@/shared/lib/form-data';
import { ValidationError } from '@/shared/lib/errors';
import { accessService } from '@/modules/access/service';
import { entitiesRepository } from '@/modules/entities/repository';
import { propertiesRepository } from './repository';
import type { Property, PropertyStatus, RentalMode, Valuation, ValuationBasis } from './model';

const BASES: readonly ValuationBasis[] = ['bank', 'agent-appraisal', 'purchase-price', 'at-cost'];
const STATUSES: readonly PropertyStatus[] = ['rented', 'own-home', 'vacant', 'under-construction'];
const MODES: readonly RentalMode[] = ['by-room', 'whole', 'not-rented'];

function revalidate(): void {
  revalidatePath('/properties');
  revalidatePath('/dashboard');
  revalidatePath('/loans');
}

/**
 * Record a valuation (FR-02).
 *
 * The basis matters as much as the number: a purchase price or build cost is
 * never eligible to drive a ratio, however recently it was entered.
 */
export async function addValuationAction(
  _previous: ActionResult<unknown>,
  form: FormData,
): Promise<ActionResult<unknown>> {
  return runAction('Valuation recorded', () => {
    const amount = readAmount(form, 'amount');
    if (amount === undefined || amount <= 0) {
      throw new ValidationError('Enter a valuation greater than zero.', {
        fieldErrors: { amount: ['A valuation must be greater than zero.'] },
      });
    }

    const propertyId = asId<'Property'>(requireString(form, 'propertyId', 'Property'));
    const property = propertiesRepository.find(propertyId);
    if (!property) throw new ValidationError('That property no longer exists.');

    const valuation: Valuation = {
      id: asId<'Valuation'>(`val-${randomUUID()}`),
      propertyId,
      amount: fromMajorUnits(amount),
      basis: readChoice(form, 'basis', BASES) ?? 'bank',
      valuedOn: requireString(form, 'valuedOn', 'Valuation date'),
      confidence: readChoice(form, 'confidence', ['high', 'medium', 'low'] as const) ?? 'medium',
      datePrecision: 'month',
    };

    const created = propertiesRepository.addValuation(valuation);
    accessService.record({
      actor: accessService.getCurrentUser().name,
      summary: `Valuation recorded · ${property.name}`,
      context: `${valuation.basis} · ${valuation.valuedOn} · confidence ${valuation.confidence}`,
    });
    revalidate();
    return created;
  });
}

/**
 * Add a property, together with the ownership interest that holds it.
 *
 * The owner is required: a property with no recorded ownership contributes
 * nothing to portfolio totals and would appear immediately as an ownership gap.
 */
export async function createPropertyAction(
  _previous: ActionResult<unknown>,
  form: FormData,
): Promise<ActionResult<unknown>> {
  return runAction('Property added', () => {
    const actor = accessService.getCurrentUser();
    const ownerEntityId = asId<'Entity'>(requireString(form, 'ownerEntityId', 'Owner'));
    const owner = entitiesRepository.findEntity(ownerEntityId);
    if (!owner) throw new ValidationError('Choose an owning entity.');

    const share = readAmount(form, 'sharePercent') ?? 100;
    if (share <= 0 || share > 100) {
      throw new ValidationError('Ownership share must be between 0 and 100.', {
        fieldErrors: { sharePercent: ['Enter a share between 0 and 100.'] },
      });
    }

    const name = requireString(form, 'name', 'Name');
    const settledOn = readString(form, 'settledOn');
    const propertyId = asId<'Property'>(`prop-${randomUUID()}`);

    const property: Property = {
      id: propertyId,
      name,
      fullAddress: readString(form, 'fullAddress') ?? name,
      status: readChoice(form, 'status', STATUSES) ?? 'rented',
      rentalMode: readChoice(form, 'rentalMode', MODES) ?? 'whole',
      ownershipLabel: `${owner.name} · ${share}%`,
      holdingNote: `Held by ${owner.name}${settledOn ? ` · settled ${settledOn}` : ''}`,
      ...(settledOn ? { settledOn } : {}),
      // A newly-added property has no agreed consolidation method yet, so it is
      // surfaced as an ownership gap rather than silently assumed.
      consolidationMethodChosen: false,
    };

    const created = propertiesRepository.insert(property);

    entitiesRepository.insertRelationship({
      id: `rel-${randomUUID()}`,
      subjectEntityId: ownerEntityId,
      kind: 'owns',
      target: { type: 'property', propertyId },
      sharePercent: share,
      from: settledOn ?? new Date().toISOString().slice(0, 10),
      to: null,
      label: `Owns · ${name}`,
    });

    accessService.record({
      actor: actor.name,
      summary: `Property added · ${name}`,
      context: `${owner.name} · ${share}% · consolidation method not yet chosen`,
    });
    revalidate();
    revalidatePath('/entities');
    return created;
  });
}
