import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveAsOfDate } from '@/shared/config/app-config';
import { propertiesService } from '@/modules/properties/service';
import { leasesService } from '@/modules/leases/service';
import { leasesRepository } from '@/modules/leases/repository';
import { PropertyDetail, type RoomRow } from '@/modules/properties/components/PropertyDetail';
import { FREQUENCY_LABELS } from '@/modules/leases/model';
import { formatDateCompact, formatDateShort } from '@/shared/lib/dates';
import { asId } from '@/shared/types/common';
import { isAppError } from '@/shared/lib/errors';

export const metadata: Metadata = { title: 'Property · Holdfast' };

interface PageProps {
  readonly params: Promise<{ readonly propertyId: string }>;
}

/** FR-02 — one property, its components and their leases. */
export default async function PropertyDetailPage({ params }: PageProps) {
  const { propertyId } = await params;
  const asOf = resolveAsOfDate();

  let property;
  try {
    property = propertiesService.require(asId<'Property'>(propertyId));
  } catch (error) {
    if (isAppError(error) && error.code === 'NOT_FOUND') notFound();
    throw error;
  }

  const leases = leasesRepository.listForProperty(property.id);

  const rooms: readonly RoomRow[] = propertiesService.listComponents(property.id).map((component) => {
    const lease = leases.find((entry) => entry.componentId === component.id && entry.endsOn >= asOf);
    if (!lease) {
      return {
        componentId: component.id,
        label: component.label,
        tenantName: null,
        vacantSinceLabel: component.vacantSince ? formatDateShort(component.vacantSince) : null,
        termLabel: null,
        rent: null,
        frequencyLabel: null,
        balance: null,
        state: null,
      };
    }
    const position = leasesService.arrearsFor(lease.id, asOf);
    return {
      componentId: component.id,
      label: component.label,
      tenantName: position.tenantName,
      vacantSinceLabel: null,
      termLabel: `${formatDateCompact(lease.startsOn)} – ${formatDateCompact(lease.endsOn)}`,
      rent: lease.rent,
      frequencyLabel: FREQUENCY_LABELS[lease.frequency],
      balance: leasesService.balanceForLease(lease.id, asOf),
      state: position.state,
    };
  });

  const valuation = propertiesService.valuationStatus(property.id, asOf);

  return (
    <PropertyDetail
      title={property.fullAddress}
      holdingNote={property.holdingNote}
      rooms={rooms}
      componentNoun={property.rentalMode === 'by-room' ? 'Room' : 'Component'}
      valuationDetail={propertiesService.valuationDetailLabel(property.id, asOf)}
      valuationAmount={valuation.valuation?.amount ?? null}
      propertyId={property.id}
      today={asOf}
    />
  );
}
