import Link from "next/link";
import {
  Banknote,
  ClipboardList,
  FileCheck,
  FileText,
  UserCog,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomerCreateForm } from "@/features/customers/components/customer-create-form";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import type { QuoteFormActionState } from "@/features/quotes/actions";
import type { OperationalDashboardSnapshot } from "../types";
import { QueueSnapshotCards } from "./queue-snapshot-cards";
import { KpiPeriodMetrics } from "./kpi-period-metrics";
import { PayrollEstimateCard } from "./payroll-estimate-card";

type CustomerOption = {
  id: string;
  name: string;
};

interface DashboardViewProps {
  snapshot: OperationalDashboardSnapshot;
  customers: CustomerOption[];
  createCustomerAction: (formData: FormData) => void | Promise<void>;
  createQuoteAction: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  createCustomerForQuoteAction?: (input: unknown) => Promise<{
    success: boolean;
    customer?: CustomerOption;
    error?: string;
    reused?: boolean;
  }>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
}

const modules = [
  {
    href: "/admin/customers",
    title: "Clientes",
    description: "Alta, búsqueda y edición de clientes.",
    icon: Users,
  },
  {
    href: "/admin/quotes",
    title: "Cotizaciones",
    description: "Crear y gestionar cotizaciones en borrador.",
    icon: FileText,
  },
  {
    href: "/admin/work-orders",
    title: "Trabajos",
    description: "Trabajos en proceso. Asignación de maestro y cierre.",
    icon: ClipboardList,
  },
  {
    href: "/admin/notas",
    title: "Notas de remisión",
    description: "Trabajos finalizados e impresión de nota de entrega.",
    icon: FileCheck,
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

export function DashboardView({
  snapshot,
  customers,
  createCustomerAction,
  createQuoteAction,
  createCustomerForQuoteAction,
  searchCustomersAction,
}: DashboardViewProps) {
  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <h1 className="sr-only">Inicio</h1>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CustomerCreateForm
          action={createCustomerAction}
          triggerVariant="outline"
          triggerSize="sm"
        />
        <QuoteBuilderDialog
          customers={customers}
          createAction={createQuoteAction}
          createCustomerAction={createCustomerForQuoteAction}
          searchCustomersAction={searchCustomersAction}
          triggerVariant="primary"
          triggerSize="sm"
        />
      </div>

      {/* Main Operational Stack */}
      <div className="space-y-6">
        {/* 1. Live Queues Snapshot */}
        <QueueSnapshotCards queues={snapshot.queues} />

        {/* 2. Operational KPIs per Period */}
        <KpiPeriodMetrics kpis={snapshot.kpis} />

        {/* 3. Weekly Payroll Estimate */}
        <PayrollEstimateCard payroll={snapshot.weeklyPayroll} />

        {/* 4. Quick Access Modules */}
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Módulos del Sistema
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
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
