import type { ReactNode } from "react";
import type { UserRole } from "@/generated/prisma/client";

import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import type { QuoteFormActionState } from "@/features/quotes/actions";
import { buildInboxRows, prioritizeInbox } from "../inbox-priority";
import { formatHomeDate, greetingFor, pendingLabel } from "../greeting";
import type { OperationalDashboardSnapshot } from "../types";
import { InboxRowsSection } from "./inbox-rows-section";
import { NextWorkCard } from "./next-work-card";
import { ReceivablesSection } from "./receivables-section";
import { KpiPeriodMetrics } from "./kpi-period-metrics";
import { PayrollEstimateCard } from "./payroll-estimate-card";

type CustomerOption = {
  id: string;
  name: string;
};

interface DashboardViewProps {
  snapshot: OperationalDashboardSnapshot;
  customers: CustomerOption[];
  createCustomerAction?: (formData: FormData) => void | Promise<void>;
  createQuoteAction: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  createCustomerForQuoteAction?: (input: unknown) => Promise<{
    success: boolean;
    customer?: CustomerOption;
    error?: string;
    reused?: boolean;
  }>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
  role: UserRole;
  /** Actionable quote card for "Siguiente trabajo"; falls back to a static card when omitted. */
  nextWorkCard?: ReactNode;
  /** Reading time for the greeting and date; defaults to the current instant. */
  now?: Date;
}

export function DashboardView({
  snapshot,
  customers,
  createQuoteAction,
  createCustomerForQuoteAction,
  searchCustomersAction,
  role,
  nextWorkCard,
  now = new Date(),
}: DashboardViewProps) {
  const isPatron = role === "ADMIN";
  const inboxRows = prioritizeInbox(
    buildInboxRows(snapshot.queues, { oldestApprovedAt: snapshot.nextWork?.approvedAt ?? null, stoppedActiveCount: snapshot.queues.stoppedActiveCount }),
  );
  const todayRows = inboxRows.filter((row) => row.key === "approved" || row.key === "active");
  const followUpRows = inboxRows.filter((row) => row.key === "sent" || row.key === "draft");
  const pendingCount = inboxRows.reduce((total, row) => total + row.count, 0);

  return (
    <section className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">{greetingFor(now)}</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{`${formatHomeDate(now)} · ${pendingLabel(pendingCount)}`}</p>
        </div>
        <div>
          <QuoteBuilderDialog
            customers={customers}
            createAction={createQuoteAction}
            createCustomerAction={createCustomerForQuoteAction}
            searchCustomersAction={searchCustomersAction}
            triggerVariant="primary"
            triggerSize="sm"
            triggerIconOnlyMobile
          />
        </div>
      </div>

      {/* Work on the left, money on the right; one column on phones. ADMIN sees only the work. */}
      <div className={isPatron ? "grid gap-6" : "grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]"}>
        <div className="grid min-w-0 gap-6">
          {snapshot.nextWork ? <NextWorkCard nextWork={snapshot.nextWork} actionableCard={nextWorkCard} /> : null}

          <section
            aria-label="Pendientes"
            className="divide-y divide-[var(--color-border-light)] overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]"
          >
            <InboxRowsSection heading="Para hoy" rows={todayRows} emptyText="Nada pendiente para hoy." />
            <InboxRowsSection
              heading="Seguimiento de cotizaciones"
              rows={followUpRows}
              emptyText="Sin cotizaciones por dar seguimiento."
            />
          </section>
        </div>

        {isPatron ? null : (
          <div className="grid min-w-0 gap-6">
            <ReceivablesSection customers={snapshot.receivables} />
            <KpiPeriodMetrics kpis={snapshot.kpis} />
            <PayrollEstimateCard payroll={snapshot.weeklyPayroll} />
          </div>
        )}
      </div>
    </section>
  );
}
