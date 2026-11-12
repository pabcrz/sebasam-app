"use client";

import * as React from "react";
import { useFontScaleContext, type FontScale } from "@/components/font-scale-provider";
import { useThemeContext } from "@/components/theme-provider";

type Option<T extends string> = { value: T; label: string };

const themeOptions: Option<"light" | "dark">[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const fontScaleOptions: Option<FontScale>[] = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Grande" },
];

function ChoiceGroup<T extends string>({
  legend,
  options,
  selected,
  onSelect,
}: {
  legend: string;
  options: Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium text-[var(--color-text-main)]">{legend}</legend>
      <div className="inline-flex w-fit gap-1 rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-1">
        {options.map((option) => {
          const isSelected = option.value === selected;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.value)}
              className={
                "min-h-[var(--tap-min-height)] min-w-20 rounded-[var(--radius-sm)] px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)] " +
                (isSelected
                  ? "bg-[var(--color-tonal-bg)] font-semibold text-[var(--color-tonal-fg)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]")
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Apariencia applies on this device at once and is remembered locally, so it has no save bar. */
export function AppearanceSettings() {
  const { theme, setTheme } = useThemeContext();
  const { fontScale, setFontScale } = useFontScaleContext();

  return (
    <div className="grid gap-6">
      <p className="text-sm text-[var(--color-text-muted)]">
        Se aplica en este dispositivo y se recuerda aquí; no se guarda para el taller.
      </p>
      <ChoiceGroup legend="Tema" options={themeOptions} selected={theme} onSelect={setTheme} />
      <ChoiceGroup legend="Tamaño de letra" options={fontScaleOptions} selected={fontScale} onSelect={setFontScale} />
    </div>
  );
}
