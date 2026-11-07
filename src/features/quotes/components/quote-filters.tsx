"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusFilterNav } from "@/components/ui";
import type { QuoteFilterInput } from "@/features/quotes/schemas";
import {
  buildQuoteFilterFormHref,
  buildStatusFilterHref,
  formatDateValue,
  getQuoteFilterModel,
  quoteStatusLabels,
  statusChips,
  type QuoteFiltersCustomer,
} from "../quote-filter-model";

type QuoteFiltersProps = {
  filters: QuoteFilterInput;
  customers: QuoteFiltersCustomer[];
};

export function QuoteFilters({ filters, customers }: QuoteFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { hasFilters, activeFilterSummary, activeChipKey } = getQuoteFilterModel(filters, customers);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    router.push(buildQuoteFilterFormHref(formData.entries()));
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

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h3 className="text-base font-medium text-[var(--color-text-main)]">Filtros</h3>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            {hasFilters
              ? `${activeFilterSummary.length} filtro${activeFilterSummary.length === 1 ? "" : "s"} activo${activeFilterSummary.length === 1 ? "" : "s"}`
              : "Sin filtros activos"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasFilters ? (
            <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={handleClear}>
              <X className="h-4 w-4" aria-hidden="true" />
              Limpiar
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11"
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
