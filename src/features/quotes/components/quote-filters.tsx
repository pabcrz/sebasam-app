"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusFilterNav } from "@/components/ui";
import type { QuoteFilterInput } from "@/features/quotes/schemas";
import {
  parseOperationalQuoteParams,
  quotesHref,
  formatDateValue,
  getQuoteFilterModel,
  quoteStatusLabels,
  statusChips,
  type QuoteFiltersCustomer,
} from "../quote-filter-model";

type QuoteFiltersProps = {
  filters: QuoteFilterInput & Partial<Pick<ReturnType<typeof parseOperationalQuoteParams>, "concept" | "kind" | "page">>;
  rejectedDateRange?: { from: string; to: string };
  customers: QuoteFiltersCustomer[];
};

export function QuoteFilters({ filters, customers, rejectedDateRange }: QuoteFiltersProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(Boolean(rejectedDateRange));
  const [rangeError, setRangeError] = React.useState(Boolean(rejectedDateRange));
  const effectiveFilters = parseOperationalQuoteParams(filters);
  const { activeFilterSummary } = getQuoteFilterModel({
    ...filters,
    showArchived: !filters.status && filters.showArchived,
    showCancelled: !filters.status && filters.showCancelled,
  }, customers);
  if (effectiveFilters.concept) activeFilterSummary.push(`Concepto: ${effectiveFilters.concept}`);
  if (effectiveFilters.economicNumber) activeFilterSummary.push(`ECO: ${effectiveFilters.economicNumber}`);
  if (effectiveFilters.kind !== "all") activeFilterSummary.push(`Tipo: ${effectiveFilters.kind === "WORK" ? "Trabajo" : "Venta"}`);
  const hasFilters = activeFilterSummary.length > 0;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const entries = Object.fromEntries(formData.entries());
    if (entries.customerId === "ALL") delete entries.customerId;
    try {
      const next = parseOperationalQuoteParams(entries);
      setRangeError(false);
      router.push(quotesHref(next));
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setRangeError(true);
    }
  }

  function handleClear() {
    setRangeError(false);
    router.push("/admin/quotes");
  }

  return (
    <div className="grid gap-4">
      {!rangeError ? <StatusFilterNav
        label="Filtros directos por estado"
        items={statusChips.map((chip) => ({
          href: quotesHref({ ...effectiveFilters, status: chip.key === "ALL" ? undefined : chip.key, page: 1 }),
          label: chip.label,
          current: (effectiveFilters.status ?? "ALL") === chip.key,
        }))}
      /> : null}

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
          {hasFilters || rangeError ? (
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

      {rangeError ? (
        <p id="quote-date-error" role="alert" className="text-sm text-[var(--color-status-danger)]">
          La fecha operativa desde no puede ser posterior a hasta. Corrige el rango para consultar cotizaciones.
        </p>
      ) : null}
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
        <form key={quotesHref(effectiveFilters)} id="quote-filter-fields" onSubmit={handleSubmit} className="grid gap-4">
          <p id="quote-date-help" className="text-sm text-[var(--color-text-muted)]">Fecha operativa de cotización (ambos días incluidos)</p>
          <p className="text-sm text-[var(--color-text-muted)]">Archivo y cancelación amplían la consulta de todos los estados. Un estado específico conserva su alcance.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="grid gap-1.5">
              <Label htmlFor="status" className="text-sm">
                Estatus
              </Label>
              <Select name="status" disabled={rangeError} value={effectiveFilters.status ?? "ALL"} onValueChange={(status) => {
                router.push(quotesHref(parseOperationalQuoteParams({ ...effectiveFilters, status, page: 1 })));
              }}>
                <SelectTrigger id="status" aria-label="Estatus">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
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
              <Select name="hasWorkOrder" defaultValue={filters.hasWorkOrder === true ? "true" : filters.hasWorkOrder === false ? "false" : "ALL"}>
                <SelectTrigger id="hasWorkOrder" aria-label="Orden de Trabajo">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="true">Con orden</SelectItem>
                  <SelectItem value="false">Sin orden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:self-end">
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
              <Select name="customerId" defaultValue={filters.customerId ?? "ALL"}>
                <SelectTrigger id="customerId" aria-label="Cliente">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
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
                placeholder="Referencia o folio, ej. C-001"
                type="search"
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="concept" className="text-sm">Concepto</Label>
              <Input id="concept" name="concept" type="search" defaultValue={effectiveFilters.concept ?? ""} placeholder="Título o concepto" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="economicNumber" className="text-sm">ECO</Label>
              <Input id="economicNumber" name="economicNumber" type="search" defaultValue={effectiveFilters.economicNumber ?? ""} placeholder="Ej. ECO-42" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="kind" className="text-sm">Tipo de operación</Label>
              <Select name="kind" defaultValue={effectiveFilters.kind}>
                <SelectTrigger id="kind" aria-label="Tipo de operación"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="WORK">Trabajo</SelectItem>
                  <SelectItem value="SALE">Venta</SelectItem>
                </SelectContent>
              </Select>
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
                defaultValue={rejectedDateRange?.from ?? formatDateValue(filters.dateFrom)}
                aria-describedby={rangeError ? "quote-date-help quote-date-error" : "quote-date-help"}
                aria-invalid={rangeError}
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
                defaultValue={rejectedDateRange?.to ?? formatDateValue(filters.dateTo)}
                aria-describedby={rangeError ? "quote-date-help quote-date-error" : "quote-date-help"}
                aria-invalid={rangeError}
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
