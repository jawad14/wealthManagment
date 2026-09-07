import type { ReactNode } from 'react';
import type { Tone } from '@/shared/types/common';
import { Icon } from './Icon';
import type { IconName } from './IconSprite';

export interface ChipProps {
  readonly tone?: Tone;
  /**
   * Status chips pair an icon with words so meaning survives colour-blindness
   * and greyscale printing (NFR-07). Neutral chips may omit the icon.
   */
  readonly icon?: IconName;
  readonly children: ReactNode;
}

export function Chip({ tone = 'neutral', icon, children }: ChipProps) {
  return (
    <span className={`chip ${tone}`}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </span>
  );
}
