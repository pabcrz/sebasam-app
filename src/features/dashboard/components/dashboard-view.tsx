import Link from "next/link";
import type { UserRole } from "@/generated/prisma/client";

import { Card, CardContent, CardHeader, CardTitle, SectionLabel } from "@/components/ui";
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
  /** Reading time for the greeting and date; defaults to the current instant. */
  now?: Date;
}

type DashboardModule = {
  href: string;
  title: string;
  description: string;
};

const modules: DashboardModule[] = [
  {
    href: "/admin/customers",
    title: "Clientes",
    description: "Alta, búsqueda y edición de clientes.",
  },
  {
    href: "/admin/nomina",
    title: "Nómina",
    description: "Cálculo y liquidación semanal de mano de obra.",
  },
  {
    href: "/admin/workers",
    title: "Trabajadores",
    description: "Gestionar maestros y ayudantes operativos.",
  },
];

const patronModules: DashboardModule[] = [
  modules[0],
  {
    href: "/admin/quotes",
    title: "Cotizaciones",
    description: "Crear y dar seguimiento a cotizaciones.",
  },
  {
    href: "/admin/work-orders",
    title: "Trabajos",
    description: "Revisar y gestionar trabajos operativos.",
  },
  {
    href: "/admin/notas",
    title: "Notas",
    description: "Consultar y gestionar notas de trabajo y venta.",
  },
];

export function DashboardView({
  snapshot,
  customers,
  createQuoteAction,
  createCustomerForQuoteAction,
  searchCustomersAction,
  role,
  now = new Date(),
}: DashboardViewProps) {
  const isPatron = role === "ADMIN";
  const quickAccessModules = isPatron ? patronModules : modules;
  const inboxRows = prioritizeInbox(
    buildInboxRows(snapshot.queues, { oldestApprovedAt: snapshot.nextWork?.approvedAt ?? null }),
  );
  const todayRows = inboxRows.filter((row) => row.key === "approved" || row.key === "active");
  const followUpRows = inboxRows.filter((row) => row.key === "sent" || row.key === "draft");
  const pendingCount = inboxRows.reduce((total, row) => total + row.count, 0);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            triggerClassName="w-full sm:w-auto"
          />
        </div>
      </div>

      {/* Main Operational Stack: work first, finance and reports after */}
      <div className="space-y-6">
        {/* 1. Next job: the oldest approved quote waiting for a work order */}
        {snapshot.nextWork ? <NextWorkCard nextWork={snapshot.nextWork} /> : null}

        {/* 2 and 3. One list: today's operation first, then commercial follow-up, divided by rules */}
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

        {!isPatron ? <ReceivablesSection customers={snapshot.receivables} /> : null}

        {/* Operational KPIs per Period */}
        {!isPatron ? <KpiPeriodMetrics kpis={snapshot.kpis} /> : null}

        {/* Weekly Payroll Estimate */}
        {!isPatron ? <PayrollEstimateCard payroll={snapshot.weeklyPayroll} /> : null}

        {/* Quick Access Modules */}
        <div>
          <SectionLabel className="mb-3">Módulos del Sistema</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickAccessModules.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
              >
                <Card className="h-full border-0 transition-shadow group-hover:shadow-[var(--shadow-card-hover)]">
                  <CardHeader>
                    <CardTitle as="h3">{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-[var(--color-text-muted)]">{module.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
