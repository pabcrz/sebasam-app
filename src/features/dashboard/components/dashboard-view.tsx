import Link from "next/link";
import type { UserRole } from "@/generated/prisma/client";
import {
  Banknote,
  ClipboardList,
  FileCheck,
  FileText,
  UserCog,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, SectionLabel } from "@/components/ui";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import type { QuoteFormActionState } from "@/features/quotes/actions";
import type { OperationalDashboardSnapshot } from "../types";
import { QueueSnapshotCards } from "./queue-snapshot-cards";
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
}

const modules = [
  {
    href: "/admin/customers",
    title: "Clientes",
    description: "Alta, búsqueda y edición de clientes.",
    icon: Users,
  },
  {
    href: "/admin/nomina",
    title: "Nómina",
    description: "Cálculo y liquidación semanal de mano de obra.",
    icon: Banknote,
  },
  {
    href: "/admin/workers",
    title: "Trabajadores",
    description: "Gestionar maestros y ayudantes operativos.",
    icon: UserCog,
  },
];

const patronModules = [
  modules[0],
  {
    href: "/admin/quotes",
    title: "Cotizaciones",
    description: "Crear y dar seguimiento a cotizaciones.",
    icon: FileText,
  },
  {
    href: "/admin/work-orders",
    title: "Trabajos",
    description: "Revisar y gestionar trabajos operativos.",
    icon: ClipboardList,
  },
  {
    href: "/admin/notas",
    title: "Notas",
    description: "Consultar y gestionar notas de trabajo y venta.",
    icon: FileCheck,
  },
];

export function DashboardView({
  snapshot,
  customers,
  createQuoteAction,
  createCustomerForQuoteAction,
  searchCustomersAction,
  role,
}: DashboardViewProps) {
  const isPatron = role === "ADMIN";
  const quickAccessModules = isPatron ? patronModules : modules;
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-main)] sm:text-2xl">Inicio</h1>
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

      {/* Main Operational Stack */}
      <div className="space-y-6">
        {/* 1. Live Queues Snapshot */}
        <QueueSnapshotCards queues={snapshot.queues} />

        {!isPatron ? <ReceivablesSection customers={snapshot.receivables} /> : null}

        {/* 3. Operational KPIs per Period */}
        {!isPatron ? <KpiPeriodMetrics kpis={snapshot.kpis} /> : null}

        {/* 3. Weekly Payroll Estimate */}
        {!isPatron ? <PayrollEstimateCard payroll={snapshot.weeklyPayroll} /> : null}

        {/* 4. Quick Access Modules */}
        <div>
          <SectionLabel className="mb-3">Módulos del Sistema</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quickAccessModules.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
              >
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-blue-tint)] text-[var(--color-primary)]">
                        <module.icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <CardTitle as="h3">{module.title}</CardTitle>
                    </div>
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
