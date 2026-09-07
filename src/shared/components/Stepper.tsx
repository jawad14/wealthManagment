import { Fragment } from 'react';
import { Icon } from './Icon';

export interface StepperStep {
  readonly label: string;
  readonly state: 'done' | 'current' | 'todo';
}

const STEP_CLASS: Record<StepperStep['state'], string> = {
  done: 'step done',
  current: 'step cur',
  todo: 'step',
};

/**
 * Horizontal progress stepper used by the bank import wizard.
 * The connector after a step is filled only once that step is complete.
 */
export function Stepper({ steps, label }: { readonly steps: readonly StepperStep[]; readonly label: string }) {
  return (
    <div className="stepper" aria-label={label}>
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          <div className={STEP_CLASS[step.state]}>
            <i>{step.state === 'done' ? <Icon name="i-check" size={12} strokeWidth={2.5} /> : index + 1}</i>
            {step.label}
          </div>
          {index < steps.length - 1 ? (
            <div className={step.state === 'done' ? 'step-line done' : 'step-line'} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
