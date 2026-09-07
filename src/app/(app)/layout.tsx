import type { ReactNode } from 'react';
import { AppShell } from '@/shared/shell/AppShell';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { accessService } from '@/modules/access/service';
import { obligationsService } from '@/modules/obligations/service';
import { reconciliationService } from '@/modules/reconciliation/service';
import { sharedBillsService } from '@/modules/shared-bills/service';
import { initialsOf } from '@/shared/components/Avatar';
import { ROLE_LABELS } from '@/modules/access/model';

/**
 * Chrome for every application screen.
 *
 * Runs on the server so the nav badges, scope and as-of date are resolved from
 * live data before the shell renders — no loading flash in the navigation.
 */
export default function AppLayout({ children }: { readonly children: ReactNode }) {
  const asOfDate = resolveAsOfDate();
  const currentUser = accessService.getCurrentUser();

  return (
    <AppShell
      asOfDate={asOfDate}
      badges={{
        openObligations: obligationsService.openCount(asOfDate),
        unmatchedTransactions: reconciliationService.unmatchedCount(),
        billsNeedingReview: sharedBillsService.counts()['needs-review'],
      }}
      scopeLabel="Whole portfolio · all entities"
      currentUserName={currentUser.name}
      currentUserRole={`${ROLE_LABELS[currentUser.role]} · MFA ${currentUser.mfa === 'on' ? 'on' : 'not required'}`}
      currentUserInitials={initialsOf(currentUser.name)}
      unreadNotifications={3}
    >
      {children}
    </AppShell>
  );
}
