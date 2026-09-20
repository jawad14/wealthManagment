'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/shared/components/Card';
import { Sub } from '@/shared/components/Layout';
import { FieldGrid, TextAreaField, TextField } from '@/shared/components/Field';
import { ActionForm, firstError } from '@/shared/components/ActionForm';
import { uploadBankCsvAction } from '../actions';

const SAMPLE_CSV = `Date,Amount,Description,Reference
2026-09-10,480.00,Direct Credit WATSON-R2,WATSON-R2
2026-09-11,-125.50,Council Rates Payment,RATES-4412`;

export interface UploadStatementFormProps {
  /** Omitted when there is no import to go back to, so the form cannot be dismissed into nothing. */
  readonly onCancel?: () => void;
  readonly onSuccess?: () => void;
}

/** FR-06 — start a new import cycle from a CSV statement, uploaded or pasted. */
export function UploadStatementForm({ onCancel, onSuccess }: UploadStatementFormProps) {
  // React resets uncontrolled inputs after every submission, including a failed
  // one. Holding these in state keeps a pasted statement on screen so the line
  // the error names can be fixed rather than pasted again.
  const [accountLabel, setAccountLabel] = useState('CBA Everyday Business');
  const [csvContent, setCsvContent] = useState('');

  return (
    <Card>
      <CardHeader title="Upload new statement" aside={<Sub>CSV · Date, Amount, Description, Reference</Sub>} />
      <CardBody>
        <ActionForm
          action={uploadBankCsvAction}
          submitLabel="Import statement"
          onCancel={onCancel}
          onSuccess={onSuccess}
          footnote={
            <Sub style={{ fontSize: 12 }}>
              Rows already imported (same date, amount and reference) are skipped. Matches are only suggested — nothing
              posts until you confirm it.
            </Sub>
          }
        >
          {({ fieldErrors }) => {
            const csvErrors = fieldErrors.csvContent ?? [];
            return (
              <>
                <FieldGrid>
                  <TextField
                    id="upload-account"
                    name="accountLabel"
                    label="Bank account"
                    required
                    maxLength={80}
                    value={accountLabel}
                    onChange={(event) => setAccountLabel(event.target.value)}
                    invalid={Boolean(firstError(fieldErrors, 'accountLabel'))}
                    hint={firstError(fieldErrors, 'accountLabel') ?? 'The account the statement came from.'}
                  />
                  <TextField
                    id="upload-file"
                    name="csvFile"
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    label="CSV file"
                    invalid={Boolean(firstError(fieldErrors, 'csvFile'))}
                    hint={firstError(fieldErrors, 'csvFile') ?? 'Optional. A chosen file is used instead of the text below.'}
                    style={{ paddingTop: 7 }}
                  />
                </FieldGrid>
                <TextAreaField
                  id="upload-csv"
                  name="csvContent"
                  label="Or paste the statement"
                  rows={8}
                  spellCheck={false}
                  placeholder={SAMPLE_CSV}
                  value={csvContent}
                  onChange={(event) => setCsvContent(event.target.value)}
                  invalid={csvErrors.length > 0}
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 12.5 }}
                  hint={
                    csvErrors.length > 0
                      ? csvErrors.map((message) => <span key={message} style={{ display: 'block' }}>{message}</span>)
                      : 'Dates as YYYY-MM-DD or DD/MM/YYYY. Outgoings are negative: -125.50 or (125.50).'
                  }
                />
              </>
            );
          }}
        </ActionForm>
      </CardBody>
    </Card>
  );
}
