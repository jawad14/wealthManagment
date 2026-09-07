import type { CSSProperties } from 'react';
import type { IconName } from './IconSprite';

export interface IconProps {
  readonly name: IconName;
  /** Override the 18px default (the design uses 12–22px variants in places). */
  readonly size?: number;
  readonly strokeWidth?: number;
  readonly style?: CSSProperties;
}

/**
 * Renders `<svg class="i"><use href="#i-name"/></svg>` — identical markup to the
 * design prototype, so all `svg.i` styling applies unchanged.
 */
export function Icon({ name, size, strokeWidth, style }: IconProps) {
  const sizeStyle: CSSProperties | undefined =
    size === undefined && strokeWidth === undefined && style === undefined
      ? undefined
      : {
          ...(size === undefined ? {} : { width: size, height: size }),
          ...(strokeWidth === undefined ? {} : { strokeWidth }),
          ...style,
        };

  return (
    <svg className="i" style={sizeStyle}>
      <use href={`#${name}`} />
    </svg>
  );
}
