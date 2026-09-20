import type { Metadata } from 'next';
import { reconciliationService } from '@/modules/reconciliation/service';
import { INTERNAL_TRANSFER_ALLOCATION } from '@/modules/reconciliation/model';
import { propertiesService } from '@/modules/properties/service';
import { obligationsService } from '@/modules/obligations/service';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { ImportScreen } from '@/modules/reconciliation/components/ImportScreen';
import { formatDateLong, formatDateShort, toDate } from '@/shared/lib/dates';
import { Card, CardBody } from '@/shared/components/Card';

export const metadata: Metadata = { title: 'Bank import & matching · Holdfast' };

/** FR-06 — the import currently in progress. */
export default function BankImportPage() {
  const bankImport = reconciliationService.currentImport();

  if (!bankImport) {
    return (
      <Card>
        <CardBody>
          <p className="sub" style={{ margin: 0 }}>
            No bank import is in progress. Upload a statement to begin.
          </p>
        </CardBody>
      </Card>
    );
  }

  const periodLabel = `${toDate(bankImport.periodFrom).getUTCDate()}–${formatDateShort(bankImport.periodTo)} ${toDate(
    bankImport.periodTo,
  ).getUTCFullYear()} · ${bankImport.format}`;

  return (
    <ImportScreen
      bankImport={bankImport}
      steps={reconciliationService.stages(bankImport.id)}
      summary={reconciliationService.summarise(bankImport.id)}
      transactions={reconciliationService.listTransactions(bankImport.id)}
      highConfidenceCount={reconciliationService.highConfidenceCount(bankImport.id)}
      readyToPostCount={reconciliationService.readyToPostCount(bankImport.id)}
      periodLabel={periodLabel}
      allocationOptions={[
        ...propertiesService.list().map((property) => ({
          value: `Property · ${property.name}`,
          label: `Property · ${property.name}`,
        })),
        // Titles repeat across properties and years ("Landlord insurance renewal"),
        // and the value is stored as the correction note — so it carries the
        // context and due date to say which obligation was meant.
        ...obligationsService.listViews(resolveAsOfDate(), 'all').slice(0, 12).map((view) => {
          const { title, contextLabel, dueOn } = view.obligation;
          const text = `Obligation · ${title} · ${contextLabel} · due ${formatDateLong(dueOn)}`;
          return { value: text, label: text };
        }),
        { value: INTERNAL_TRANSFER_ALLOCATION, label: INTERNAL_TRANSFER_ALLOCATION },
      ]}
    />
  );
}
