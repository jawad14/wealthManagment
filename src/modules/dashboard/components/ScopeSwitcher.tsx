'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FilterGroup } from '@/shared/components/FilterGroup';
import type { ScopeOption } from '../model';

/** Query-string key the dashboard page reads the scope from. */
export const SCOPE_PARAM = 'entityId';

/** Value used for the consolidated choice; never written to the URL. */
const ALL_ENTITIES = 'all';

export interface ScopeSwitcherProps {
  readonly options: readonly ScopeOption[];
  /** The scoped entity, or `null` for the whole portfolio. */
  readonly selectedEntityId: string | null;
}

/**
 * Scope switcher (FR-09).
 *
 * Presentation only: it writes `?entityId=` and lets the Server Component
 * re-render with figures computed by the service. The URL is the single source
 * of truth, so a scoped dashboard can be bookmarked, shared and reloaded.
 */
export function ScopeSwitcher({ options, selectedEntityId }: ScopeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const select = (value: string): void => {
    const href = value === ALL_ENTITIES ? pathname : `${pathname}?${SCOPE_PARAM}=${encodeURIComponent(value)}`;
    startTransition(() => router.push(href, { scroll: false }));
  };

  return (
    <div aria-busy={isPending}>
      <FilterGroup
        label="Dashboard scope"
        value={selectedEntityId ?? ALL_ENTITIES}
        onChange={select}
        options={[
          { value: ALL_ENTITIES, label: 'All Entities (Consolidated)' },
          ...options.map((option) => ({ value: option.entityId as string, label: option.entityName })),
        ]}
      />
    </div>
  );
}
