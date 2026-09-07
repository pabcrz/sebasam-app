"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, FileText, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import type { CustomerDeletionBlocker } from "../domain";

export type CustomerActionsMenuProps = {
  customer: {
    id: string;
    name: string;
  };
  blocker: CustomerDeletionBlocker;
  onEdit: () => void;
  onViewStatement: () => void;
  onDelete: () => void;
  triggerClassName?: string;
};

export function CustomerActionsMenu({
  customer,
  blocker,
  onEdit,
  onViewStatement,
  onDelete,
  triggerClassName,
}: CustomerActionsMenuProps) {
  const [open, setOpen] = React.useState(false);

  const handleAction = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={triggerClassName ?? "min-h-11 px-3"}
          aria-label={`Más acciones de ${customer.name}`}
          title={`Más acciones de ${customer.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-5 w-5 text-[var(--color-text-muted)]" aria-hidden="true" />
          <span className="sr-only">Más acciones</span>
        </Button>
      </DialogTrigger>
      <DialogMobileContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogMobileHeader>
          <DialogTitle>Acciones de cliente</DialogTitle>
          <DialogDescription>Opciones para {customer.name}</DialogDescription>
          <DialogMobileClose aria-label={`Cerrar acciones de ${customer.name}`} />
        </DialogMobileHeader>
        <DialogMobileBody>
          <div className="grid gap-2 py-2">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleAction(onEdit)}
            >
              <Pencil className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
              Editar datos
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => handleAction(onViewStatement)}
            >
              <FileText className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
              Ver estado de cuenta
            </Button>

            <div className="mt-3 border-t border-[var(--color-border-light)] pt-3">
              <Button
                type="button"
                variant="danger"
                className="w-full justify-start gap-2"
                disabled={!blocker.canDelete}
                onClick={() => handleAction(onDelete)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar cliente
              </Button>
              {!blocker.canDelete && blocker.reason ? (
                <p className="mt-1.5 px-1 text-xs text-[var(--color-status-danger-fg)]">
                  {blocker.reason}
                </p>
              ) : null}
            </div>
          </div>
        </DialogMobileBody>
      </DialogMobileContent>
    </Dialog>
  );
}
