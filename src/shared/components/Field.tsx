'use client';

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

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

export interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'> {
  readonly id: string;
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly invalid?: boolean;
}

/**
 * Multi-line input. The design's `.field` rules style `input` and `select`
 * only, so the control borrows the same tokens here rather than the ported CSS
 * being edited to fit.
 */
export function TextAreaField({ id, label, hint, invalid, style, ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} hint={hint} invalid={invalid}>
      <textarea
        id={id}
        aria-invalid={invalid || undefined}
        style={{
          border: `1px solid ${invalid ? 'var(--bad)' : 'var(--line)'}`,
          borderRadius: 8,
          padding: '10px 12px',
          background: 'var(--surface)',
          color: 'var(--text)',
          font: 'inherit',
          resize: 'vertical',
          ...style,
        }}
        {...rest}
      />
    </FieldShell>
  );
}

/** Two-column form grid that collapses to one column at ≤840px. */
export function FieldGrid({ children }: { readonly children: ReactNode }) {
  return <div className="fgrid">{children}</div>;
}
