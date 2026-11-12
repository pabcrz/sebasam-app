"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  ActiveFilterChips,
  Button,
  FilterSheet,
  InfoTip,
  Input,
  Label,
  PeriodNavigator,
  SearchBar,
  SegmentedControl,
  Spinner,
} from "@/components/ui";
import {
  notasHref,
  parseNotasParams,
  type NotasAssignee,
  type NotasMode,
  type NotasKind,
  type NotasOverdue,
  type NotasPayment,
} from "../notas-period";

import { dateValue } from "../work-order-filter-model";

type Master = { id: string; displayName: string };

type CustomerOption = {
  id: string;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  phone?: string | null;
};

export interface NotasFiltersProps {
  operationalState?: ReturnType<typeof parseNotasParams>;
  rejectedRange?: { from: string; to: string };
  mode: NotasMode;
  payment: NotasPayment;
  assignee: NotasAssignee;
  customerId?: string;
  overdue?: NotasOverdue;
  kind?: NotasKind;
  anchor: string;
  rangeLabel: string;
  isCurrentWeek: boolean;
  masters: Master[];
  selectedCustomer?: CustomerOption | null;
  searchCustomersAction?: (input: { query: string }) => Promise<CustomerOption[]>;
}

const customerSearchDebounceMs = 500;
const minimumCustomerQueryLength = 2;

const commonTextFields = [["number", "Folio"], ["concept", "Concepto"], ["plate", "Placas"], ["economicNumber", "ECO"]] as const;
const commonDateFields = [["dateFrom", "Desde"], ["dateTo", "Hasta"]] as const;
function commonDraft(state?: NotasFiltersProps["operationalState"], rejected?: NotasFiltersProps["rejectedRange"]) {
  return {
    number: state?.number ?? "", concept: state?.concept ?? "", plate: state?.plate ?? "", economicNumber: state?.economicNumber ?? "",
    dateFrom: rejected?.from ?? (state?.dateFrom ? dateValue(state.dateFrom) : ""), dateTo: rejected?.to ?? (state?.dateTo ? dateValue(state.dateTo) : ""),
    showArchived: state?.showArchived ?? false, showCancelled: state?.showCancelled ?? false,
  };
}

/** Every filter that can be removed from the active chips; each id maps to the URL field it resets. */
type NotasFilterChipId =
  | "number" | "concept" | "plate" | "economicNumber" | "customerId" | "dateFrom" | "dateTo"
  | "payment" | "kind" | "assignee" | "overdue" | "showArchived" | "showCancelled";

/** Remounted per URL, so its text always starts from the applied folio. Enter or clearing applies it. */
function NotasSearchField({ initialValue, disabled, onSearch }: { initialValue: string; disabled: boolean; onSearch: (value: string) => void }) {
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
        disabled={disabled}
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

/** Opt-in consumes the same canonical URL contract as the page caller. */
export function NotasFilters(props: NotasFiltersProps) {
  const operationalState = props.operationalState ? parseNotasParams(
    Object.fromEntries(new URLSearchParams(notasHref(props.operationalState, { operationalFilters: true }).split("?")[1])),
    undefined, { operationalFilters: true },
  ) : undefined;
  return <NotasFiltersContent {...props} {...operationalState} operationalState={operationalState} />;
}

function NotasFiltersContent({
  operationalState,
  rejectedRange,
  mode,
  payment,
  assignee,
  customerId,
  overdue = "all",
  kind,
  anchor,
  masters,
  selectedCustomer: initialSelectedCustomer,
  searchCustomersAction,
}: NotasFiltersProps) {
  const selectedKind = kind ?? "all";
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = React.useState(Boolean(rejectedRange));

  // Modal form draft state
  const [draftCommon, setDraftCommon] = React.useState(() => commonDraft(operationalState, rejectedRange));
  const [dateError, setDateError] = React.useState(Boolean(rejectedRange));
  const [draftKind, setDraftKind] = React.useState<NotasKind>(selectedKind);
  const [draftAssignee, setDraftAssignee] = React.useState<NotasAssignee>(assignee);
  const [draftOverdue, setDraftOverdue] = React.useState<NotasOverdue>(overdue);
  const [draftCustomerId, setDraftCustomerId] = React.useState<string | undefined>(customerId);
  const [draftSelectedCustomer, setDraftSelectedCustomer] = React.useState<CustomerOption | null>(
    initialSelectedCustomer ?? null,
  );

  // Customer remote search state
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerOptions, setCustomerOptions] = React.useState<CustomerOption[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = React.useState(false);
  const searchRequestId = React.useRef(0);

  const handleOpenChange = (open: boolean) => {
    if (rejectedRange && !open) return;
    setIsDialogOpen(open);
    if (open) {
      setDraftCommon(commonDraft(operationalState, rejectedRange));
      setDateError(Boolean(rejectedRange));
      setDraftKind(selectedKind);
      setDraftAssignee(assignee);
      setDraftOverdue(overdue);
      setDraftCustomerId(customerId);
      setDraftSelectedCustomer(initialSelectedCustomer ?? null);
      setCustomerQuery("");
      setCustomerOptions([]);
      setIsSearchingCustomers(false);
    }
  };

  // Debounced remote customer search
  React.useEffect(() => {
    const trimmed = customerQuery.trim();
    if (!searchCustomersAction || trimmed.length < minimumCustomerQueryLength) {
      return;
    }

    const reqId = ++searchRequestId.current;

    const timer = window.setTimeout(async () => {
      setIsSearchingCustomers(true);
      try {
        const results = await searchCustomersAction({ query: trimmed });
        if (reqId === searchRequestId.current) {
          setCustomerOptions(results);
        }
      } catch {
        if (reqId === searchRequestId.current) {
          setCustomerOptions([]);
        }
      } finally {
        if (reqId === searchRequestId.current) {
          setIsSearchingCustomers(false);
        }
      }
    }, customerSearchDebounceMs);

    return () => window.clearTimeout(timer);
  }, [customerQuery, searchCustomersAction]);

  // One chip per applied filter; the count on the Filtros button is the number of chips.
  const activeChips: Array<{ id: NotasFilterChipId; label: string }> = operationalState ? [
    ...(commonTextFields)
      .filter(([key]) => operationalState[key])
      .map(([key, label]) => ({ id: key, label: `${label}: ${operationalState[key]}` })),
    ...(customerId ? [{ id: "customerId" as const, label: `Cliente: ${initialSelectedCustomer?.commercialName || initialSelectedCustomer?.name || customerId}` }] : []),
    ...(operationalState.dateFrom ? [{ id: "dateFrom" as const, label: `Finalización/emisión desde: ${dateValue(operationalState.dateFrom)}` }] : []),
    ...(operationalState.dateTo ? [{ id: "dateTo" as const, label: `Finalización/emisión hasta: ${dateValue(operationalState.dateTo)}` }] : []),
    ...(payment !== "all" ? [{ id: "payment" as const, label: `Cobro: ${{ pending: "Pendientes", partial: "Parciales", paid: "Pagadas" }[payment]}` }] : []),
    ...(selectedKind !== "all" ? [{ id: "kind" as const, label: `Tipo: ${selectedKind}` }] : []),
    ...(assignee !== "all" ? [{ id: "assignee" as const, label: `Responsable: ${assignee === "workshop" ? "Taller" : masters.find((m) => m.id === assignee)?.displayName ?? assignee}` }] : []),
    ...(overdue !== "all" ? [{ id: "overdue" as const, label: `Morosidad: ${overdue === "overdue" ? "Vencidas" : "Vigentes"}` }] : []),
    ...(operationalState.showArchived ? [{ id: "showArchived" as const, label: "Mostrar archivadas" }] : []),
    ...(operationalState.showCancelled ? [{ id: "showCancelled" as const, label: "Mostrar canceladas" }] : []),
  ] : [];
  const activeFilterCount = operationalState ? activeChips.length :
    (assignee !== "all" ? 1 : 0) +
    (customerId ? 1 : 0) +
    (overdue !== "all" ? 1 : 0);
  const today = new Date();

  const navigationHref = (next: Parameters<typeof notasHref>[0]) => operationalState
    ? notasHref({ ...operationalState, ...next, page: 1 }, { operationalFilters: true })
    : notasHref(next);

  const handleApply = (): boolean => {
    if (operationalState) {
      try {
        const current = navigationHref({ mode, payment, kind: draftKind, anchor, assignee: draftAssignee, customerId: draftCustomerId, overdue: draftOverdue });
        const next = parseNotasParams({
          ...Object.fromEntries(new URLSearchParams(current.split("?")[1])),
          ...draftCommon,
          showArchived: String(draftCommon.showArchived), showCancelled: String(draftCommon.showCancelled),
        }, undefined, { operationalFilters: true });
        router.push(notasHref({ ...next, page: 1 }, { operationalFilters: true }));
        setDateError(false);
        setIsDialogOpen(false);
        return true;
      } catch (cause) {
        if (!(cause instanceof RangeError)) throw cause;
        setDateError(true);
        return false;
      }
    }
    setIsDialogOpen(false);
    router.push(
      navigationHref({
        mode,
        payment,
        kind: draftKind,
        anchor,
        assignee: draftAssignee,
        customerId: draftCustomerId,
        overdue: draftOverdue,
      }),
    );
    return true;
  };

  const handleClear = () => {
    setDraftCommon(commonDraft());
    setDateError(false);
    setDraftKind("all");
    setDraftAssignee("all");
    setDraftOverdue("all");
    setDraftCustomerId(undefined);
    setDraftSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerOptions([]);
    setIsDialogOpen(false);
    if (operationalState) {
      router.push(notasHref({ mode, anchor, payment: "all", kind: "all", assignee: "all", overdue: "all" }, { operationalFilters: true }));
      return;
    }
    router.push(
      navigationHref({
        mode,
        payment,
        kind: selectedKind,
        anchor,
        assignee: "all",
        customerId: undefined,
        overdue: "all",
      }),
    );
  };

  // Each chip resets only its own field; the rest of the URL contract stays as it is.
  const clearedByChip: Record<NotasFilterChipId, Partial<NonNullable<typeof operationalState>>> = {
    number: { number: "" },
    concept: { concept: "" },
    plate: { plate: "" },
    economicNumber: { economicNumber: "" },
    customerId: { customerId: undefined },
    dateFrom: { dateFrom: undefined },
    dateTo: { dateTo: undefined },
    payment: { payment: "all" },
    kind: { kind: "all" },
    assignee: { assignee: "all" },
    overdue: { overdue: "all" },
    showArchived: { showArchived: false },
    showCancelled: { showCancelled: false },
  };

  const removeChip = (id: string) => {
    if (!operationalState || rejectedRange) return;
    router.push(notasHref({ ...operationalState, ...clearedByChip[id as NotasFilterChipId], page: 1 }, { operationalFilters: true }));
  };

  const applySearch = (folio: string) => {
    if (!operationalState || rejectedRange) return;
    router.push(notasHref({ ...operationalState, number: folio || undefined, page: 1 }, { operationalFilters: true }));
  };

  const clearCustomerFilter = () => {
    setDraftCustomerId(undefined);
    setDraftSelectedCustomer(null);
    setCustomerQuery("");
  };

  const paymentOptions = (operationalState ? ["all", "pending", "partial", "paid"] as const : ["all", "pending", "paid"] as const).map((item) => ({
    value: item,
    label: ({ all: "Todas", pending: "Pendientes", partial: "Parciales", paid: "Pagadas" } as const)[item],
  }));

  return (
    <section aria-label="Filtros de notas" className="grid min-w-0 gap-3">
      <PeriodNavigator
        view={mode}
        anchor={anchor}
        today={today}
        views={["week", "month"]}
        weekDays={6}
        onViewChange={(next) => {
          if (rejectedRange) return;
          router.push(navigationHref({ mode: next as NotasMode, payment, assignee, customerId, overdue, kind: selectedKind, anchor }));
        }}
        onAnchorChange={(next) => {
          if (rejectedRange) return;
          router.push(navigationHref({ mode, payment, assignee, customerId, overdue, kind: selectedKind, anchor: next }));
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Estado de pago"
          options={paymentOptions}
          value={payment}
          onValueChange={(item) => {
            if (rejectedRange) return;
            router.push(navigationHref({ mode, anchor, payment: item as NotasPayment, assignee, customerId, overdue, kind: selectedKind }));
          }}
        />
        {customerId ? (
          <Button asChild variant="outline" size="sm">
            <Link aria-disabled={Boolean(rejectedRange)} href={rejectedRange ? "#notas-date-error" : `/admin/customers/${customerId}/estado-de-cuenta`}>
              <Icon name="quotes" className="mr-1 h-4 w-4" aria-hidden="true" />
              Estado de cuenta
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <NotasSearchField
          key={operationalState?.number ?? ""}
          initialValue={operationalState?.number ?? ""}
          disabled={Boolean(rejectedRange)}
          onSearch={applySearch}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Abrir filtros de cartera"
          className="shrink-0 gap-1.5 px-3"
          onClick={() => handleOpenChange(true)}
        >
          <Icon name="filter" className="h-4 w-4" aria-hidden="true" />
          <span>{activeFilterCount > 0 ? `Filtros (${activeFilterCount})` : "Filtros"}</span>
        </Button>
      </div>

      {activeChips.length > 0 ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <ActiveFilterChips filters={activeChips} onRemove={removeChip} />
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={handleClear}>
            Limpiar
          </Button>
        </div>
      ) : null}

      <FilterSheet
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        title="Filtros de cartera"
        onClear={handleClear}
        onApply={handleApply}
      >
        {operationalState && dateError ? <p id="notas-date-error" role="alert" className="text-sm text-[var(--color-status-danger)]">La fecha de finalización/emisión desde no puede ser posterior a hasta. Corrige el rango o limpia los filtros.</p> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="notas-anchor" className="text-xs text-[var(--color-text-muted)]">
            {mode === "week" ? "Ir a la semana" : "Ir al mes"}
          </Label>
          <Input
            id="notas-anchor"
            disabled={Boolean(rejectedRange)}
            className={`${operationalState ? "min-h-11 " : ""}h-[var(--control-md)] text-sm`}
            aria-label={mode === "week" ? "Semana" : "Mes y año"}
            type={mode === "week" ? "date" : "month"}
            name="anchor"
            defaultValue={mode === "week" ? anchor : anchor.slice(0, 7)}
            onChange={(event) => {
              if (event.currentTarget.value) {
                router.push(
                  navigationHref({
                    mode,
                    payment,
                    kind: selectedKind,
                    assignee,
                    customerId,
                    overdue,
                    anchor: event.currentTarget.value,
                  }),
                );
              }
            }}
          />
        </div>

        <label className="flex flex-col gap-1.5 text-xs text-[var(--color-text-muted)]">
          Tipo de nota
          <select
            aria-label="Tipo de nota"
            disabled={Boolean(rejectedRange)}
            value={draftKind}
            onChange={(event) => setDraftKind(event.currentTarget.value as NotasKind)}
            className="h-[var(--control-md)] w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm font-normal text-[var(--color-text-main)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
          >
            <option value="all">Todas</option>
            <option value="WORK">WORK</option>
            <option value="SALE">SALE</option>
          </select>
        </label>

        {operationalState ? <>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            {commonTextFields.map(([key, label]) => <div key={key} className="grid min-w-0 gap-1.5">
              <Label htmlFor={`notas-${key}`}>{label}</Label>
              <Input id={`notas-${key}`} type="search" value={draftCommon[key]} onChange={(event) => setDraftCommon({ ...draftCommon, [key]: event.currentTarget.value })} />
            </div>)}
          </div>
          <fieldset className="grid min-w-0 gap-3">
            <legend className="mb-2 flex items-center gap-1.5 text-sm font-medium text-[var(--color-text-main)]">
              Finalización o emisión
              <InfoTip label="Qué incluye: Finalización o emisión">
                Fecha operativa: finalización WORK o emisión SALE (ambos días incluidos).
              </InfoTip>
            </legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {commonDateFields.map(([key, label]) => <div key={key} className="grid min-w-0 gap-1.5">
                <Label htmlFor={`notas-${key}`}>{label}</Label>
                <Input id={`notas-${key}`} type="date" value={draftCommon[key]} aria-invalid={dateError} aria-describedby={dateError ? "notas-date-error" : undefined}
                  onChange={(event) => setDraftCommon({ ...draftCommon, [key]: event.currentTarget.value })} />
              </div>)}
            </div>
          </fieldset>
          <div className="grid gap-2 sm:grid-cols-2">
            {([["showArchived", "Mostrar archivadas"], ["showCancelled", "Mostrar canceladas"]] as const).map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={draftCommon[key]} className="h-4 w-4" onChange={(event) => setDraftCommon({ ...draftCommon, [key]: event.currentTarget.checked })} />
              {label}
            </label>)}
          </div>
        </> : null}

        {/* Selector remoto de cliente */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="customer-remote-search" className="text-xs text-[var(--color-text-muted)]">
            Cliente
          </Label>
          {draftSelectedCustomer ? (
            <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--color-text-main)]">
                  {draftSelectedCustomer.commercialName || draftSelectedCustomer.name}
                </p>
                {draftSelectedCustomer.commercialName ? (
                  <p className="truncate text-xs text-[var(--color-text-muted)]">
                    {draftSelectedCustomer.name}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={clearCustomerFilter}
                aria-label="Quitar filtro de cliente"
                className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                <Icon name="close" className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative">
                <Icon name="search" className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                <Input
                  id="customer-remote-search"
                  type="search"
                  value={customerQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerQuery(val);
                    if (val.trim().length < minimumCustomerQueryLength) {
                      setCustomerOptions([]);
                      setIsSearchingCustomers(false);
                    }
                  }}
                  placeholder="Buscar por cliente, chofer o teléfono..."
                  className={`${operationalState ? "min-h-11 " : ""}h-[var(--control-md)] pl-9 pr-8 text-sm`}
                  aria-label="Buscar cliente"
                />
                {isSearchingCustomers ? (
                  <div className="absolute right-3 top-3">
                    <Spinner className="h-4 w-4 text-[var(--color-text-muted)]" />
                  </div>
                ) : customerQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerQuery("");
                      setCustomerOptions([]);
                      setIsSearchingCustomers(false);
                    }}
                    aria-label="Limpiar búsqueda de cliente"
                    className="absolute right-2.5 top-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    <Icon name="close" className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {customerOptions.length > 0 ? (
                <ul
                  role="listbox"
                  aria-label="Resultados de clientes"
                  className="mt-1.5 max-h-48 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] py-1 shadow-md"
                >
                  {customerOptions.map((opt) => (
                    <li
                      key={opt.id}
                      role="option"
                      aria-selected={draftCustomerId === opt.id}
                      onClick={() => {
                        setDraftCustomerId(opt.id);
                        setDraftSelectedCustomer(opt);
                        setCustomerQuery("");
                        setCustomerOptions([]);
                      }}
                      className="cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-[var(--color-bg-soft)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--color-text-main)]">
                            {opt.commercialName || opt.name}
                          </p>
                          {opt.commercialName && opt.name !== opt.commercialName ? (
                            <p className="truncate text-xs text-[var(--color-text-muted)]">{opt.name}</p>
                          ) : null}
                        </div>
                        {opt.phone ? (
                          <span className="ml-2 shrink-0 font-mono text-xs text-[var(--color-text-muted)]">
                            {opt.phone}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : customerQuery.trim().length >= minimumCustomerQueryLength && !isSearchingCustomers ? (
                <p className="mt-1.5 px-2 text-xs text-[var(--color-text-muted)]">
                  No se encontraron clientes con &quot;{customerQuery}&quot;.
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Selector de responsable */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dialog-notas-assignee" className="text-xs text-[var(--color-text-muted)]">
            Responsable
          </Label>
          <select
            id="dialog-notas-assignee"
            aria-label="Responsable"
            value={draftAssignee}
            disabled={Boolean(operationalState && draftKind !== "WORK")}
            aria-describedby={operationalState && draftKind !== "WORK" ? "notas-responsible-help" : undefined}
            onChange={(e) => setDraftAssignee(e.currentTarget.value as NotasAssignee)}
            className="h-[var(--control-md)] w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
          >
            <option value="all">Todos los responsables</option>
            <option value="workshop">Taller</option>
            {operationalState && draftAssignee !== "all" && draftAssignee !== "workshop" && !masters.some((m) => m.id === draftAssignee)
              ? <option value={draftAssignee}>{draftAssignee}</option> : null}
            {masters.map((master) => (
              <option key={master.id} value={master.id}>
                {master.displayName}
              </option>
            ))}
          </select>
          {operationalState && draftKind !== "WORK" ? <p id="notas-responsible-help" className="text-sm text-[var(--color-text-muted)]">Solo aplica a notas WORK; todas y SALE conservan las ventas.</p> : null}
        </div>

        {/* Selector de morosidad */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dialog-notas-overdue" className="text-xs text-[var(--color-text-muted)]">
            Morosidad
          </Label>
          <select
            id="dialog-notas-overdue"
            aria-label="Morosidad"
            value={draftOverdue}
            onChange={(e) => setDraftOverdue(e.currentTarget.value as NotasOverdue)}
            className="h-[var(--control-md)] w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
          >
            <option value="all">Todas las notas</option>
            <option value="overdue">Sólo vencidas</option>
            <option value="current">Al corriente / vigentes</option>
          </select>
        </div>
      </FilterSheet>
    </section>
  );
}
