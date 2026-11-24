import Link from "next/link";
import { Button, Icon } from "@/components/ui";
import type { MonthPeriod } from "../profit-queries";

type MonthNavigatorProps = {
  period: MonthPeriod;
  /** Builds the link for another month, keeping the tab and view. */
  hrefFor: (month: string | null) => string;
};

/** Previous / next month and a way back to the current one. */
export function MonthNavigator({ period, hrefFor }: MonthNavigatorProps) {
  return (
    <nav aria-label="Mes" className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="icon" aria-label="Mes anterior">
        <Link href={hrefFor(period.prevMonth)}><Icon name="chevron-left" className="h-4 w-4" aria-hidden="true" /></Link>
      </Button>
      <p className="min-w-[8rem] text-center text-sm font-semibold text-[var(--color-text-main)]" aria-live="polite">{period.label}</p>
      <Button asChild variant="outline" size="icon" aria-label="Mes siguiente">
        <Link href={hrefFor(period.nextMonth)}><Icon name="chevron-right" className="h-4 w-4" aria-hidden="true" /></Link>
      </Button>
      {period.isCurrent ? null : (
        <Button asChild variant="ghost" size="sm">
          <Link href={hrefFor(null)}>Mes actual</Link>
        </Button>
      )}
    </nav>
  );
}
