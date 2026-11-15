"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { ActiveFilterChips, Button, Chip, FilterSheet, Input, Label, SearchBar, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, StatusFilterNav } from "@/components/ui";
import type { QuoteFilterInput } from "@/features/quotes/schemas";
import {
  formatDateValue,
  getQuoteFilterChips,
  matchDateShortcut,
  parseOperationalQuoteParams,
  quoteDateShortcutLabels,
  quoteDateShortcutRange,
  quoteDateShortcuts,
  quotesHref,
  removeQuoteFilterChip,
  statusChips,
  todayInOperationalTimeZone,
  type QuoteDateShortcut,
  type QuoteFilterChipId,
  type QuoteFilterState,
  type QuoteFiltersCustomer,
} from "../quote-filter-model";

type QuoteFiltersProps = {
  filters: QuoteFilterInput & Partial<Pick<ReturnType<typeof parseOperationalQuoteParams>, "concept" | "kind" | "page">>;
  rejectedDateRange?: { from: string; to: string };
  customers: QuoteFiltersCustomer[];
};

type DateChoice = QuoteDateShortcut | "all" | "custom";

/** Sheet fields staged until "Ver resultados"; the folio search applies on its own. */
type QuoteFilterDraft = {
  dateChoice: DateChoice;
  dateFrom: string;
  dateTo: string;
  hasWorkOrder: "ALL" | "true" | "false";
  kind: "all" | "WORK" | "SALE";
  customerId: string;
  concept: string;
  plate: string;
  economicNumber: string;
  showCancelled: boolean;
  showArchived: boolean;
};

function draftFromState(state: QuoteFilterState, today: string, rejectedDateRange?: { from: string; to: string }): QuoteFilterDraft {
  const shortcut = matchDateShortcut(state, today);
  const hasDates = Boolean(state.dateFrom || state.dateTo);
  return {
    dateChoice: shortcut ?? (rejectedDateRange || hasDates ? "custom" : "all"),
    dateFrom: rejectedDateRange?.from ?? formatDateValue(state.dateFrom),
    dateTo: rejectedDateRange?.to ?? formatDateValue(state.dateTo),
    hasWorkOrder: state.hasWorkOrder === undefined ? "ALL" : String(state.hasWorkOrder) as "true" | "false",
    kind: state.kind,
    customerId: state.customerId ?? "ALL",
    concept: state.concept ?? "",
    plate: state.plate ?? "",
    economicNumber: state.economicNumber ?? "",
    showCancelled: state.showCancelled,
    showArchived: state.showArchived,
  };
}

function dateRangeForDraft(draft: QuoteFilterDraft, today: string): { dateFrom?: string; dateTo?: string } {
  if (draft.dateChoice === "all") return {};
  if (draft.dateChoice === "custom") return { dateFrom: draft.dateFrom || undefined, dateTo: draft.dateTo || undefined };
  return quoteDateShortcutRange(draft.dateChoice, today);
}

const dateChoices: Array<{ key: DateChoice; label: string }> = [
  { key: "all", label: "Todas" },
  ...quoteDateShortcuts.map((shortcut) => ({ key: shortcut, label: quoteDateShortcutLabels[shortcut] })),
  { key: "custom", label: "Elegir fechas" },
];

/** Remounted per folio in the URL, so its text always starts from the applied search. */
function QuoteSearchField({ initialValue, onSearch }: { initialValue: string; onSearch: (value: string) => void }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <form
      role="search"
      className="min-w-0 flex-1"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
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

export function QuoteFilters({ filters, customers, rejectedDateRange }: QuoteFiltersProps) {
  const router = useRouter();
  const today = todayInOperationalTimeZone();
  const effectiveFilters = parseOperationalQuoteParams(filters);
  const chips = getQuoteFilterChips(effectiveFilters, customers, today);
  const [sheetOpen, setSheetOpen] = React.useState(Boolean(rejectedDateRange));
  const [rangeError, setRangeError] = React.useState(Boolean(rejectedDateRange));
  const [draft, setDraft] = React.useState<QuoteFilterDraft>(() =>
    draftFromState(effectiveFilters, today, rejectedDateRange),
  );

  function pushState(next: QuoteFilterState) {
    setRangeError(false);
    router.push(quotesHref(next));
  }

  /** Returns false, and keeps the current list, when the resulting date range is inverted. */
  function navigate(changes: Record<string, unknown>): boolean {
    try {
      pushState(parseOperationalQuoteParams({ ...effectiveFilters, ...changes, page: 1 }));
      return true;
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      setRangeError(true);
      return false;
    }
  }

  function openSheet() {
    setDraft(draftFromState(effectiveFilters, today));
    setSheetOpen(true);
  }

  function applyDraft(): boolean {
    return navigate({
      ...dateRangeForDraft(draft, today),
      hasWorkOrder: draft.hasWorkOrder === "ALL" ? undefined : draft.hasWorkOrder === "true",
      kind: draft.kind,
      customerId: draft.customerId === "ALL" ? undefined : draft.customerId,
      concept: draft.concept.trim() || undefined,
      plate: draft.plate.trim() || undefined,
      economicNumber: draft.economicNumber.trim() || undefined,
      showCancelled: draft.showCancelled,
      showArchived: draft.showArchived,
    });
  }

  function removeChip(id: string) {
    pushState(removeQuoteFilterChip(effectiveFilters, id as QuoteFilterChipId));
  }

  return (
    <div className="grid gap-3">
      <StatusFilterNav
        label="Filtros directos por estado"
        items={statusChips.map((chip) => ({
          href: quotesHref({ ...effectiveFilters, status: chip.key === "ALL" ? undefined : chip.key, page: 1 }),
          label: chip.label,
          current: (effectiveFilters.status ?? "ALL") === chip.key,
        }))}
      />

      <div className="flex items-center gap-2">
        <QuoteSearchField
          key={effectiveFilters.number ?? ""}
          initialValue={effectiveFilters.number ?? ""}
          onSearch={(value) => navigate({ number: value || undefined })}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={openSheet}
        >
          <Icon name="filter" className="h-4 w-4" aria-hidden="true" />
          {chips.length > 0 ? `Filtros · ${chips.length}` : "Filtros"}
        </Button>
      </div>

      {chips.length > 0 ? (
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <ActiveFilterChips filters={chips} onRemove={removeChip} />
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => pushState(parseOperationalQuoteParams({}))}>
            Limpiar
          </Button>
        </div>
      ) : null}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClear={() => setDraft(draftFromState(parseOperationalQuoteParams({}), today))}
        onApply={applyDraft}
      >
        {rangeError ? (
          <p id="quote-date-error" role="alert" className="text-sm text-[var(--color-status-danger)]">
            La fecha operativa desde no puede ser posterior a hasta. Corrige el rango para consultar cotizaciones.
          </p>
        ) : null}

        <section className="grid gap-2">
          <h3 className="text-sm font-medium text-[var(--color-text-main)]">Fecha de cotización</h3>
          <div role="group" aria-label="Fecha de cotización" className="flex flex-wrap gap-2">
            {dateChoices.map((choice) => (
              <Chip
                key={choice.key}
                pressed={draft.dateChoice === choice.key}
                onClick={() => setDraft({ ...draft, dateChoice: choice.key })}
              >
                {choice.label}
              </Chip>
            ))}
          </div>
          {draft.dateChoice === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="dateFrom" className="text-sm">Desde</Label>
                <Input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  value={draft.dateFrom}
                  onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })}
                  aria-describedby="quote-date-help"
                  aria-invalid={rangeError}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dateTo" className="text-sm">Hasta</Label>
                <Input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  value={draft.dateTo}
                  onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })}
                  aria-describedby="quote-date-help"
                  aria-invalid={rangeError}
                />
              </div>
              <p id="quote-date-help" className="col-span-2 text-sm text-[var(--color-text-muted)]">
                Fecha operativa de cotización (ambos días incluidos)
              </p>
            </div>
          ) : null}
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-medium text-[var(--color-text-main)]">Orden de trabajo</h3>
          <div role="group" aria-label="Orden de trabajo" className="flex flex-wrap gap-2">
            {([["ALL", "Todas"], ["true", "Con orden"], ["false", "Sin orden"]] as const).map(([key, label]) => (
              <Chip key={key} pressed={draft.hasWorkOrder === key} onClick={() => setDraft({ ...draft, hasWorkOrder: key })}>
                {label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="grid gap-2">
          <h3 className="text-sm font-medium text-[var(--color-text-main)]">Tipo de operación</h3>
          <div role="group" aria-label="Tipo de operación" className="flex flex-wrap gap-2">
            {([["all", "Todas"], ["WORK", "Trabajo"], ["SALE", "Venta"]] as const).map(([key, label]) => (
              <Chip key={key} pressed={draft.kind === key} onClick={() => setDraft({ ...draft, kind: key })}>
                {label}
              </Chip>
            ))}
          </div>
        </section>

        <section className="grid gap-3">
          <h3 className="text-sm font-medium text-[var(--color-text-main)]">Otros criterios</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="customerId" className="text-sm">Cliente</Label>
              <Select value={draft.customerId} onValueChange={(customerId) => setDraft({ ...draft, customerId })}>
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
              <Label htmlFor="concept" className="text-sm">Concepto</Label>
              <Input id="concept" name="concept" type="search" value={draft.concept} onChange={(event) => setDraft({ ...draft, concept: event.target.value })} placeholder="Título o concepto" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="plate" className="text-sm">Placas</Label>
              <Input id="plate" name="plate" type="search" value={draft.plate} onChange={(event) => setDraft({ ...draft, plate: event.target.value })} placeholder="Ej. ABC-123" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="economicNumber" className="text-sm">ECO</Label>
              <Input id="economicNumber" name="economicNumber" type="search" value={draft.economicNumber} onChange={(event) => setDraft({ ...draft, economicNumber: event.target.value })} placeholder="Ej. ECO-42" />
            </div>
          </div>
          <div className="grid gap-2 text-sm font-medium">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.showCancelled} onChange={(event) => setDraft({ ...draft, showCancelled: event.target.checked })} className="h-4 w-4 rounded border-[var(--color-border-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
              Incluir canceladas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={draft.showArchived} onChange={(event) => setDraft({ ...draft, showArchived: event.target.checked })} className="h-4 w-4 rounded border-[var(--color-border-light)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
              Incluir archivadas
            </label>
            <p className="text-sm font-normal text-[var(--color-text-muted)]">Se suman a Todas. Con una pestaña de estado elegida no aplican.</p>
          </div>
        </section>
      </FilterSheet>
    </div>
  );
}
