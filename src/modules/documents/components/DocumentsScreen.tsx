'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Chip } from '@/shared/components/Chip';
import { DataTable, CellMain, CellSub, type DataTableColumn } from '@/shared/components/DataTable';
import { FilterGroup } from '@/shared/components/FilterGroup';
import { Icon } from '@/shared/components/Icon';
import { Stack, Sub, Toolbar } from '@/shared/components/Layout';
import { useToast } from '@/shared/shell/ToastContext';
import { DOCUMENT_FILTER_LABELS, type DocumentFilter } from '../model';
import type { DocumentView } from '../service';

const FILTER_ORDER: readonly DocumentFilter[] = [
  'all',
  'leases',
  'insurance',
  'invoices-receipts',
  'loans',
  'valuations',
  'unlinked',
];

export interface DocumentsScreenProps {
  readonly rowsByFilter: Record<DocumentFilter, readonly DocumentView[]>;
  readonly counts: Record<DocumentFilter, number>;
}

/** FR-04 — the document register. */
export function DocumentsScreen({ rowsByFilter, counts }: DocumentsScreenProps) {
  const [filter, setFilter] = useState<DocumentFilter>('all');
  const { toast } = useToast();

  const columns: readonly DataTableColumn<DocumentView>[] = [
    {
      header: 'Document',
      lead: true,
      render: (row) => (
        <>
          <CellMain>{row.record.filename}</CellMain>
          <CellSub>
            {row.sizeLabel}
            {row.record.descriptor ? ` · ${row.record.descriptor}` : ''}
          </CellSub>
        </>
      ),
    },
    {
      header: 'Type',
      render: (row) =>
        row.linkLabel === null ? (
          <Chip tone="warn" icon="i-alert">
            Unlinked
          </Chip>
        ) : (
          <Chip tone="neutral">{row.typeLabel}</Chip>
        ),
    },
    {
      header: 'Linked to',
      render: (row) => row.linkLabel ?? <Sub>Not linked to any record</Sub>,
    },
    { header: 'Uploaded', render: (row) => row.uploadedLabel },
    {
      header: 'Versions',
      render: (row) => (
        <>
          {row.versionCount}
          {row.latestVersionNote ? <CellSub>{row.latestVersionNote}</CellSub> : null}
        </>
      ),
    },
    {
      header: '',
      mobileLabel: 'Action',
      align: 'right',
      render: (row) =>
        row.linkLabel === null ? (
          <Button small onClick={() => toast('Linking is not wired up in this build')}>
            Link to record
          </Button>
        ) : (
          <Button small variant="ghost" onClick={() => toast(`Opening ${row.record.filename}`)}>
            Open
          </Button>
        ),
    },
  ];

  return (
    <Stack>
      <Toolbar>
        <FilterGroup
          label="Filter documents"
          options={FILTER_ORDER.map((value) => ({
            value,
            label: DOCUMENT_FILTER_LABELS[value],
            ...(value === 'all' || value === 'unlinked' ? { count: counts[value] } : {}),
          }))}
          value={filter}
          onChange={setFilter}
        />
        <Button variant="primary" onClick={() => toast('Upload is not wired up in this build')}>
          <Icon name="i-upload" />
          Upload
        </Button>
      </Toolbar>

      <Card>
        <DataTable
          columns={columns}
          rows={rowsByFilter[filter]}
          rowKey={(row) => row.record.id}
          empty="No documents match this filter."
        />
      </Card>

      <Sub style={{ fontSize: 12 }}>
        Documents are never deleted from history — removing one hides it and records who removed it and when. Nothing
        here is sent to an AI model unless you approve that document for assisted extraction (Release 2).
      </Sub>
    </Stack>
  );
}
