"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { WorkerEditForm } from "./worker-edit-form";

type WorkerEditDialogWorker = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  workerKind: "MASTER" | "HELPER" | null;
  isActive: boolean;
};

type WorkerAction = (workerId: string, formData: FormData) => void | Promise<void>;

type WorkerEditDialogProps = {
  worker: WorkerEditDialogWorker;
  updateAction: WorkerAction;
  setActiveAction: WorkerAction;
  deleteAction?: WorkerAction;
};

export function WorkerEditDialog({ worker, updateAction, setActiveAction, deleteAction }: WorkerEditDialogProps) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const updateWorker = updateAction.bind(null, worker.id);
  const setWorkerActive = setActiveAction.bind(null, worker.id);
  const deleteWorker = deleteAction?.bind(null, worker.id);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar trabajador</DialogTitle>
          <DialogDescription>
            Actualiza los datos operativos de {worker.displayName}.
          </DialogDescription>
        </DialogHeader>

        <WorkerEditForm action={updateWorker} worker={worker} returnTo="/admin/workers" />

        <div className="grid gap-4 border-t border-[var(--color-border-light)] pt-4">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-main)]">Estado del trabajador</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              Desactivar conserva sus asignaciones y registros históricos.
            </p>
            <form action={setWorkerActive} className="mt-3">
              <input type="hidden" name="isActive" value={worker.isActive ? "false" : "true"} />
              <input type="hidden" name="returnTo" value="/admin/workers" />
              <Button type="submit" variant={worker.isActive ? "secondary" : "outline"}>
                {worker.isActive ? "Desactivar trabajador" : "Activar trabajador"}
              </Button>
            </form>
          </div>

          {deleteWorker ? (
            <div className="border-t border-[var(--color-border-light)] pt-3">
              <p className="text-sm font-medium text-[var(--color-status-danger-fg)]">Eliminación permanente</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Elimina definitivamente el registro de {worker.displayName} del sistema.
              </p>
              {!confirmDelete ? (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  className="mt-3"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Icon name="trash" className="h-4 w-4" aria-hidden="true" />
                  Eliminar trabajador
                </Button>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <form action={deleteWorker}>
                    <input type="hidden" name="returnTo" value="/admin/workers" />
                    <Button type="submit" variant="danger" size="sm">
                      Sí, eliminar definitivamente
                    </Button>
                  </form>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
