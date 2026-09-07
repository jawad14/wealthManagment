/**
 * Seeded obligations and reminder history.
 * Mirrors the "Obligations & reminders" screen of the design prototype.
 */
import { asId } from '@/shared/types/common';
import { fromMajorUnits } from '@/shared/lib/money';
import { PROPERTY_IDS } from '@/modules/entities/data/seed';
import { USER_IDS } from '@/modules/access/data/seed';
import type { Obligation, ReminderEvent, ReminderPolicy } from '../model';

export const OBLIGATION_IDS = {
  waterUsage: asId<'Obligation'>('obl-water-usage'),
  bodyCorporate: asId<'Obligation'>('obl-body-corporate'),
  insuranceCompton: asId<'Obligation'>('obl-insurance-compton'),
  councilRates: asId<'Obligation'>('obl-council-rates'),
  smokeAlarm: asId<'Obligation'>('obl-smoke-alarm'),
  loanRateReview: asId<'Obligation'>('obl-loan-rate-review'),
  insuranceBenton: asId<'Obligation'>('obl-insurance-benton'),
};

/** House default: email + in-app, five days ahead, escalate one day after due. */
const DEFAULT_POLICY: ReminderPolicy = {
  enabled: true,
  channels: ['in-app', 'email'],
  daysBefore: 5,
  quietHours: { fromHour: 21, toHour: 8, timezone: 'AEST' },
  escalateAfterDays: 1,
};

export function seedObligations(): readonly Obligation[] {
  return [
    {
      id: OBLIGATION_IDS.waterUsage,
      title: 'Water usage · shared bill',
      contextLabel: '166 Compton Rd · Urban Utilities',
      propertyId: PROPERTY_IDS.comptonRd,
      dueOn: '2026-08-28',
      recurrence: 'quarterly',
      ownerUserId: USER_IDS.mahvish,
      amount: fromMajorUnits(412),
      evidence: { state: 'attached', label: 'Bill attached', documentId: asId<'Document'>('doc-urban-utilities') },
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
      validatedAt: '2026-08-10T09:00:00.000Z',
      validatedBy: USER_IDS.mahvish,
    },
    {
      id: OBLIGATION_IDS.bodyCorporate,
      title: 'Body corporate levy',
      contextLabel: 'Watson Rd',
      propertyId: PROPERTY_IDS.watsonRd,
      dueOn: '2026-09-01',
      recurrence: 'quarterly',
      ownerUserId: USER_IDS.jawad,
      amount: fromMajorUnits(1_120),
      evidence: { state: 'missing', label: 'No invoice' },
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
      validatedAt: '2026-08-14T09:00:00.000Z',
      validatedBy: USER_IDS.jawad,
    },
    {
      id: OBLIGATION_IDS.insuranceCompton,
      title: 'Landlord insurance renewal',
      contextLabel: '166 Compton Rd · Terri Scheer',
      propertyId: PROPERTY_IDS.comptonRd,
      dueOn: '2026-09-14',
      recurrence: 'yearly',
      ownerUserId: USER_IDS.jawad,
      amount: fromMajorUnits(1_860),
      evidence: { state: 'attached', label: 'Policy attached', documentId: asId<'Document'>('doc-terri-scheer') },
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
      validatedAt: '2026-08-20T09:00:00.000Z',
      validatedBy: USER_IDS.jawad,
    },
    {
      id: OBLIGATION_IDS.councilRates,
      title: 'Council rates · Q1',
      contextLabel: '20 Benton St',
      propertyId: PROPERTY_IDS.bentonSt,
      dueOn: '2026-09-18',
      recurrence: 'quarterly',
      ownerUserId: USER_IDS.mahvish,
      amount: fromMajorUnits(1_245),
      evidence: { state: 'attached', label: 'Notice attached' },
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
      validatedAt: '2026-08-22T09:00:00.000Z',
      validatedBy: USER_IDS.mahvish,
    },
    {
      // Unowned on purpose — demonstrates the "no owner, no reminders" rule.
      id: OBLIGATION_IDS.smokeAlarm,
      title: 'Smoke alarm compliance',
      contextLabel: 'Mians Rd',
      propertyId: PROPERTY_IDS.miansRd,
      dueOn: '2026-09-22',
      recurrence: 'yearly',
      ownerUserId: null,
      amount: fromMajorUnits(180),
      evidence: { state: 'none', label: '—' },
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
    },
    {
      id: OBLIGATION_IDS.loanRateReview,
      title: 'Loan rate review',
      contextLabel: 'Watson Rd facility · Macquarie',
      propertyId: PROPERTY_IDS.watsonRd,
      dueOn: '2026-09-30',
      recurrence: 'once',
      ownerUserId: USER_IDS.jawad,
      amount: null,
      evidence: { state: 'attached', label: 'Letter attached' },
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
      validatedAt: '2026-08-28T09:00:00.000Z',
      validatedBy: USER_IDS.jawad,
    },
    {
      id: OBLIGATION_IDS.insuranceBenton,
      title: 'Landlord insurance renewal',
      contextLabel: '20 Benton St',
      propertyId: PROPERTY_IDS.bentonSt,
      dueOn: '2026-08-03',
      recurrence: 'yearly',
      ownerUserId: USER_IDS.jawad,
      amount: fromMajorUnits(1_710),
      evidence: { state: 'attached', label: 'Receipt attached' },
      paidOn: '2026-08-01',
      disputed: false,
      reminderPolicy: DEFAULT_POLICY,
      validatedAt: '2026-07-10T09:00:00.000Z',
      validatedBy: USER_IDS.jawad,
    },
  ];
}

export function seedReminderEvents(): readonly ReminderEvent[] {
  return [
    {
      id: 'rem-water-1',
      obligationId: OBLIGATION_IDS.waterUsage,
      at: '2026-08-23T08:00:00.000Z',
      channel: 'email',
      outcome: 'sent',
      note: 'Recipient verified',
      dispatchKey: `${OBLIGATION_IDS.waterUsage}:${USER_IDS.mahvish}:email:2026-08-23`,
      recipientId: USER_IDS.mahvish,
    },
    {
      id: 'rem-body-1',
      obligationId: OBLIGATION_IDS.bodyCorporate,
      at: '2026-09-01T08:00:00.000Z',
      channel: 'email',
      outcome: 'failed',
      note: 'Email bounce · owner task created for Jawad',
      dispatchKey: `${OBLIGATION_IDS.bodyCorporate}:${USER_IDS.jawad}:email:2026-08-27`,
      recipientId: USER_IDS.jawad,
    },
    {
      id: 'rem-insurance-1',
      obligationId: OBLIGATION_IDS.insuranceCompton,
      at: '2026-08-20T09:15:00.000Z',
      channel: 'email',
      outcome: 'queued',
      note: 'Recipient verified · quiet hours 9pm–8am AEST',
      dispatchKey: `${OBLIGATION_IDS.insuranceCompton}:${USER_IDS.jawad}:email:2026-09-09`,
      recipientId: USER_IDS.jawad,
    },
  ];
}
