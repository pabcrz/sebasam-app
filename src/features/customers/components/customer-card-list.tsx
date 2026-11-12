"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, Checkbox, ConfirmDialog, Icon, ListRow, SegmentedControl } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { cn } from "@/lib/utils";
import { getCustomerDeletionBlocker } from "../domain";
import {
  filterCustomerRows,
  findSearchMatch,
  summarizeUnits,
  unitIdentity,
  type CustomerListFilter,
  type CustomerListRow,
} from "../customer-list";
import { deleteCustomersBatchAction } from "../actions";

export type CustomerCardListItem = CustomerListRow & {
  email?: string | null;
  phone: string | null;
  legalName?: string | null;
  _count?: {
    quotes?: number;
    payments?: number;
    paymentRequests?: number;
    ledgerEntries?: number;
  } | null;
};

export type CustomerCardListProps = {
  customers: CustomerCardListItem[];
  /** The search text from the URL; names the unit or driver that matched. */
  query?: string;
  onDeleteBatch?: (customerIds: string[]) => Promise<{ success: boolean; deletedCount: number; error?: string }>;
};

const filterOptions: Array<{ value: CustomerListFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "withBalance", label: "Con saldo" },
  { value: "inactive", label: "Inactivos" },
];

const selectableRowClassName =
  "flex min-h-[var(--tap-min-height)] w-full min-w-0 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 text-left shadow-[var(--shadow-card)]";

function unitCountLabel(count: number) {
  return `${count} unidad${count === 1 ? "" : "es"}`;
}

export function CustomerCardList({ customers, query = "", onDeleteBatch }: CustomerCardListProps) {
  const [filter, setFilter] = React.useState<CustomerListFilter>("all");
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const visibleCustomers = filterCustomerRows(customers, filter);

  const eligibleCustomers = React.useMemo(
    () => customers.filter((c) => getCustomerDeletionBlocker(c).canDelete),
    [customers],
  );

  const allEligibleSelected =
    eligibleCustomers.length > 0 && eligibleCustomers.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allEligibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(eligibleCustomers.map((c) => c.id)));
    }
  };

  const toggleSelectCustomer = (id: string, canDelete: boolean) => {
    if (!canDelete) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    startTransition(async () => {
      const deleteFn = onDeleteBatch ?? deleteCustomersBatchAction;
      await deleteFn(Array.from(selectedIds));
      setBatchDeleteOpen(false);
      exitSelectionMode();
    });
  };

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label="Filtrar clientes"
          options={filterOptions}
          value={filter}
          onValueChange={(value) => setFilter(value as CustomerListFilter)}
        />
        {customers.length > 0 && !isSelectionMode ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsSelectionMode(true)}>
            Seleccionar
          </Button>
        ) : null}
      </div>

      {isSelectionMode ? (
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={toggleSelectAll}>
              {allEligibleSelected ? "Deseleccionar todos" : "Seleccionar todos"}
            </Button>
            <span className="text-xs font-semibold text-[var(--color-text-main)]">
              {selectedIds.size} seleccionado{selectedIds.size === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={selectedIds.size === 0 || isPending}
              loading={isPending}
              onClick={() => setBatchDeleteOpen(true)}
            >
              Eliminar seleccionados
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={exitSelectionMode} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}

      <ul className="grid min-w-0 gap-3">
        {visibleCustomers.map((customer) => {
          const blocker = getCustomerDeletionBlocker(customer);
          const isSelected = selectedIds.has(customer.id);
          const displayName = customer.commercialName || customer.name;
          const { shown, hiddenCount } = summarizeUnits(customer.vehicles);
          const match = findSearchMatch(customer, query);
          const hasBalance = customer.pendingBalanceCents > 0;

          const content = (
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-semibold text-[var(--color-text-main)]">{displayName}</span>
                {customer.status === "INACTIVE" ? <Badge variant="default">Inactivo</Badge> : null}
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-[var(--color-text-muted)]">
                {customer.phone ? (
                  <span className="truncate">{customer.phone}</span>
                ) : (
                  <span className="truncate">Sin teléfono</span>
                )}
                {customer.vehicles.length > 0 ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="shrink-0">{unitCountLabel(customer.vehicles.length)}</span>
                  </>
                ) : null}
              </span>
              {match ? (
                <span className="truncate text-xs font-medium text-[var(--color-tonal-fg)]">{`Coincide: ${match}`}</span>
              ) : null}
              {shown.length > 0 ? (
                <span
                  data-testid="customer-unit-list"
                  className="mt-1 grid min-w-0 gap-1 border-t border-dashed border-[var(--color-border-light)] pt-1.5"
                >
                  {shown.map((unit) => (
                    <span key={unit.id} className="flex min-w-0 items-center gap-1.5 text-sm text-[var(--color-text-main)]">
                      <Icon name="unit" className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                      <span className="truncate">{unitIdentity(unit) ?? "Unidad registrada"}</span>
                      {unit.inWorkshop ? <Badge variant="info">En taller</Badge> : null}
                    </span>
                  ))}
                </span>
              ) : null}
            </span>
          );

          const decision = hasBalance ? (
            <span className="font-semibold tabular-nums text-[var(--color-text-main)]">
              {formatCents(customer.pendingBalanceCents)}
            </span>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">Al corriente</span>
          );

          return (
            <li key={customer.id} className="grid min-w-0 gap-1">
              {isSelectionMode ? (
                <div
                  className={cn(selectableRowClassName, isSelected && "ring-1 ring-[var(--color-primary)]")}
                  onClick={() => toggleSelectCustomer(customer.id, blocker.canDelete)}
                >
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      disabled={!blocker.canDelete}
                      onCheckedChange={() => toggleSelectCustomer(customer.id, blocker.canDelete)}
                      aria-label={`Seleccionar ${customer.name}`}
                    />
                  </div>
                  {content}
                  {!blocker.canDelete ? (
                    <span className="shrink-0 text-xs text-[var(--color-status-danger-fg)]">No eliminable: tiene historial</span>
                  ) : null}
                </div>
              ) : (
                <>
                  <ListRow
                    openLabel={`Ver ficha de ${displayName}`}
                    href={`/admin/customers/${customer.id}`}
                    decision={decision}
                  >
                    {content}
                  </ListRow>
                  {hiddenCount > 0 ? (
                    <Link
                      href={`/admin/customers/${customer.id}?tab=vehiculos`}
                      className="w-fit px-3 text-sm font-medium text-[var(--color-link)] hover:underline"
                    >
                      {`+${hiddenCount} ${hiddenCount === 1 ? "unidad" : "unidades"} más`}
                    </Link>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {visibleCustomers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          No se encontraron clientes.
        </p>
      ) : null}

      {/* Batch Delete Confirmation */}
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title="Eliminar clientes"
        description={`¿Confirmas eliminar permanentemente ${selectedIds.size} cliente(s) seleccionado(s)? Esta acción no se puede deshacer.`}
        confirmLabel="Confirmar eliminación"
        cancelLabel="Cancelar"
        variant="danger"
        loading={isPending}
        onConfirm={handleBatchDelete}
      />
    </div>
  );
}
