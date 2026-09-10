"use client";

import * as React from "react";
import Link from "next/link";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import type { CustomerCardListItem } from "./customer-card-list";
import { CustomerContactsManager, type CustomerContactItem } from "./customer-contacts-manager";
import { CustomerEditDialog, type CustomerEditData } from "./customer-edit-dialog";
import { updateCustomerAction } from "../actions";

export type CustomerVehicleItem = {
  id: string;
  economicNumber: string | null;
  plate: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  color: string | null;
  notes: string | null;
};

export type CustomerBalance = {
  pendingBalanceCents: number;
  availableCreditCents: number;
};

type CustomerDetail = {
  customer: CustomerCardListItem & {
    address: string | null;
    notes: string | null;
    contacts?: CustomerContactItem[];
    vehicles?: CustomerVehicleItem[];
  };
  balance: CustomerBalance;
};

export type CustomerDetailLoader = (customerId: string) => Promise<CustomerDetail | null>;

type CustomerDetailDialogProps = {
  customer: CustomerCardListItem;
  getCustomerDetail: CustomerDetailLoader;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdateCustomer?: (data: CustomerEditData) => Promise<{ success: boolean; error?: string }>;
};

export function CustomerDetailDialog({
  customer,
  getCustomerDetail,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onUpdateCustomer,
}: CustomerDetailDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [detail, setDetail] = React.useState<CustomerDetail | null>(null);
  const [state, setState] = React.useState<"idle" | "loading" | "error">("idle");
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const requestId = React.useRef(0);

  const loadDetail = React.useCallback(() => {
    const currentRequestId = ++requestId.current;
    setDetail(null);
    setState("loading");

    void getCustomerDetail(customer.id)
      .then((result) => {
        if (currentRequestId !== requestId.current) return;
        setDetail(result);
        setState(result ? "idle" : "error");
      })
      .catch(() => {
        if (currentRequestId === requestId.current) setState("error");
      });
  }, [customer.id, getCustomerDetail]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(nextOpen);
    }
    controlledOnOpenChange?.(nextOpen);

    if (!nextOpen) {
      requestId.current += 1;
      setDetail(null);
      setState("idle");
    }
  };

  const prevControlledOpenRef = React.useRef(controlledOpen);
  React.useEffect(() => {
    if (isControlled && controlledOpen && !prevControlledOpenRef.current) {
      loadDetail();
    }
    prevControlledOpenRef.current = controlledOpen;
  }, [isControlled, controlledOpen, loadDetail]);

  const customerForEdit: CustomerEditData = {
    id: detail?.customer.id ?? customer.id,
    name: detail?.customer.name ?? customer.name,
    commercialName: detail?.customer.commercialName ?? customer.commercialName,
    legalName: detail?.customer.legalName ?? customer.legalName,
    email: detail?.customer.email ?? customer.email,
    phone: detail?.customer.phone ?? customer.phone,
    address: detail?.customer.address ?? customer.address,
    notes: detail?.customer.notes ?? customer.notes,
    status: detail?.customer.status ?? customer.status,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <button
            type="button"
            className="absolute inset-0 cursor-pointer rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            aria-label={`Ver cuenta de ${customer.name}`}
            onClick={loadDetail}
          />
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Cliente</p>
            <DialogTitle>Cuenta de {customer.name}</DialogTitle>
            <DialogDescription>Consulta sus datos, contactos operativos y estado de cuenta.</DialogDescription>
          </DialogHeader>

          <div aria-busy={state === "loading"}>
            {state === "loading" ? (
              <div className="grid gap-4" role="status">
                <span className="sr-only">Cargando cuenta del cliente...</span>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-56 w-full" />
              </div>
            ) : null}

            {state === "error" ? (
              <div className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] p-4" role="alert">
                <p className="text-sm text-[var(--color-status-danger-fg)]">No se pudo cargar la cuenta del cliente.</p>
                <Button variant="outline" className="mt-3" onClick={loadDetail}>
                  Reintentar
                </Button>
              </div>
            ) : null}

            {detail ? (
              <div className="grid gap-6">
                <dl className="grid gap-4 text-sm sm:grid-cols-2" data-testid="customer-detail-context">
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Nombre (cliente o empresa)</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.name}</dd>
                  </div>
                  {detail.customer.legalName ? (
                    <div>
                      <dt className="text-[var(--color-text-muted)]">Razón social</dt>
                      <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.legalName}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Correo electrónico</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.email ?? "Sin correo electrónico"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Teléfono</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.phone ?? "Sin teléfono"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Dirección</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.address ?? "Sin dirección"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Estado</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-main)]">
                      {detail.customer.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </dd>
                  </div>
                </dl>

                {detail.customer.notes ? (
                  <div className="border-t border-[var(--color-border-light)] pt-4 text-sm">
                    <p className="text-[var(--color-text-muted)]">Notas</p>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--color-text-main)]">{detail.customer.notes}</p>
                  </div>
                ) : null}

                <div className="border-t border-[var(--color-border-light)] pt-4" data-testid="customer-detail-contacts">
                  <CustomerContactsManager
                    customerId={customer.id}
                    contacts={detail.customer.contacts ?? []}
                    onContactChanged={loadDetail}
                  />
                </div>

                {detail.customer.vehicles && detail.customer.vehicles.length > 0 ? (
                  <div className="border-t border-[var(--color-border-light)] pt-4" data-testid="customer-detail-vehicles">
                    <div className="flex items-center justify-between pb-2">
                      <h3 className="text-sm font-semibold text-[var(--color-text-main)]">Vehículos y unidades con ECO</h3>
                      <span className="text-xs text-[var(--color-text-muted)]">
                        {detail.customer.vehicles.length} unidad{detail.customer.vehicles.length === 1 ? "" : "es"}
                      </span>
                    </div>
                    <ul className="divide-y divide-[var(--color-border-light)] rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)]">
                      {detail.customer.vehicles.map((v) => (
                        <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              {v.economicNumber ? (
                                <span className="rounded bg-[var(--color-primary-light)] px-1.5 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                                  {v.economicNumber}
                                </span>
                              ) : null}
                              <span className="font-medium text-[var(--color-text-main)]">
                                {[v.brand, v.model, v.year ? String(v.year) : ""].filter(Boolean).join(" ") || "Unidad registrada"}
                              </span>
                            </div>
                            {v.plate ? (
                              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Placas: {v.plate}</p>
                            ) : null}
                          </div>
                          {v.color ? (
                            <span className="text-xs text-[var(--color-text-muted)]">{v.color}</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <span className="text-xs text-[var(--color-text-muted)]">Saldo pendiente: </span>
                        <span className="font-semibold tabular-nums text-[var(--color-text-main)]">
                          {formatCents(detail.balance.pendingBalanceCents)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--color-text-muted)]">Saldo a favor: </span>
                        <span className="font-semibold tabular-nums text-[var(--color-status-success-fg)]">
                          {formatCents(detail.balance.availableCreditCents)}
                        </span>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="text-xs">
                      <Link href={`/admin/customers/${detail.customer.id}/estado-de-cuenta`}>
                        Ver estado de cuenta completo →
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cerrar</Button>
            </DialogClose>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditDialogOpen(true)}
            >
              Editar datos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerEditDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        customer={customerForEdit}
        onSave={async (data) => {
          const saveFn = onUpdateCustomer ?? updateCustomerAction;
          const res = await saveFn(data);
          if (res.success) {
            loadDetail();
          }
          return res;
        }}
      />
    </>
  );
}
