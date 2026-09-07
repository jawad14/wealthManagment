'use client';

import type { ReactNode } from 'react';

export interface FilterOption<TValue extends string> {
  readonly value: TValue;
  readonly label: ReactNode;
  /** Optional count rendered in the muted suffix, e.g. "All 23". */
  readonly count?: number;
}

export interface FilterGroupProps<TValue extends string> {
  readonly options: readonly FilterOption<TValue>[];
  readonly value: TValue;
  readonly onChange: (value: TValue) => void;
  readonly label: string;
}

/**
 * The rounded pill filter row. Selection state is expressed with `aria-pressed`,
 * matching the prototype, so the pressed styling and screen-reader state agree.
 */
export function FilterGroup<TValue extends string>({
  options,
  value,
  onChange,
  label,
}: FilterGroupProps<TValue>) {
  return (
    <div className="filters" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="filter"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count === undefined ? null : <span className="n">{option.count}</span>}
        </button>
      ))}
    </div>
  );
}
