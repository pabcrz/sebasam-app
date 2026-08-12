"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { notasHref, type NotasMode, type NotasPayment } from "../notas-period";

export function NotasFilters({ mode, payment, anchor, rangeLabel, isCurrentWeek }: { mode: NotasMode; payment: NotasPayment; anchor: string; rangeLabel: string; isCurrentWeek: boolean }) {
  const router = useRouter();
  const shifted = (amount: number) => {
    const date = new Date(`${anchor}T12:00:00Z`);
    if (mode === "week") date.setUTCDate(date.getUTCDate() + amount * 7);
    else date.setUTCMonth(date.getUTCMonth() + amount);
    return date.toISOString().slice(0, 10);
  };
  return <nav aria-label="Filtros de notas" className="grid gap-5 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Periodo seleccionado</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-lg font-semibold text-[var(--color-text-main)]">{rangeLabel}</p>
          {isCurrentWeek ? <Badge variant="info">Semana en curso</Badge> : null}
        </div>
      </div>
      <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
        <Link href={notasHref({ mode: mode === "week" ? "month" : "week", payment, anchor })}>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {mode === "week" ? "Vista mensual" : "Vista semanal"}
        </Link>
      </Button>
    </div>

    <div className="grid gap-2">
      <p className="text-xs font-semibold text-[var(--color-text-muted)]">Estado de pago</p>
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-[var(--color-bg-soft)] p-1" aria-label="Estado de pago">
        {(["all", "pending", "paid"] as const).map((item) => {
          const label = ({ all: "Todas", pending: "Pendientes", paid: "Pagadas" } as const)[item];
          return payment === item
            ? <span key={item} aria-current="true" className="inline-flex h-9 cursor-default items-center justify-center rounded-md bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-text-main)] shadow-sm">{label}</span>
            : <Button key={item} asChild variant="ghost" size="sm" className="px-4"><Link href={notasHref({ mode, anchor, payment: item })}>{label}</Link></Button>;
        })}
      </div>
    </div>

    <div className="flex flex-col gap-2 border-t border-[var(--color-border-light)] pt-4 sm:flex-row sm:items-end">
      <Button asChild variant="outline" size="sm" className="sm:w-auto">
        <Link aria-label="Periodo anterior" href={notasHref({ mode, payment, anchor: shifted(-1) })}><ChevronLeft className="h-4 w-4" aria-hidden="true" />Anterior</Link>
      </Button>
      <label className="grid min-w-0 flex-1 gap-1 text-xs font-semibold text-[var(--color-text-muted)] sm:max-w-xs">{mode === "week" ? "Ir a la semana" : "Ir al mes"}<input className="h-9 min-w-0 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)]" aria-label={mode === "week" ? "Semana" : "Mes y año"} type={mode === "week" ? "date" : "month"} name="anchor" defaultValue={mode === "week" ? anchor : anchor.slice(0, 7)} onChange={(event) => { if (event.currentTarget.value) router.push(notasHref({ mode, payment, anchor: event.currentTarget.value })); }} /></label>
      <Button asChild variant="outline" size="sm" className="sm:w-auto">
        <Link aria-label="Periodo siguiente" href={notasHref({ mode, payment, anchor: shifted(1) })}>Siguiente<ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
      </Button>
    </div>
  </nav>;
}
