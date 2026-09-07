'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'default' | 'primary' | 'gold' | 'ghost';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  /** Compact 30px height used inside table rows and card headers. */
  readonly small?: boolean;
  readonly children: ReactNode;
}

export function Button({ variant = 'default', small = false, children, type = 'button', ...rest }: ButtonProps) {
  const className = ['btn', small ? 'sm' : '', variant === 'default' ? '' : variant]
    .filter(Boolean)
    .join(' ');
  return (
    <button type={type} className={className} {...rest}>
      {children}
    </button>
  );
}
