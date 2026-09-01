"use client";

import * as React from "react";
import { Trash2 } from "lucide-react";
import {
  Button,
  DestructiveAction,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui";
import { WorkerEditForm } from "./worker-edit-form";
import { WorkerStatusControl } from "./worker-status-control";

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
            <WorkerStatusControl
              workerName={worker.displayName}
              isActive={worker.isActive}
              setActiveAction={setWorkerActive}
              returnTo="/admin/workers"
            />
          </div>

          {deleteWorker ? (
            <div className="border-t border-[var(--color-border-light)] pt-3">
              <p className="text-sm font-medium text-[var(--color-status-danger-fg)]">Eliminación permanente</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                Elimina definitivamente el registro de {worker.displayName} del sistema.
              </p>
              <DestructiveAction
                triggerLabel="Eliminar trabajador"
                triggerIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                size="sm"
                triggerClassName="mt-3"
                title="Eliminar trabajador"
                description={`Elimina definitivamente el registro de ${worker.displayName} del sistema. Esta acción no se puede deshacer.`}
                confirmLabel="Sí, eliminar definitivamente"
                cancelLabel="Cancelar"
                onConfirm={async () => {
                  const formData = new FormData();
                  formData.set("returnTo", "/admin/workers");
                  await deleteWorker(formData);
                }}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
