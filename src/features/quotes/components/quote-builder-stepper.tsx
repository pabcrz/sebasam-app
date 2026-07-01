"use client";

import { Step, steps, stepLabels } from "./quote-builder-shared";

export interface QuoteBuilderStepperProps {
  current: Step;
  onChange?: (step: Step) => void;
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
