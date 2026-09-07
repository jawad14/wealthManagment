'use client';

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export interface FieldShellProps {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /** Renders the error treatment: red border on the control, red hint text. */
  readonly invalid?: boolean;
  readonly children: ReactNode;
}

function FieldShell({ id, label, hint, invalid, children }: FieldShellProps) {
  return (
    <div className={invalid ? 'field err' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly invalid?: boolean;
}

export function TextField({ id, label, hint, invalid, ...rest }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} invalid={invalid}>
      <input id={id} aria-invalid={invalid || undefined} {...rest} />
    </FieldShell>
  );
}

export interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'> {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly invalid?: boolean;
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

export function SelectField({ id, label, hint, invalid, options, ...rest }: SelectFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} invalid={invalid}>
      <select id={id} aria-invalid={invalid || undefined} {...rest}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Two-column form grid that collapses to one column at ≤840px. */
export function FieldGrid({ children }: { readonly children: ReactNode }) {
  return <div className="fgrid">{children}</div>;
}
