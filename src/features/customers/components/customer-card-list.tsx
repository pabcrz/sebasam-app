"use client";

import * as React from "react";
import { Badge, BadgeVariant, Button, Checkbox, ConfirmDialog, ListItemCard } from "@/components/ui";
import { CustomerDetailDialog, type CustomerDetailLoader } from "./customer-detail-dialog";
import { CustomerActionsMenu } from "./customer-actions-menu";
import { CustomerEditDialog, type CustomerEditData } from "./customer-edit-dialog";
import { getCustomerDeletionBlocker } from "../domain";
import { deleteCustomerAction, deleteCustomersBatchAction, updateCustomerAction } from "../actions";

export type CustomerCardListItem = {
  id: string;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  notes?: string | null;
  status: string;
  _count?: {
    quotes?: number;
    payments?: number;
    paymentRequests?: number;
    ledgerEntries?: number;
  } | null;
};

export type CustomerCardListProps = {
  customers: CustomerCardListItem[];
  getCustomerDetail: CustomerDetailLoader;
  onDeleteCustomer?: (customerId: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteBatch?: (customerIds: string[]) => Promise<{ success: boolean; deletedCount: number; error?: string }>;
  onUpdateCustomer?: (data: CustomerEditData) => Promise<{ success: boolean; error?: string }>;
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
};

const statusBadgeVariant: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  INACTIVE: "default",
};

export function CustomerCardList({
  customers,
  getCustomerDetail,
  onDeleteCustomer,
  onDeleteBatch,
  onUpdateCustomer,
}: CustomerCardListProps) {
  const [isSelectionMode, setIsSelectionMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [editingCustomer, setEditingCustomer] = React.useState<CustomerCardListItem | null>(null);
  const [customerToDelete, setCustomerToDelete] = React.useState<CustomerCardListItem | null>(null);
  const [batchDeleteOpen, setBatchDeleteOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [activeDetailId, setActiveDetailId] = React.useState<string | null>(null);

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

  const handleSingleDelete = () => {
    if (!customerToDelete) return;
    startTransition(async () => {
      const deleteFn = onDeleteCustomer ?? deleteCustomerAction;
      await deleteFn(customerToDelete.id);
      setCustomerToDelete(null);
    });
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
    <div className="mt-4 grid gap-3">
      {customers.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] p-2">
          {!isSelectionMode ? (
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {customers.length} cliente{customers.length === 1 ? "" : "s"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsSelectionMode(true)}
              >
                Seleccionar
              </Button>
            </div>
          ) : (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={exitSelectionMode}
                  disabled={isPending}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-3">
        {customers.map((customer) => {
          const blocker = getCustomerDeletionBlocker(customer);
          const isSelected = selectedIds.has(customer.id);

          return (
            <ListItemCard
              key={customer.id}
              bodyClassName="relative"
              className={isSelected ? "border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]" : ""}
              body={
                <div
                  className="flex items-start gap-3"
                  onClick={
                    isSelectionMode
                      ? () => toggleSelectCustomer(customer.id, blocker.canDelete)
                      : undefined
                  }
                >
                  {isSelectionMode ? (
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        disabled={!blocker.canDelete}
                        onCheckedChange={() =>
                          toggleSelectCustomer(customer.id, blocker.canDelete)
                        }
                        aria-label={`Seleccionar ${customer.name}`}
                      />
                    </div>
                  ) : (
                    <CustomerDetailDialog
                      customer={customer}
                      getCustomerDetail={getCustomerDetail}
                      open={activeDetailId === customer.id}
                      onOpenChange={(open) => setActiveDetailId(open ? customer.id : null)}
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text-main)]">
                      {customer.commercialName ? (
                        <>
                          <span>{customer.commercialName}</span>
                          <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">({customer.name})</span>
                        </>
                      ) : (
                        customer.name
                      )}
                    </p>
                    <div className="mt-0.5 grid gap-0.5 text-sm text-[var(--color-text-muted)]">
                      {customer.email ? <p className="truncate">{customer.email}</p> : null}
                      {customer.phone ? <p className="truncate">{customer.phone}</p> : null}
                      {!customer.email && !customer.phone ? <p>Sin contacto</p> : null}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadgeVariant[customer.status] ?? "default"}>
                        {statusLabels[customer.status] ?? customer.status}
                      </Badge>
                      {isSelectionMode && !blocker.canDelete ? (
                        <span className="text-xs text-[var(--color-status-danger-fg)]">
                          No eliminable: tiene historial
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              }
              actions={
                !isSelectionMode ? (
                  <CustomerActionsMenu
                    customer={customer}
                    blocker={blocker}
                    onEdit={() => setEditingCustomer(customer)}
                    onViewStatement={() => setActiveDetailId(customer.id)}
                    onDelete={() => setCustomerToDelete(customer)}
                  />
                ) : null
              }
            />
          );
        })}
      </div>

      {customers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          No se encontraron clientes.
        </p>
      ) : null}

      {/* Quick Edit Dialog */}
      <CustomerEditDialog
        open={editingCustomer !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCustomer(null);
        }}
        customer={editingCustomer}
        onSave={onUpdateCustomer ?? updateCustomerAction}
      />

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        open={customerToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setCustomerToDelete(null);
        }}
        title="Eliminar cliente"
        description={`¿Confirmas eliminar permanentemente a "${customerToDelete?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar cliente"
        cancelLabel="Cancelar"
        variant="danger"
        loading={isPending}
        onConfirm={handleSingleDelete}
      />

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
