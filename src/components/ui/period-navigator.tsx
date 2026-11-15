"use client";

import * as React from "react";
import { isCurrentPeriod, formatPeriodLabel, mexicoCityDateKey, shiftPeriodAnchor, type PeriodOptions, type PeriodView } from "@/lib/period-format";
import { Badge } from "./badge";
import { Button } from "./button";
import { Icon } from "./icon";
import { SegmentedControl, type SegmentedControlOption } from "./segmented-control";

const viewOptions: Record<PeriodView, SegmentedControlOption> = {
  week: { value: "week", label: "Semana" },
  month: { value: "month", label: "Mes" },
  year: { value: "year", label: "Año" },
  all: { value: "all", label: "Todo" },
};

export interface PeriodNavigatorProps extends PeriodOptions {
  view: PeriodView;
  /** "YYYY-MM-DD" date inside the shown period. */
  anchor: string;
  /** Injected "now"; the current period is decided in Mexico City time. */
  today: Date;
  /** Views this screen offers, in order. Defaults to week, month, year and all. */
  views?: PeriodView[];
  onViewChange: (view: PeriodView) => void;
  /** Called with the new anchor for the previous/next arrows and for "Hoy". */
  onAnchorChange: (anchor: string) => void;
}

/** Moves through weeks, months or years, and chooses the view. */
export function PeriodNavigator({
  view,
  anchor,
  today,
  views = ["week", "month", "year", "all"],
  weekDays,
  onViewChange,
  onAnchorChange,
}: PeriodNavigatorProps) {
  const isNavigable = view !== "all";
  const isCurrent = isCurrentPeriod(view, anchor, today);
  const label = formatPeriodLabel(view, anchor, weekDays ? { weekDays } : {});
  const segmentedOptions = views.map((value) => viewOptions[value]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {isNavigable ? (
          <div role="group" aria-label="Cambiar periodo" className="inline-flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Periodo anterior"
              onClick={() => onAnchorChange(shiftPeriodAnchor(view, anchor, -1))}
            >
              <Icon name="chevron-left" className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Periodo siguiente"
              onClick={() => onAnchorChange(shiftPeriodAnchor(view, anchor, 1))}
            >
              <Icon name="chevron-right" className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="min-w-0 text-base font-semibold text-[var(--color-text-main)]">{label}</h2>
          {isCurrent && isNavigable ? <Badge variant="info">En curso</Badge> : null}
        </div>

        {isNavigable && !isCurrent ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => onAnchorChange(mexicoCityDateKey(today))}>
            Hoy
          </Button>
        ) : null}
      </div>

      {/* One view has nothing to choose between, so no single-option selector is shown. */}
      {views.length > 1 ? (
        <SegmentedControl
          label="Vista del periodo"
          options={segmentedOptions}
          value={view}
          onValueChange={(value) => onViewChange(value as PeriodView)}
        />
      ) : null}
    </div>
  );
}
