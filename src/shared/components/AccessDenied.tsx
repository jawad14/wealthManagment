import type { ReactNode } from 'react';
import { ForbiddenError } from '@/shared/lib/errors';
import { Banner } from './Banner';

export interface AccessDeniedProps {
  /** The guard's own message, e.g. "This account does not have permission to …". */
  readonly message: string;
}

/**
 * What a screen shows when the module API refuses the signed-in user (NFR-01).
 *
 * The refusal itself happens in the module `api.ts`; this only presents it, so
 * a restricted user sees an explanation inside the shell rather than a crash.
 */
export function AccessDenied({ message }: AccessDeniedProps) {
  return (
    <Banner tone="warn" icon="i-alert" title="You do not have access to this screen">
      {message} Ask the portfolio owner if you need it.
    </Banner>
  );
}

/**
 * Render a guarded screen, turning a `ForbiddenError` into `AccessDenied`.
 * Anything else still throws — only a permission refusal is an expected outcome.
 */
export function renderGuarded(render: () => ReactNode): ReactNode {
  try {
    return render();
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied message={error.message} />;
    throw error;
  }
}
