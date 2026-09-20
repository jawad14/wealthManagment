'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Icon } from '@/shared/components/Icon';
import { viewFromPathname } from '@/shared/config/navigation';

/** Query-string key the dashboard page reads the scope from. */
const SCOPE_PARAM = 'entityId';

/** The only screen that honours the scope, so every choice lands there. */
const SCOPED_ROUTE = '/dashboard';

export interface ScopePickerOption {
  readonly entityId: string;
  readonly entityName: string;
}

export interface ScopePickerProps {
  /** Label for the consolidated choice, e.g. "Whole portfolio · all entities". */
  readonly allLabel: string;
  readonly options: readonly ScopePickerOption[];
  /** Called after a choice is made, so the mobile drawer can close. */
  readonly onNavigate?: () => void;
}

/**
 * Sidebar scope pill (FR-09).
 *
 * A disclosure, not a custom listbox: the pill toggles a short list of links.
 * Presentation only — each choice is a link to `/dashboard?entityId=…`, so the
 * URL stays the single source of truth and the Server Component recomputes the
 * figures. Reads the URL, so it must sit under a Suspense boundary.
 */
export function ScopePicker({ allLabel, options, onNavigate }: ScopePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Only the dashboard honours the scope, so only the dashboard may claim it.
  const onDashboard = viewFromPathname(usePathname()) === 'dashboard';
  const requested = useSearchParams().get(SCOPE_PARAM);
  const selected = onDashboard ? options.find((option) => option.entityId === requested) : undefined;

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isOpen]);

  const choose = (): void => {
    setIsOpen(false);
    onNavigate?.();
  };

  const choices = [
    { key: 'all', href: SCOPED_ROUTE, label: allLabel, icon: 'i-grid' as const, isCurrent: onDashboard && !selected },
    ...options.map((option) => ({
      key: option.entityId,
      href: `${SCOPED_ROUTE}?${SCOPE_PARAM}=${encodeURIComponent(option.entityId)}`,
      label: option.entityName,
      icon: 'i-users' as const,
      isCurrent: option.entityId === selected?.entityId,
    })),
  ];

  return (
    <div ref={rootRef}>
      <button
        className="scope"
        title="Change scope (entity, property, period)"
        type="button"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <div>
          <small>Viewing</small>
          <strong>{selected ? `${selected.entityName} · attributed share` : allLabel}</strong>
        </div>
        <Icon name="i-chev-ud" />
      </button>

      <div id={listId} hidden={!isOpen} style={{ padding: '0 14px' }}>
        {choices.map((choice) => (
          <Link
            key={choice.key}
            href={choice.href}
            className="nav-item"
            aria-current={choice.isCurrent ? 'page' : undefined}
            onClick={choose}
          >
            <Icon name={choice.icon} />
            {choice.label}
            {choice.isCurrent ? (
              // `aria-current` carries the state for assistive tech; the tick
              // keeps it from being colour alone.
              <span className="count" aria-hidden="true">
                <Icon name="i-check" size={12} />
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
