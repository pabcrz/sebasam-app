"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Filter, X } from "lucide-react";
import type { QuoteStatus } from "@/generated/prisma/client";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusFilterNav } from "@/components/ui";
import type { QuoteFilterInput } from "@/features/quotes/schemas";

const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aceptada",
  REJECTED: "Declinada",
  CANCELLED: "Cancelada",
  ARCHIVED: "Archivada",
};

const statusChips: Array<{ key: QuoteStatus | "ALL"; label: string }> = [
  { key: "ALL", label: "Todas" },
  { key: "DRAFT", label: "Borrador" },
  { key: "SENT", label: "Enviadas" },
  { key: "APPROVED", label: "Aceptadas" },
  { key: "REJECTED", label: "Declinadas" },
  { key: "CANCELLED", label: "Canceladas" },
  { key: "ARCHIVED", label: "Archivadas" },
];

type QuoteFiltersCustomer = {
  id: string;
  name: string;
};

type QuoteFiltersProps = {
  filters: QuoteFilterInput;
  customers: QuoteFiltersCustomer[];
};

function formatDateValue(date: Date | undefined): string {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isQuoteStatus(value: string): value is QuoteStatus {
  return Object.prototype.hasOwnProperty.call(quoteStatusLabels, value);
}

function getActiveFilterSummary(filters: QuoteFilterInput, customers: QuoteFiltersCustomer[]): string[] {
  const summary: string[] = [];
  const customer = customers.find((item) => item.id === filters.customerId);

  if (filters.status) {
    summary.push(`Estatus: ${isQuoteStatus(filters.status) ? quoteStatusLabels[filters.status] : filters.status}`);
  }
  if (filters.customerId) summary.push(`Cliente: ${customer?.name ?? filters.customerId}`);
  if (filters.number) summary.push(`Folio: ${filters.number}`);
  if (filters.plate) summary.push(`Placas: ${filters.plate}`);
  if (filters.dateFrom) summary.push(`Desde: ${formatDateValue(filters.dateFrom)}`);
  if (filters.dateTo) summary.push(`Hasta: ${formatDateValue(filters.dateTo)}`);
  if (filters.hasWorkOrder === true) summary.push("Con Orden");
  if (filters.hasWorkOrder === false) summary.push("Sin Orden");
  if (filters.showCancelled) summary.push("Mostrar canceladas");
  if (filters.showArchived) summary.push("Mostrar archivadas");

  return summary;
}

function buildStatusFilterHref(currentFilters: QuoteFilterInput, targetStatus: QuoteStatus | "ALL"): string {
  const params = new URLSearchParams();

  if (targetStatus !== "ALL") {
    params.set("status", targetStatus);
  }

  if (currentFilters.customerId) params.set("customerId", currentFilters.customerId);
  if (currentFilters.number) params.set("number", currentFilters.number);
  if (currentFilters.plate) params.set("plate", currentFilters.plate);
  if (currentFilters.dateFrom) params.set("dateFrom", formatDateValue(currentFilters.dateFrom));
  if (currentFilters.dateTo) params.set("dateTo", formatDateValue(currentFilters.dateTo));
  if (currentFilters.hasWorkOrder !== undefined) params.set("hasWorkOrder", String(currentFilters.hasWorkOrder));

  const query = params.toString();
  return query ? `/admin/quotes?${query}` : "/admin/quotes";
}

export function QuoteFilters({ filters, customers }: QuoteFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const hasFilters =
    Boolean(filters.status) ||
    Boolean(filters.customerId) ||
    Boolean(filters.number) ||
    Boolean(filters.plate) ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    filters.hasWorkOrder !== undefined ||
    filters.showCancelled ||
    filters.showArchived;
  const activeFilterSummary = getActiveFilterSummary(filters, customers);

  const activeChipKey: QuoteStatus | "ALL" = filters.status && isQuoteStatus(filters.status)
    ? filters.status
    : filters.showCancelled && !filters.showArchived
      ? "CANCELLED"
      : filters.showArchived && !filters.showCancelled
        ? "ARCHIVED"
        : "ALL";

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();

    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.set(key, value.trim());
      }
    }

    router.push(`/admin/quotes?${params.toString()}`);
  }

  function handleClear() {
    router.push("/admin/quotes");
  }

  return (
    <div className="grid gap-4">
      <StatusFilterNav
        label="Filtros directos por estado"
        items={statusChips.map((chip) => ({
          href: buildStatusFilterHref(filters, chip.key),
          label: chip.label,
          current: activeChipKey === chip.key,
        }))}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="text-base font-medium text-[var(--color-text-main)]">Filtros</h3>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {hasFilters
              ? `${activeFilterSummary.length} filtro${activeFilterSummary.length === 1 ? "" : "s"} activo${activeFilterSummary.length === 1 ? "" : "s"}`
              : "Sin filtros activos"}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {hasFilters ? (
            <Button type="button" variant="outline" className="w-full sm:w-fit" onClick={handleClear}>
              <X className="h-4 w-4" aria-hidden="true" />
              Limpiar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-fit"
            aria-expanded={open}
            aria-controls="quote-filter-fields"
            onClick={() => setOpen((current) => !current)}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            {open ? "Ocultar filtros" : "Mostrar filtros"}
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </Button>
        </div>
      </div>

      {hasFilters ? (
        <div className="flex flex-wrap gap-2" aria-label="Filtros activos">
          {activeFilterSummary.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-text-main)]"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}

      {open ? (
        <form id="quote-filter-fields" onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="status" className="text-sm">
                Estatus
              </Label>
              <Select name="status" defaultValue={filters.status ?? ""}>
                <SelectTrigger id="status" aria-label="Estatus">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(quoteStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="hasWorkOrder" className="text-sm">
                Orden de Trabajo
              </Label>
              <Select name="hasWorkOrder" defaultValue={filters.hasWorkOrder === true ? "true" : filters.hasWorkOrder === false ? "false" : ""}>
                <SelectTrigger id="hasWorkOrder" aria-label="Orden de Trabajo">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="true">Con orden</SelectItem>
                  <SelectItem value="false">Sin orden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-8 sm:pt-0 sm:self-end sm:pb-2 lg:col-start-3">
              <input
                type="checkbox"
                id="showCancelled"
                name="showCancelled"
                value="true"
                defaultChecked={filters.showCancelled}
                className="h-4 w-4 rounded border-[var(--color-border-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <Label htmlFor="showCancelled" className="text-sm font-medium">
                Mostrar canceladas
              </Label>
              <input
                type="checkbox"
                id="showArchived"
                name="showArchived"
                value="true"
                defaultChecked={filters.showArchived}
                className="ml-3 h-4 w-4 rounded border-[var(--color-border-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <Label htmlFor="showArchived" className="text-sm font-medium">
                Mostrar archivadas
              </Label>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="customerId" className="text-sm">
                Cliente
              </Label>
              <Select name="customerId" defaultValue={filters.customerId ?? ""}>
                <SelectTrigger id="customerId" aria-label="Cliente">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="number" className="text-sm">
                Folio
              </Label>
              <Input
                id="number"
                name="number"
                defaultValue={filters.number ?? ""}
                placeholder="Ej. C-001"
                type="search"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="plate" className="text-sm">
                Placas
              </Label>
              <Input
                id="plate"
                name="plate"
                defaultValue={filters.plate ?? ""}
                placeholder="Ej. ABC-123"
                type="search"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="dateFrom" className="text-sm">
                Desde
              </Label>
              <Input
                id="dateFrom"
                name="dateFrom"
                defaultValue={formatDateValue(filters.dateFrom)}
                type="date"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="dateTo" className="text-sm">
                Hasta
              </Label>
              <Input
                id="dateTo"
                name="dateTo"
                defaultValue={formatDateValue(filters.dateTo)}
                type="date"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" variant="secondary" className="w-full sm:w-fit">
              Filtrar
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
