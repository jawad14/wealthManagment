/**
 * Transport-agnostic handlers for the obligations module.
 */
import { resolveAsOfDate } from '@/shared/config/app-config';
import { asId, type UserId } from '@/shared/types/common';
import { accessService } from '@/modules/access/service';
import { obligationsService, type ObligationView } from './service';
import type { Obligation } from './model';
import type { ObligationQuery, RecordPaymentInput } from './validation';

export const obligationsApi = {
  list(query: ObligationQuery): {
    readonly asOf: string;
    readonly items: readonly ObligationView[];
    readonly counts: Record<string, number>;
  } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('obligation.read');
    const asOf = query.asOf ?? resolveAsOfDate();
    return {
      asOf,
      items: obligationsService.listViews(asOf, query.filter),
      counts: obligationsService.counts(asOf),
    };
  },

  get(obligationId: string, asOf?: string): ObligationView & { readonly timeline: unknown } {
    // NFR-01: enforced at the module API, so pages, JSON routes and
    // exports all pass through the same check. A direct URL cannot bypass it.
    accessService.guard('obligation.read');
    const resolvedAsOf = asOf ?? resolveAsOfDate();
    const id = asId<'Obligation'>(obligationId);
    return {
      ...obligationsService.view(obligationsService.require(id), resolvedAsOf),
      timeline: obligationsService.reminderTimeline(id, resolvedAsOf),
    };
  },

  /** Close an obligation with payment evidence. A reminder alone never closes one. */
  recordPayment(obligationId: string, input: RecordPaymentInput, actor?: UserId): Obligation {
    return obligationsService.recordPayment({
      obligationId: asId<'Obligation'>(obligationId),
      paidOn: input.paidOn,
      documentId: input.documentId,
      actor: actor ?? accessService.getCurrentUser().id,
    });
  },

  assignOwner(obligationId: string, ownerUserId: string, actor?: UserId): Obligation {
    return obligationsService.assignOwner(
      asId<'Obligation'>(obligationId),
      asId<'User'>(ownerUserId),
      actor ?? accessService.getCurrentUser().id,
    );
  },
};
