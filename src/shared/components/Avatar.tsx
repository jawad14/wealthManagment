import type { CSSProperties } from 'react';

/** Derive the two-letter monogram the design uses for people. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, style }: { readonly name: string; readonly style?: CSSProperties }) {
  return (
    <span className="avatar" style={style}>
      {initialsOf(name)}
    </span>
  );
}

export interface OwnerTagProps {
  /** Null renders the dashed "assign owner" affordance. */
  readonly name: string | null;
  /** Prompt shown when unassigned — "Assign owner" on the dashboard, "Assign" in tables. */
  readonly unassignedLabel?: string;
  /** Show only the given name, as the dashboard list does. */
  readonly short?: boolean;
}

/**
 * Owner attribution. An obligation without an owner is not eligible for
 * reminders, so the unassigned state is deliberately visible rather than blank.
 */
export function OwnerTag({ name, unassignedLabel = 'Assign owner', short = false }: OwnerTagProps) {
  if (name === null) {
    return (
      <span className="owner none">
        <span className="avatar">?</span>
        {unassignedLabel}
      </span>
    );
  }
  return (
    <span className="owner">
      <Avatar name={name} />
      {short ? name.split(/\s+/)[0] : name}
    </span>
  );
}
