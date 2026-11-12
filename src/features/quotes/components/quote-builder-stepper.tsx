"use client";

import { flowStepLabels, Step, steps, stepLabels } from "./quote-builder-shared";

export interface QuoteBuilderStepperProps {
  current: Step;
  onChange?: (step: Step) => void;
}

/** Full-screen quote flow: one bar per step; completed and current steps stay tappable (shortcuts back). */
export function QuoteBuilderProgress({ current, onChange }: QuoteBuilderStepperProps) {
  const currentIndex = steps.indexOf(current);

  return (
    <nav aria-label="Pasos de cotización">
      <ol className="grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-1">
        {steps.map((step, index) => {
          const isActive = step === current;
          const isReached = index <= currentIndex;

          return (
            <li key={step} className="min-w-0">
              <button
                type="button"
                onClick={() => isReached && onChange?.(step)}
                disabled={!isReached}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${flowStepLabels[step]}`}
                className="flex w-full flex-col gap-1.5 rounded-[var(--radius-sm)] py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:cursor-not-allowed lg:flex-row lg:items-center lg:gap-3 lg:py-2"
              >
                <span
                  aria-hidden="true"
                  className={`block h-1.5 w-full rounded-full transition-colors lg:h-6 lg:w-1 lg:shrink-0 ${isReached ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-light)]"}`}
                />
                <span
                  className={`hidden truncate text-xs font-medium sm:block lg:block lg:text-sm ${isActive ? "text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"}`}
                >
                  {flowStepLabels[step]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function QuoteBuilderStepper({ current, onChange }: QuoteBuilderStepperProps) {
  const currentIndex = steps.indexOf(current);

  return (
    <nav aria-label="Pasos de cotización">
      <ol className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const isActive = step === current;
          const isCompleted = index < currentIndex;
          const isClickable = onChange && (isCompleted || index <= currentIndex);

          return (
            <li key={step} className="flex flex-1 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => isClickable && onChange?.(step)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${stepLabels[step]}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${isActive
                  ? "bg-[var(--color-primary)] text-white"
                  : isCompleted
                    ? "bg-[var(--color-status-success)] text-white"
                    : "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isCompleted ? "✓" : index + 1}
              </button>
              <span
                className={`text-center text-[10px] font-medium leading-tight sm:text-xs ${isActive ? "text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"
                  }`}
              >
                {stepLabels[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
