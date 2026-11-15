"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Filter, Search, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
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

function getMexicoCityToday() {
  const dateParts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value]),
  );

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

const commonTextFields = [["number", "Folio"], ["concept", "Concepto"], ["plate", "Placas"], ["economicNumber", "ECO"]] as const;
const commonDateFields = [["dateFrom", "Finalización/emisión desde"], ["dateTo", "Finalización/emisión hasta"]] as const;
function commonDraft(state?: NotasFiltersProps["operationalState"], rejected?: NotasFiltersProps["rejectedRange"]) {
  return {
    number: state?.number ?? "", concept: state?.concept ?? "", plate: state?.plate ?? "", economicNumber: state?.economicNumber ?? "",
    dateFrom: rejected?.from ?? (state?.dateFrom ? dateValue(state.dateFrom) : ""), dateTo: rejected?.to ?? (state?.dateTo ? dateValue(state.dateTo) : ""),
    showArchived: state?.showArchived ?? false, showCancelled: state?.showCancelled ?? false,
  };
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
  rangeLabel,
  isCurrentWeek,
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

  const shifted = (amount: number) => {
    const date = new Date(`${anchor}T12:00:00Z`);
    if (mode === "week") date.setUTCDate(date.getUTCDate() + amount * 7);
    else date.setUTCMonth(date.getUTCMonth() + amount);
    return date.toISOString().slice(0, 10);
  };

  const operationalSummary = operationalState ? [
    ...([["number", "Folio"], ["concept", "Concepto"], ["plate", "Placas"], ["economicNumber", "ECO"]] as const)
      .map(([key, label]) => operationalState[key] ? `${label}: ${operationalState[key]}` : ""),
    customerId ? `Cliente: ${initialSelectedCustomer?.commercialName || initialSelectedCustomer?.name || customerId}` : "",
    ...([["dateFrom", "Finalización/emisión desde"], ["dateTo", "Finalización/emisión hasta"]] as const)
      .map(([key, label]) => operationalState[key] ? `${label}: ${dateValue(operationalState[key])}` : ""),
    payment !== "all" ? `Cobro: ${{ pending: "Pendientes", partial: "Parciales", paid: "Pagadas" }[payment]}` : "",
    selectedKind !== "all" ? `Tipo: ${selectedKind}` : "",
    assignee !== "all" ? `Responsable: ${assignee === "workshop" ? "Taller" : masters.find((m) => m.id === assignee)?.displayName ?? assignee}` : "",
    overdue !== "all" ? `Morosidad: ${overdue === "overdue" ? "Vencidas" : "Vigentes"}` : "",
    operationalState.showArchived ? "Mostrar archivadas" : "",
    operationalState.showCancelled ? "Mostrar canceladas" : "",
  ].filter(Boolean) : [];
  const activeFilterCount = operationalState ? operationalSummary.length :
    (assignee !== "all" ? 1 : 0) +
    (customerId ? 1 : 0) +
    (overdue !== "all" ? 1 : 0);
  const today = getMexicoCityToday();
  const isCurrentPeriod = mode === "week" ? isCurrentWeek : anchor.slice(0, 7) === today.slice(0, 7);

  const navigationHref = (next: Parameters<typeof notasHref>[0]) => operationalState
    ? notasHref({ ...operationalState, ...next, page: 1 }, { operationalFilters: true })
    : notasHref(next);

  const safeNavigationHref = (next: Parameters<typeof notasHref>[0]) => rejectedRange ? "#notas-date-error" : navigationHref(next);

  const handleApply = () => {
    if (operationalState) {
      try {
        const current = navigationHref({ mode, payment, kind: selectedKind, anchor, assignee: draftAssignee, customerId: draftCustomerId, overdue: draftOverdue });
        const next = parseNotasParams({
          ...Object.fromEntries(new URLSearchParams(current.split("?")[1])),
          ...draftCommon,
          showArchived: String(draftCommon.showArchived), showCancelled: String(draftCommon.showCancelled),
        }, undefined, { operationalFilters: true });
        router.push(notasHref({ ...next, page: 1 }, { operationalFilters: true }));
        setDateError(false);
        setIsDialogOpen(false);
      } catch (cause) {
        if (!(cause instanceof RangeError)) throw cause;
        setDateError(true);
      }
      return;
    }
    setIsDialogOpen(false);
    router.push(
      navigationHref({
        mode,
        payment,
        kind: selectedKind,
        anchor,
        assignee: draftAssignee,
        customerId: draftCustomerId,
        overdue: draftOverdue,
      }),
    );
  };

  const handleClear = () => {
    setDraftCommon(commonDraft());
    setDateError(false);
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

  const clearCustomerFilter = () => {
    setDraftCustomerId(undefined);
    setDraftSelectedCustomer(null);
    setCustomerQuery("");
  };

  return (
    <Card aria-label="Filtros de notas" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-none md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="icon" className="w-10">
            <Link
              aria-label={mode === "week" ? "Semana anterior" : "Mes anterior"}
              aria-disabled={Boolean(rejectedRange)}
              href={safeNavigationHref({ mode, payment, assignee, customerId, overdue, kind: selectedKind, anchor: shifted(-1) })}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          <p className="min-w-0 text-base font-semibold text-slate-900 sm:text-lg">
            {rangeLabel.replace(/\s*–\s*/u, " – ")}
          </p>
          <Button asChild variant="outline" size="icon" className="w-10">
            <Link
              aria-label={mode === "week" ? "Semana siguiente" : "Mes siguiente"}
              aria-disabled={Boolean(rejectedRange)}
              href={safeNavigationHref({ mode, payment, assignee, customerId, overdue, kind: selectedKind, anchor: shifted(1) })}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </Button>
          {mode === "week" && isCurrentWeek ? <Badge variant="info">Semana en curso</Badge> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant={isCurrentPeriod ? "secondary" : "outline"} size="sm">
            <Link
              aria-disabled={Boolean(rejectedRange)}
              href={safeNavigationHref({ mode, payment, assignee, customerId, overdue, kind: selectedKind, anchor: today })}
            >
              Hoy
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link
              aria-disabled={Boolean(rejectedRange)}
              href={safeNavigationHref({
                mode: mode === "week" ? "month" : "week",
                payment,
                assignee,
                customerId,
                overdue,
                kind: selectedKind,
                anchor,
              })}
            >
              <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {mode === "week" ? "Vista mensual" : "Vista semanal"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-xs uppercase tracking-wide text-slate-500">
          Tipo de nota
          <select
            aria-label="Tipo de nota"
            disabled={Boolean(rejectedRange)}
            value={selectedKind}
            onChange={(event) => router.push(navigationHref({ mode, payment, assignee, customerId, overdue, kind: event.currentTarget.value as NotasKind, anchor }))}
            className={`${operationalState ? "min-h-11 " : ""}h-10 min-w-32 rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal normal-case text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2`}
          >
            <option value="all">Todas</option>
            <option value="WORK">WORK</option>
            <option value="SALE">SALE</option>
          </select>
        </label>

        <fieldset disabled={Boolean(rejectedRange)} className="flex flex-col gap-1.5">
          <legend className="text-xs uppercase tracking-wide text-slate-500">Estado de pago</legend>
          <div className={operationalState ? "grid w-full grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 sm:inline-flex sm:w-auto" : "inline-flex h-10 w-full items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1 py-[3px] md:w-auto"}>
            {(operationalState ? ["all", "pending", "partial", "paid"] as const : ["all", "pending", "paid"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={payment === item}
                onClick={() => router.push(navigationHref({ mode, anchor, payment: item, assignee, customerId, overdue, kind: selectedKind }))}
                className={`${operationalState ? "min-h-11 " : ""}inline-flex h-8 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2 ${
                  payment === item
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-600 hover:bg-white hover:text-slate-900"
                }`}
              >
                {({ all: "Todas", pending: "Pendientes", partial: "Parciales", paid: "Pagadas" } as const)[item]}
              </button>
            ))}
          </div>
        </fieldset>

        {customerId ? (
          <Button asChild variant="outline" size="sm">
            <Link aria-disabled={Boolean(rejectedRange)} href={rejectedRange ? "#notas-date-error" : `/admin/customers/${customerId}/estado-de-cuenta`}>
              <FileText className="mr-1 h-4 w-4" aria-hidden="true" />
              Estado de cuenta
            </Link>
          </Button>
        ) : null}

        <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              aria-label="Abrir filtros de cartera"
              className="relative ml-auto inline-flex items-center gap-1.5 px-3"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
              <span>Filtros</span>
              {activeFilterCount > 0 ? (
                <Badge variant="info" className="ml-1 h-5 min-w-5 px-1.5 text-xs font-semibold">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
          </DialogTrigger>
          <DialogPortal>
            <DialogOverlay />
            <DialogMobileContent className={operationalState ? "sm:max-w-lg [&_select]:min-h-11" : "sm:max-w-lg"}>
              <DialogMobileHeader>
                <DialogTitle>Filtros de cartera</DialogTitle>
                <DialogDescription className="sr-only">
                  Filtrar notas completadas por periodo, cliente, maestro responsable y condición de morosidad.
                </DialogDescription>
                <DialogMobileClose />
              </DialogMobileHeader>
              <DialogMobileBody className="grid gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="notas-anchor" className="text-xs uppercase tracking-wide text-slate-500">
                    {mode === "week" ? "Ir a la semana" : "Ir al mes"}
                  </Label>
                  <Input
                    id="notas-anchor"
                    disabled={Boolean(rejectedRange)}
                    className={`${operationalState ? "min-h-11 " : ""}h-10 text-sm`}
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

                {operationalState ? <>
                  <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                    {commonTextFields.map(([key, label]) => <div key={key} className="grid min-w-0 gap-1.5">
                      <Label htmlFor={`notas-${key}`}>{label}</Label>
                      <Input id={`notas-${key}`} type="search" value={draftCommon[key]} onChange={(event) => setDraftCommon({ ...draftCommon, [key]: event.currentTarget.value })} />
                    </div>)}
                  </div>
                  <fieldset className="grid min-w-0 gap-3">
                    <legend className="mb-2 text-sm text-slate-500">Fecha operativa: finalización WORK o emisión SALE (ambos días incluidos)</legend>
                    {commonDateFields.map(([key, label]) => <div key={key} className="grid min-w-0 gap-1.5">
                      <Label htmlFor={`notas-${key}`}>{label}</Label>
                      <Input id={`notas-${key}`} type="date" value={draftCommon[key]} aria-invalid={dateError} aria-describedby={dateError ? "notas-date-error" : undefined}
                        onChange={(event) => setDraftCommon({ ...draftCommon, [key]: event.currentTarget.value })} />
                    </div>)}
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
                  <Label htmlFor="customer-remote-search" className="text-xs uppercase tracking-wide text-slate-500">
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
                        className="rounded p-1 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
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
                          className={`${operationalState ? "min-h-11 " : ""}h-10 pl-9 pr-8 text-sm`}
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
                            className="absolute right-2.5 top-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
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
                  <Label htmlFor="dialog-notas-assignee" className="text-xs uppercase tracking-wide text-slate-500">
                    Responsable
                  </Label>
                  <select
                    id="dialog-notas-assignee"
                    aria-label="Responsable"
                    value={draftAssignee}
                    disabled={Boolean(operationalState && selectedKind !== "WORK")}
                    aria-describedby={operationalState && selectedKind !== "WORK" ? "notas-responsible-help" : undefined}
                    onChange={(e) => setDraftAssignee(e.currentTarget.value as NotasAssignee)}
                    className="h-10 w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
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
                  {operationalState && selectedKind !== "WORK" ? <p id="notas-responsible-help" className="text-sm text-slate-500">El responsable solo aplica a notas WORK; todas y SALE conservan las ventas.</p> : null}
                </div>

                {/* Selector de morosidad */}
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="dialog-notas-overdue" className="text-xs uppercase tracking-wide text-slate-500">
                    Morosidad
                  </Label>
                  <select
                    id="dialog-notas-overdue"
                    aria-label="Morosidad"
                    value={draftOverdue}
                    onChange={(e) => setDraftOverdue(e.currentTarget.value as NotasOverdue)}
                    className="h-10 w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    <option value="all">Todas las notas</option>
                    <option value="overdue">Sólo vencidas</option>
                    <option value="current">Al corriente / vigentes</option>
                  </select>
                </div>
              </DialogMobileBody>
              {operationalState && dateError ? <p id="notas-date-error" role="alert" className="px-4 py-2 text-sm text-[var(--color-status-danger)]">La fecha de finalización/emisión desde no puede ser posterior a hasta. Corrige el rango o limpia los filtros.</p> : null}
              <DialogFooter className="flex flex-row items-center justify-between border-t border-[var(--color-border-light)] p-4 sm:justify-between">
                <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
                  Limpiar filtros
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleApply}>
                  Aplicar filtros
                </Button>
              </DialogFooter>
            </DialogMobileContent>
          </DialogPortal>
        </Dialog>
      </div>
      {operationalState ? <div className="mt-4 grid gap-2">
        <p className="text-sm text-slate-500">El periodo de notas no representa toda la cartera; las fechas de finalización WORK o emisión SALE son inclusivas, no movimientos de cobro.</p>
        <div aria-label="Filtros activos" className="flex flex-wrap gap-2">
          {operationalSummary.map((item) => <span key={item} className="rounded-full border border-slate-200 px-3 py-1 text-xs">{item}</span>)}
        </div>
      </div> : null}
    </Card>
  );
}
