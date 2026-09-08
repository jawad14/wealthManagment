'use client';

import { useActionState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from './Button';
import { Row } from './Layout';
import { useToast } from '@/shared/shell/ToastContext';
import { IDLE_RESULT, type ActionResult } from '@/shared/lib/action-result';

export interface ActionFormProps {
  /** The Server Action to submit to. */
  readonly action: (previous: ActionResult<unknown>, form: FormData) => Promise<ActionResult<unknown>>;
  readonly submitLabel: string;
  /**
   * Field content. Receives `fieldErrors` so each input can mark itself.
   * Omitted for a bare confirm action that needs no inputs.
   */
  readonly children?: (state: { readonly fieldErrors: Readonly<Record<string, readonly string[]>> }) => ReactNode;
  /**
   * Values submitted with the form but not shown — record ids, mostly. Rendered
   * as hidden inputs so the action reads them from FormData like any other field.
   */
  readonly hiddenFields?: Readonly<Record<string, string>>;
  /**
   * `inline` renders just the submit button, for a confirm action that sits in a
   * row of other buttons rather than in a form panel of its own.
   */
  readonly render?: 'panel' | 'inline';
  /** Button variant for the submit control. */
  readonly submitVariant?: 'primary' | 'gold' | 'default' | 'ghost';
  readonly onCancel?: () => void;
  readonly cancelLabel?: string;
  /** Extra content between the fields and the buttons — a banner, usually. */
  readonly footnote?: ReactNode;
  /** Called after a successful submission, so a parent can close the form. */
  readonly onSuccess?: () => void;
}

/**
 * Form wrapper around a Server Action.
 *
 * Handles the three things every form here needs: pending state on the submit
 * button, field errors surfaced next to the inputs that caused them, and a toast
 * on completion. Children receive `fieldErrors` so each input can mark itself.
 */
export function ActionForm({
  action,
  submitLabel,
  children,
  hiddenFields,
  render = 'panel',
  submitVariant,
  onCancel,
  cancelLabel = 'Cancel',
  footnote,
  onSuccess,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE_RESULT as ActionResult<unknown>);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!state.message) return;
    toast(state.message);
    if (state.ok) {
      // The action already revalidated on the server; refresh pulls the new
      // data into the current view without a full navigation.
      router.refresh();
      onSuccess?.();
    }
    // `state` is a fresh object per submission, so this fires once per result.
  }, [state, toast, router, onSuccess]);

  const fieldErrors = (state.ok ? undefined : state.fieldErrors) ?? {};

  const hidden = hiddenFields
    ? Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))
    : null;

  // An inline action is one button among others; it must not introduce a block
  // layout or a duplicate error banner into the row it sits in.
  if (render === 'inline') {
    return (
      <form action={formAction} style={{ display: 'contents' }}>
        {hidden}
        <Button variant={submitVariant ?? 'ghost'} type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} className="stack">
      {hidden}
      {children?.({ fieldErrors })}

      {!state.ok && state.message ? (
        <div className="banner warn">
          <svg className="i">
            <use href="#i-alert" />
          </svg>
          <div>
            <b>{state.message}</b>
          </div>
        </div>
      ) : null}

      {footnote}

      <Row>
        <Button variant={submitVariant ?? 'primary'} type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
        {onCancel ? (
          <Button variant="ghost" type="button" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
        ) : null}
      </Row>
    </form>
  );
}

/** First error for a field, or undefined. */
export function firstError(
  fieldErrors: Readonly<Record<string, readonly string[]>>,
  key: string,
): string | undefined {
  return fieldErrors[key]?.[0];
}
