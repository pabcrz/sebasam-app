"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  value: string;
  label: string;
  panel: React.ReactNode;
};

export type TabsProps = {
  tabs: TabItem[];
  label: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  header?: React.ReactNode;
  className?: string;
  headerClassName?: string;
  tabListClassName?: string;
  panelContainerClassName?: string;
  panelClassName?: string;
};

export function Tabs({
  tabs,
  label,
  defaultValue,
  value,
  onValueChange,
  header,
  className,
  headerClassName,
  tabListClassName,
  panelContainerClassName,
  panelClassName,
}: TabsProps) {
  const initialValue = defaultValue && tabs.some((tab) => tab.value === defaultValue)
    ? defaultValue
    : tabs[0]?.value;
  const [uncontrolledValue, setUncontrolledValue] = React.useState(initialValue);
  const selectedValue = value !== undefined && tabs.some((tab) => tab.value === value) ? value : uncontrolledValue;
  const baseId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  function selectTab(nextValue: string) {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  function focusTab(nextIndex: number) {
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    selectTab(nextTab.value);
    tabRefs.current[nextIndex]?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      focusTab(nextIndex);
    }
  }

  const tabList = (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar inline-flex max-w-full overflow-x-auto border-b border-[var(--color-border-light)]",
        tabListClassName,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = selectedValue === tab.value;
        const tabId = `${baseId}-tab-${tab.value}`;
        const panelId = `${baseId}-panel-${tab.value}`;

        return (
          <button
            key={tab.value}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={tabId}
            role="tab"
            type="button"
            tabIndex={selected ? 0 : -1}
            aria-controls={panelId}
            aria-selected={selected}
            onClick={() => selectTab(tab.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "relative shrink-0 min-h-[var(--tap-min-height)] px-3 text-sm transition-colors duration-[var(--motion-fast)] after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:content-[''] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] focus-visible:shadow-[var(--shadow-focus)]",
              selected
                ? "font-semibold text-[var(--color-text-main)] after:bg-[image:var(--gradient-primary)]"
                : "font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className={className}>
      {header ? <div className={headerClassName}>{header}{tabList}</div> : tabList}
      <div className={panelContainerClassName}>
        {tabs.map((tab) => {
          const selected = selectedValue === tab.value;
          const tabId = `${baseId}-tab-${tab.value}`;
          const panelId = `${baseId}-panel-${tab.value}`;

          return (
            <div
              key={tab.value}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              hidden={!selected}
              tabIndex={0}
              className={panelClassName}
            >
              {tab.panel}
            </div>
          );
        })}
      </div>
    </div>
  );
}
