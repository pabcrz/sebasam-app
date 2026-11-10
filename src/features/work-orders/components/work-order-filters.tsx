"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import { dateValue, parseWorkOrderParams, workOrdersHref } from "../work-order-filter-model";

type Props = {
  filters: ReturnType<typeof parseWorkOrderParams>;
  rejectedRange?: {
    kind: "operational" | "scheduled";
    dates: Partial<Record<"dateFrom" | "dateTo" | "scheduledFrom" | "scheduledTo", string>>;
  };
  customers: { id: string; name: string }[];
  workers: { id: string; displayName: string }[];
};
const executionLabels = { PLANNED: "Pendiente de asignación", ASSIGNED: "Asignado", IN_PROGRESS: "En ejecución" };
const textFields = [["number", "Folio"], ["concept", "Concepto"], ["plate", "Placas"], ["economicNumber", "ECO"]] as const;
const dateGroups = [
  { label: "Fecha operativa de cotización (ambos días incluidos)", fields: [["dateFrom", "Fecha operativa desde"], ["dateTo", "Fecha operativa hasta"]] },
  { label: "Programación (ambos días incluidos; Ciudad de México)", fields: [["scheduledFrom", "Programación desde"], ["scheduledTo", "Programación hasta"]] },
] as const;

function FilterSelect({ name, label, value, options }: {
  name: string; label: string; value: string; options: (readonly [string, string])[];
}) {
  // Preserve a selected customer/master even if absent from the current option list.
  const choices = options.some(([id]) => id === value) ? options : [...options, [value, value]];
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={`work-${name}`}>{label}</Label>
      <Select name={name} defaultValue={value}>
        <SelectTrigger id={`work-${name}`} aria-label={label}><SelectValue /></SelectTrigger>
        <SelectContent>
          {choices.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function rangeMessage(kind: "operational" | "scheduled") {
  return kind === "scheduled"
    ? "La programación desde no puede ser posterior a hasta. Corrige el rango."
    : "La fecha operativa desde no puede ser posterior a hasta. Corrige el rango.";
}

export function WorkOrderFilters({ filters, customers, workers, rejectedRange }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(Boolean(rejectedRange));
  const [error, setError] = React.useState(rejectedRange ? rangeMessage(rejectedRange.kind) : "");
  const effective = parseWorkOrderParams(filters);
  const summary: string[] = [];
  for (const [key, label] of textFields) {
    if (effective[key]) summary.push(`${label}: ${effective[key]}`);
  }
  if (effective.customerId) summary.push(`Cliente: ${customers.find((c) => c.id === effective.customerId)?.name ?? effective.customerId}`);
  if (effective.execution) summary.push(`Ejecución: ${executionLabels[effective.execution]}`);
  if (effective.assignee !== "all") summary.push(`Responsable: ${effective.assignee === "workshop" ? "Taller especial" : workers.find((w) => w.id === effective.assignee)?.displayName ?? effective.assignee}`);
  for (const group of dateGroups) {
    for (const [key, label] of group.fields) {
      const value = effective[key];
      if (value) summary.push(`${label}: ${dateValue(value)}`);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entries = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (entries.customerId === "all") delete entries.customerId;
    try {
      const next = parseWorkOrderParams(entries);
      setError("");
      router.push(workOrdersHref(next));
    } catch (cause) {
      if (!(cause instanceof RangeError)) throw cause;
      setError(rangeMessage(cause.message === "scheduledFrom must not be after scheduledTo." ? "scheduled" : "operational"));
    }
  }

  return (
    <section aria-label="Filtros de trabajos" className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--color-text-muted)]">{summary.length ? `${summary.length} filtros activos` : "Sin filtros activos"}</p>
        <div className="flex flex-wrap gap-2">
          {summary.length > 0 || error ? <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={() => {
            setError("");
            setOpen(false);
            router.push("/admin/work-orders");
          }}>Limpiar</Button> : null}
          <Button type="button" variant="secondary" size="sm" className="min-h-11" aria-expanded={open} aria-controls="work-filter-fields" onClick={() => setOpen(!open)}>
            {open ? "Ocultar filtros" : "Mostrar filtros"}
          </Button>
        </div>
      </div>
      {summary.length > 0 ? <div aria-label="Filtros activos" className="flex flex-wrap gap-2">
        {summary.map((item) => <span key={item} className="rounded-full border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 py-1 text-xs">{item}</span>)}
      </div> : null}
      {error ? <p id="work-range-error" role="alert" className="text-sm text-[var(--color-status-danger)]">{error}</p> : null}
      {open ? <form key={workOrdersHref(effective)} id="work-filter-fields" onSubmit={submit} className="grid min-w-0 gap-4">
        <p className="text-sm text-[var(--color-text-muted)]">Solo órdenes activas de trabajo: pendientes de asignación, asignadas y en ejecución. El responsable filtra maestro o taller especial.</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {textFields.map(([key, label]) => <div key={key} className="grid min-w-0 gap-1.5">
            <Label htmlFor={`work-${key}`}>{label}</Label>
            <Input id={`work-${key}`} name={key} type="search" defaultValue={effective[key] ?? ""} placeholder={key === "number" ? "Referencia o folio" : label} />
          </div>)}
          <FilterSelect name="customerId" label="Cliente" value={effective.customerId ?? "all"} options={[["all", "Todos"], ...customers.map((c) => [c.id, c.name] as const)]} />
          <FilterSelect name="execution" label="Ejecución" value={effective.execution ?? "all"} options={[["all", "Todas"], ...Object.entries(executionLabels)]} />
          <FilterSelect name="assignee" label="Responsable" value={effective.assignee} options={[["all", "Todos"], ["workshop", "Taller especial"], ...workers.map((w) => [w.id, w.displayName] as const)]} />
        </div>
        {dateGroups.map((group, index) => <fieldset key={group.label} className="grid min-w-0 gap-2">
          <legend className="mb-2 text-sm text-[var(--color-text-muted)]">{group.label}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.fields.map(([key, label]) => <div key={key} className="grid min-w-0 gap-1.5">
              <Label htmlFor={`work-${key}`}>{label}</Label>
              <Input id={`work-${key}`} name={key} type="date" defaultValue={rejectedRange?.dates[key] ?? (effective[key] ? dateValue(effective[key]) : "")}
                aria-invalid={Boolean(error && (index === 1 ? error.startsWith("La programación") : error.startsWith("La fecha")))} aria-describedby={error ? "work-range-error" : undefined} />
            </div>)}
          </div>
        </fieldset>)}
        <Button type="submit" variant="secondary" className="w-full sm:w-fit">Filtrar</Button>
      </form> : null}
    </section>
  );
}
