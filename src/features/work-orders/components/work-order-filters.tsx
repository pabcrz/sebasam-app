"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ActiveFilterChips,
  Button,
  FilterSheet,
  Icon,
  InfoTip,
  Input,
  Label,
  SearchBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type ActiveFilterChip,
} from "@/components/ui";
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

type DateKey = "dateFrom" | "dateTo" | "scheduledFrom" | "scheduledTo";
type ChangeState = Partial<Record<"number" | "concept" | "plate" | "economicNumber" | "customerId" | "execution" | "assignee" | DateKey, string | undefined>>;

/** Sheet fields are staged until "Ver resultados"; the folio search applies on its own. */
type WorkOrderFilterDraft = {
  concept: string;
  plate: string;
  economicNumber: string;
  customerId: string;
  execution: string;
  assignee: string;
  dateFrom: string;
  dateTo: string;
  scheduledFrom: string;
  scheduledTo: string;
};

const executionLabels = { PLANNED: "Pendiente de asignación", ASSIGNED: "Asignado", IN_PROGRESS: "En ejecución" };
const textFields = [["concept", "Concepto"], ["plate", "Placas"], ["economicNumber", "ECO"]] as const;
const dateGroups = [
  {
    label: "Fecha operativa",
    info: "Fecha operativa de la cotización; ambos días incluidos.",
    fields: [["dateFrom", "Fecha operativa desde"], ["dateTo", "Fecha operativa hasta"]],
  },
  {
    label: "Programación",
    info: "Fecha programada del trabajo; ambos días incluidos, hora de Ciudad de México.",
    fields: [["scheduledFrom", "Programación desde"], ["scheduledTo", "Programación hasta"]],
  },
] as const;

function draftFrom(state: ReturnType<typeof parseWorkOrderParams>, rejected?: Props["rejectedRange"]): WorkOrderFilterDraft {
  const dateOf = (key: DateKey) => rejected?.dates[key] ?? (state[key] ? dateValue(state[key]) : "");
  return {
    concept: state.concept ?? "",
    plate: state.plate ?? "",
    economicNumber: state.economicNumber ?? "",
    customerId: state.customerId ?? "all",
    execution: state.execution ?? "all",
    assignee: state.assignee,
    dateFrom: dateOf("dateFrom"),
    dateTo: dateOf("dateTo"),
    scheduledFrom: dateOf("scheduledFrom"),
    scheduledTo: dateOf("scheduledTo"),
  };
}

function FilterSelect({ name, label, value, options, onChange }: {
  name: string; label: string; value: string; options: (readonly [string, string])[]; onChange: (value: string) => void;
}) {
  // Preserve a selected customer/master even if absent from the current option list.
  const choices = options.some(([id]) => id === value) ? options : [...options, [value, value]];
  return (
    <div className="grid min-w-0 gap-1.5">
      <Label htmlFor={`work-${name}`}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
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

/** Remounted per folio in the URL, so its text always starts from the applied folio. */
function WorkOrderSearchField({ initialValue, onSearch }: { initialValue: string; onSearch: (value: string) => void }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <form role="search" className="min-w-0 flex-1" onSubmit={(event) => { event.preventDefault(); onSearch(value.trim()); }}>
      <SearchBar
        value={value}
        onValueChange={(next) => {
          setValue(next);
          if (next === "") onSearch("");
        }}
        placeholder="Buscar por folio"
        aria-label="Buscar por folio"
        enterKeyHint="search"
      />
    </form>
  );
}

export function WorkOrderFilters({ filters, customers, workers, rejectedRange }: Props) {
  const router = useRouter();
  const effective = parseWorkOrderParams(filters);
  const [open, setOpen] = React.useState(Boolean(rejectedRange));
  const [error, setError] = React.useState(rejectedRange ? rangeMessage(rejectedRange.kind) : "");
  const [draft, setDraft] = React.useState<WorkOrderFilterDraft>(() => draftFrom(effective, rejectedRange));

  const chips: ActiveFilterChip[] = [];
  for (const [key, label] of [["number", "Folio"], ["concept", "Concepto"], ["plate", "Placas"], ["economicNumber", "ECO"]] as const) {
    if (effective[key]) chips.push({ id: key, label: `${label}: ${effective[key]}` });
  }
  if (effective.customerId) chips.push({ id: "customerId", label: `Cliente: ${customers.find((c) => c.id === effective.customerId)?.name ?? effective.customerId}` });
  if (effective.execution) chips.push({ id: "execution", label: `Ejecución: ${executionLabels[effective.execution]}` });
  if (effective.assignee !== "all") chips.push({ id: "assignee", label: `Responsable: ${effective.assignee === "workshop" ? "Taller especial" : workers.find((w) => w.id === effective.assignee)?.displayName ?? effective.assignee}` });
  for (const group of dateGroups) {
    for (const [key, label] of group.fields) {
      const value = effective[key];
      if (value) chips.push({ id: key, label: `${label}: ${dateValue(value)}` });
    }
  }

  /** Returns false, and keeps the current list and sheet, when the resulting date range is inverted. */
  function navigate(changes: ChangeState): boolean {
    try {
      const next = parseWorkOrderParams({ ...effective, ...changes, page: 1 });
      setError("");
      router.push(workOrdersHref(next));
      return true;
    } catch (cause) {
      if (!(cause instanceof RangeError)) throw cause;
      setError(rangeMessage(cause.message === "scheduledFrom must not be after scheduledTo." ? "scheduled" : "operational"));
      return false;
    }
  }

  function applyDraft(): boolean {
    return navigate({
      concept: draft.concept.trim() || undefined,
      plate: draft.plate.trim() || undefined,
      economicNumber: draft.economicNumber.trim() || undefined,
      customerId: draft.customerId === "all" ? undefined : draft.customerId,
      execution: draft.execution === "all" ? undefined : draft.execution,
      assignee: draft.assignee,
      dateFrom: draft.dateFrom || undefined,
      dateTo: draft.dateTo || undefined,
      scheduledFrom: draft.scheduledFrom || undefined,
      scheduledTo: draft.scheduledTo || undefined,
    });
  }

  function clearAll() {
    setError("");
    setOpen(false);
    router.push("/admin/work-orders");
  }

  return (
    <section aria-label="Filtros de trabajos" className="grid min-w-0 gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <WorkOrderSearchField
          key={effective.number ?? ""}
          initialValue={effective.number ?? ""}
          onSearch={(value) => navigate({ number: value || undefined })}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            setDraft(draftFrom(effective, rejectedRange));
            setOpen(true);
          }}
        >
          <Icon name="filter" className="h-4 w-4" aria-hidden="true" />
          {chips.length > 0 ? `Filtros (${chips.length})` : "Filtros"}
        </Button>
      </div>

      {chips.length > 0 || error ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ActiveFilterChips filters={chips} onRemove={(id) => navigate({ [id]: undefined })} />
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={clearAll}>Limpiar</Button>
        </div>
      ) : null}

      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        onClear={() => setDraft(draftFrom(parseWorkOrderParams({}), undefined))}
        onApply={applyDraft}
      >
        {error ? <p id="work-range-error" role="alert" className="text-sm text-[var(--color-status-danger)]">{error}</p> : null}
        <p className="text-sm text-[var(--color-text-muted)]">Solo órdenes activas: pendientes de asignación, asignadas y en ejecución. El responsable filtra maestro o taller especial.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {textFields.map(([key, label]) => (
            <div key={key} className="grid min-w-0 gap-1.5">
              <Label htmlFor={`work-${key}`}>{label}</Label>
              <Input id={`work-${key}`} name={key} type="search" value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.currentTarget.value })} placeholder={label} />
            </div>
          ))}
          <FilterSelect name="customerId" label="Cliente" value={draft.customerId} options={[["all", "Todos"], ...customers.map((c) => [c.id, c.name] as const)]} onChange={(customerId) => setDraft({ ...draft, customerId })} />
          <FilterSelect name="execution" label="Ejecución" value={draft.execution} options={[["all", "Todas"], ...Object.entries(executionLabels)]} onChange={(execution) => setDraft({ ...draft, execution })} />
          <FilterSelect name="assignee" label="Responsable" value={draft.assignee} options={[["all", "Todos"], ["workshop", "Taller especial"], ...workers.map((w) => [w.id, w.displayName] as const)]} onChange={(assignee) => setDraft({ ...draft, assignee })} />
        </div>

        {dateGroups.map((group, index) => (
          <section key={group.label} className="grid min-w-0 gap-3">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium text-[var(--color-text-main)]">{group.label}</h3>
              <InfoTip label={`Qué incluye: ${group.label}`}>{group.info}</InfoTip>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {group.fields.map(([key, label]) => (
                <div key={key} className="grid min-w-0 gap-1.5">
                  <Label htmlFor={`work-${key}`}>{label}</Label>
                  <Input
                    id={`work-${key}`}
                    name={key}
                    type="date"
                    value={draft[key]}
                    onChange={(event) => setDraft({ ...draft, [key]: event.currentTarget.value })}
                    aria-invalid={Boolean(error && (index === 1 ? error.startsWith("La programación") : error.startsWith("La fecha")))}
                    aria-describedby={error ? "work-range-error" : undefined}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </FilterSheet>
    </section>
  );
}
