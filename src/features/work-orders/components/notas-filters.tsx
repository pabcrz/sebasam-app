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
  SectionLabel,
  Spinner,
  StatusFilterNav,
} from "@/components/ui";
import {
  notasHref,
  type NotasAssignee,
  type NotasMode,
  type NotasKind,
  type NotasOverdue,
  type NotasPayment,
} from "../notas-period";

type Master = { id: string; displayName: string };

type CustomerOption = {
  id: string;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  phone?: string | null;
};

export interface NotasFiltersProps {
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

export function NotasFilters({
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
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Modal form draft state
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
    setIsDialogOpen(open);
    if (open) {
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

  const activeFilterCount =
    (assignee !== "all" ? 1 : 0) +
    (customerId ? 1 : 0) +
    (overdue !== "all" ? 1 : 0);

  const handleApply = () => {
    setIsDialogOpen(false);
    router.push(
      notasHref({
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
    setDraftAssignee("all");
    setDraftOverdue("all");
    setDraftCustomerId(undefined);
    setDraftSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerOptions([]);
    setIsDialogOpen(false);
    router.push(
      notasHref({
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

  const assigneeName =
    assignee === "all"
      ? null
      : assignee === "workshop"
        ? "Taller"
        : masters.find((m) => m.id === assignee)?.displayName ?? null;

  return (
    <Card aria-label="Filtros de notas" className="grid gap-4 p-4 shadow-sm sm:p-5">
      {/* 1. Período y selector de vista */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <SectionLabel as="p">Periodo seleccionado</SectionLabel>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold capitalize text-[var(--color-text-main)] sm:text-lg">
              {rangeLabel}
            </p>
            {isCurrentWeek ? <Badge variant="info">Semana en curso</Badge> : null}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
          <Link
            href={notasHref({
              mode: mode === "week" ? "month" : "week",
              payment,
              assignee,
              customerId,
              overdue,
              anchor,
            })}
          >
            <CalendarDays className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {mode === "week" ? "Vista mensual" : "Vista semanal"}
          </Link>
        </Button>
      </div>

      {/* 2. Estado de pago visible arriba + Botón de Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Tipo de nota
          <select
            aria-label="Tipo de nota"
            value={selectedKind}
            onChange={(event) => router.push(notasHref({ mode, payment, assignee, customerId, overdue, kind: event.currentTarget.value as NotasKind, anchor }))}
            className="h-9 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm font-normal normal-case text-[var(--color-text-main)]"
          >
            <option value="all">Todas</option>
            <option value="WORK">WORK</option>
            <option value="SALE">SALE</option>
          </select>
        </label>
        <div className="grid min-w-0 flex-1 gap-2">
          <SectionLabel as="p">Estado de pago</SectionLabel>
          <StatusFilterNav
            label="Estado de pago"
            items={(["all", "pending", "paid"] as const).map((item) => ({
              href: notasHref({ mode, anchor, payment: item, assignee, customerId, overdue, kind: selectedKind }),
              label: ({ all: "Todas", pending: "Pendientes", paid: "Pagadas" } as const)[item],
              current: payment === item,
            }))}
          />
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Abrir filtros de cartera"
                className="relative inline-flex h-9 items-center gap-1.5 px-3"
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
              <DialogMobileContent className="sm:max-w-lg">
                <DialogMobileHeader>
                  <DialogTitle>Filtros de cartera</DialogTitle>
                  <DialogDescription className="sr-only">
                    Filtrar notas completadas por cliente, maestro responsable y condición de morosidad.
                  </DialogDescription>
                  <DialogMobileClose />
                </DialogMobileHeader>
                <DialogMobileBody className="grid gap-5">
                  {/* Selector remoto de cliente */}
                  <div className="grid gap-2">
                    <Label htmlFor="customer-remote-search" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Cliente
                    </Label>
                    {draftSelectedCustomer ? (
                      <div className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--color-text-main)] truncate">
                            {draftSelectedCustomer.commercialName || draftSelectedCustomer.name}
                          </p>
                          {draftSelectedCustomer.commercialName ? (
                            <p className="text-xs text-[var(--color-text-muted)] truncate">
                              {draftSelectedCustomer.name}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={clearCustomerFilter}
                          aria-label="Quitar filtro de cliente"
                          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-main)] transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-text-muted)]" />
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
                            className="pl-9 pr-8 text-sm"
                            aria-label="Buscar cliente"
                          />
                          {isSearchingCustomers ? (
                            <div className="absolute right-3 top-2.5">
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
                              className="absolute right-2.5 top-2.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                            >
                              <X className="h-4 w-4" />
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
                                    <p className="font-medium text-[var(--color-text-main)] truncate">
                                      {opt.commercialName || opt.name}
                                    </p>
                                    {opt.commercialName && opt.name !== opt.commercialName ? (
                                      <p className="text-xs text-[var(--color-text-muted)] truncate">{opt.name}</p>
                                    ) : null}
                                  </div>
                                  {opt.phone ? (
                                    <span className="text-xs text-[var(--color-text-muted)] shrink-0 ml-2 font-mono">
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
                  <div className="grid gap-2">
                    <Label htmlFor="dialog-notas-assignee" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Responsable
                    </Label>
                    <select
                      id="dialog-notas-assignee"
                      aria-label="Responsable"
                      value={draftAssignee}
                      onChange={(e) => setDraftAssignee(e.currentTarget.value as NotasAssignee)}
                      className="h-9 w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
                    >
                      <option value="all">Todos los responsables</option>
                      <option value="workshop">Taller</option>
                      {masters.map((master) => (
                        <option key={master.id} value={master.id}>
                          {master.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector de morosidad */}
                  <div className="grid gap-2">
                    <Label htmlFor="dialog-notas-overdue" className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                      Morosidad
                    </Label>
                    <select
                      id="dialog-notas-overdue"
                      aria-label="Morosidad"
                      value={draftOverdue}
                      onChange={(e) => setDraftOverdue(e.currentTarget.value as NotasOverdue)}
                      className="h-9 w-full cursor-pointer rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text-main)] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--color-focus-ring)]"
                    >
                      <option value="all">Todas las notas</option>
                      <option value="overdue">Sólo vencidas</option>
                      <option value="current">Al corriente / vigentes</option>
                    </select>
                  </div>
                </DialogMobileBody>
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

          {activeFilterCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              Limpiar
            </Button>
          ) : null}
        </div>
      </div>

      {/* Chips de filtros activos si existen */}
      {activeFilterCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--color-text-muted)]">Filtros aplicados:</span>
            {draftSelectedCustomer ? (
              <Badge variant="default" className="flex items-center gap-1 text-xs">
                <span>Cliente: {draftSelectedCustomer.commercialName || draftSelectedCustomer.name}</span>
              </Badge>
            ) : null}
            {assigneeName ? (
              <Badge variant="default" className="flex items-center gap-1 text-xs">
                <span>Responsable: {assigneeName}</span>
              </Badge>
            ) : null}
            {overdue === "overdue" ? (
              <Badge variant="danger" className="text-xs">
                Sólo vencidas
              </Badge>
            ) : overdue === "current" ? (
              <Badge variant="info" className="text-xs">
                Al corriente
              </Badge>
            ) : null}
          </div>
          {customerId ? (
            <Button asChild variant="outline" size="sm" className="h-7 text-xs font-medium">
              <Link href={`/admin/customers/${customerId}/estado-de-cuenta`}>
                <FileText className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                Estado de cuenta
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* 3. Navegación por fechas/semana */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-border-light)] pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="sm:w-auto">
            <Link
              aria-label="Periodo anterior"
              href={notasHref({ mode, payment, assignee, customerId, overdue, kind: selectedKind, anchor: shifted(-1) })}
            >
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              Anterior
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="sm:w-auto">
            <Link
              aria-label="Periodo siguiente"
              href={notasHref({ mode, payment, assignee, customerId, overdue, kind: selectedKind, anchor: shifted(1) })}
            >
              Siguiente
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <Label
          htmlFor="notas-anchor"
          className="grid min-w-0 flex-1 gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] sm:max-w-xs"
        >
          {mode === "week" ? "Ir a la semana" : "Ir al mes"}
          <Input
            id="notas-anchor"
            className="h-9 text-sm"
            aria-label={mode === "week" ? "Semana" : "Mes y año"}
            type={mode === "week" ? "date" : "month"}
            name="anchor"
            defaultValue={mode === "week" ? anchor : anchor.slice(0, 7)}
            onChange={(event) => {
              if (event.currentTarget.value) {
                router.push(
                  notasHref({
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
        </Label>
      </div>
    </Card>
  );
}
