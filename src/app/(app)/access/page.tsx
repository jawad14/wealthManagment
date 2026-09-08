import type { Metadata } from 'next';
import { accessApi } from '@/modules/access/api';
import { propertiesService } from '@/modules/properties/service';
import { AccessScreen } from '@/modules/access/components/AccessScreen';
import type { TimelineEntry } from '@/shared/components/Timeline';

export const metadata: Metadata = { title: 'Access & audit · Holdfast' };

/** NFR-01, NFR-03 — who can see what, and what has happened. */
export default function AccessPage() {
  const overview = accessApi.getOverview();

  const auditEntries: readonly TimelineEntry[] = overview.auditEvents.map((event) => ({
    id: event.id,
    state: event.outcome === 'failed' ? 'fail' : 'done',
    title: event.summary,
    meta: event.context,
  }));

  return (
    <AccessScreen
      people={overview.people}
      auditEntries={auditEntries}
      continuity={overview.continuity}
      properties={propertiesService.list().map((property) => ({ id: property.id, name: property.name }))}
    />
  );
}
