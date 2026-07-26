import { KeyboardEvent, useRef } from "react";

/**
 * A tablist with the keyboard behaviour the role promises: arrows move between
 * tabs, Home/End jump to the ends, and only the selected tab is in the tab
 * order — so a keyboard user tabs *past* the switcher into the panel instead of
 * stepping through every view on the way.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  idBase,
  label,
}: {
  tabs: string[];
  value: number;
  onChange: (index: number) => void;
  idBase: string;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(next);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: value + 1,
      ArrowLeft: value - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    select(target);
  };

  return (
    <div
      className="app-tabs"
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {tabs.map((tab, index) => (
        <button
          key={tab}
          ref={(node) => {
            refs.current[index] = node;
          }}
          id={`${idBase}-tab-${index}`}
          className="app-tab"
          type="button"
          role="tab"
          aria-selected={value === index}
          aria-controls={`${idBase}-panel-${index}`}
          tabIndex={value === index ? 0 : -1}
          onClick={() => onChange(index)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
