import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './IconSprite';

export interface BannerProps {
  readonly tone: 'warn' | 'info';
  readonly icon?: IconName;
  readonly title: ReactNode;
  readonly children?: ReactNode;
}

/** Inline notice used for import warnings and lease-form explanations. */
export function Banner({ tone, icon, title, children }: BannerProps) {
  return (
    <div className={`banner ${tone}`}>
      <Icon name={icon ?? (tone === 'warn' ? 'i-alert' : 'i-clock')} />
      <div>
        <b>{title}</b>
        {children ? <p>{children}</p> : null}
      </div>
    </div>
  );
}
