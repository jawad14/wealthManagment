'use client';

export interface TabsProps<TValue extends string> {
  readonly tabs: readonly { readonly value: TValue; readonly label: string }[];
  readonly value: TValue;
  readonly onChange: (value: TValue) => void;
  readonly style?: React.CSSProperties;
}

/** Underlined tab strip. Scrolls horizontally on narrow screens. */
export function Tabs<TValue extends string>({ tabs, value, onChange, style }: TabsProps<TValue>) {
  return (
    <div className="tabs" role="tablist" style={style}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className="tab"
          role="tab"
          aria-selected={tab.value === value}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
