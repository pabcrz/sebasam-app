"use client";

import { useRouter } from "next/navigation";
import { PageHeader, PeriodNavigator, SectionLabel, StatTile } from "@/components/ui";
import type { PeriodView } from "@/lib/period-format";
import { formatCents } from "@/features/quotes/lib/format";
import { ReceivablesSection } from "@/features/dashboard/components/receivables-section";
import type { IncomeBalance } from "../queries";

type BalanceViewProps = {
  balance: IncomeBalance;
  period: PeriodView;
  anchor: string;
  rangeLabel: string;
  today: Date;
};

export function balanceHref(period: PeriodView, anchor: string): string {
  return `/admin/balance?${new URLSearchParams({ period, anchor })}`;
}

export function BalanceView({ balance, period, anchor, rangeLabel, today }: BalanceViewProps) {
  const router = useRouter();
  const go = (nextPeriod: PeriodView, nextAnchor: string) =>
    router.replace(balanceHref(nextPeriod, nextAnchor), { scroll: false });
  const { collected, receivables } = balance;

  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader title="Balance" subtitle="Lo que ya se cobró y lo que falta por cobrar" />

      <section aria-labelledby="balance-collected-heading" className="grid min-w-0 gap-3">
        <SectionLabel id="balance-collected-heading">Ingresos cobrados</SectionLabel>
        <PeriodNavigator
          view={period}
          anchor={anchor}
          today={today}
          weekDays={7}
          onViewChange={(next) => go(next, anchor)}
          onAnchorChange={(nextAnchor) => go(period, nextAnchor)}
        />
        <StatTile
          label={`Cobrado · ${rangeLabel}`}
          value={formatCents(collected.totalCents)}
          tone="success"
          info="Pagos registrados en el período. No incluye pagos revertidos ni saldos pendientes."
          description={
            collected.paymentsCount === 0
              ? "Sin pagos registrados en este período"
              : `${collected.paymentsCount} ${collected.paymentsCount === 1 ? "pago" : "pagos"}`
          }
        />
      </section>

      <section aria-label="Por cobrar" className="grid min-w-0 gap-3">
        <StatTile
          label="Saldo por cobrar a hoy"
          value={formatCents(receivables.totalCents)}
          tone="warning"
          info="Notas completadas con saldo pendiente. Es dinero que aún no entra: no se suma a lo cobrado."
          description={`${receivables.customers.length} ${receivables.customers.length === 1 ? "cliente" : "clientes"} con saldo`}
        />
        <ReceivablesSection customers={receivables.customers} limit={Infinity} />
      </section>
    </div>
  );
}
