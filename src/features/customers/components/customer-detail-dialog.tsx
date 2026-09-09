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
import type { CustomerAccountStatement } from "../queries";
import type { CustomerCardListItem } from "./customer-card-list";
import { CustomerAccountStatement as CustomerAccountStatementView } from "./customer-account-statement";

type CustomerDetail = {
  customer: CustomerCardListItem & {
    address: string | null;
    notes: string | null;
  };
  statement: CustomerAccountStatement;
};

export type CustomerDetailLoader = (customerId: string) => Promise<CustomerDetail | null>;

type CustomerDetailDialogProps = {
  customer: CustomerCardListItem;
  getCustomerDetail: CustomerDetailLoader;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function CustomerDetailDialog({
  customer,
  getCustomerDetail,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CustomerDetailDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const [detail, setDetail] = React.useState<CustomerDetail | null>(null);
  const [state, setState] = React.useState<"idle" | "loading" | "error">("idle");
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="absolute inset-0 cursor-pointer rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          aria-label={`Ver cuenta de ${customer.name}`}
          onClick={loadDetail}
        />
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">Cliente</p>
          <DialogTitle>Cuenta de {customer.name}</DialogTitle>
          <DialogDescription>Consulta sus datos y el estado de cuenta sin salir del espacio de trabajo.</DialogDescription>
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
            <div className="grid gap-4">
              <dl className="grid gap-4 text-sm sm:grid-cols-2" data-testid="customer-detail-context">
                <div>
                  <dt className="text-[var(--color-text-muted)]">Nombre</dt>
                  <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.name}</dd>
                </div>
                {detail.customer.commercialName ? (
                  <div>
                    <dt className="text-[var(--color-text-muted)]">Nombre comercial</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-main)]">{detail.customer.commercialName}</dd>
                  </div>
                ) : null}
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
              <CustomerAccountStatementView statement={detail.statement} />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
          <Button asChild variant="secondary">
            <Link href={`/admin/customers/${customer.id}/edit`}>Editar</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
