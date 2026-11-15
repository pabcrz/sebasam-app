"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  DialogClose,
  DialogDangerZone,
  DialogDescription,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateAction: WorkerAction;
  setActiveAction: WorkerAction;
  deleteAction?: WorkerAction;
};

/** Edit sheet for one worker: fields first, then the fixed Cancelar / Guardar footer, then the danger zone. */
export function WorkerEditDialog({
  worker,
  open,
  onOpenChange,
  updateAction,
  setActiveAction,
  deleteAction,
}: WorkerEditDialogProps) {
  const formId = React.useId();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const updateWorker = updateAction.bind(null, worker.id);
  const setWorkerActive = setActiveAction.bind(null, worker.id);
  const deleteWorker = deleteAction?.bind(null, worker.id);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <DialogMobileContent variant="sheet">
        <DialogMobileHeader>
          <DialogTitle>Editar trabajador</DialogTitle>
          <DialogDescription>Actualiza los datos operativos de {worker.displayName}.</DialogDescription>
        </DialogMobileHeader>

        <DialogMobileBody className="grid content-start gap-6">
          <WorkerEditForm
            action={updateWorker}
            worker={worker}
            returnTo="/admin/workers"
            formId={formId}
            showSubmit={false}
          />

          {worker.isActive ? null : (
            <form action={setWorkerActive} className="grid gap-2">
              <input type="hidden" name="isActive" value="true" />
              <input type="hidden" name="returnTo" value="/admin/workers" />
              <Button type="submit" variant="outline" className="w-fit">
                Activar trabajador
              </Button>
            </form>
          )}

          <DialogDangerZone>
            {worker.isActive ? (
              <div className="grid gap-2">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Desactivar conserva sus asignaciones y registros históricos.
                </p>
                <form action={setWorkerActive}>
                  <input type="hidden" name="isActive" value="false" />
                  <input type="hidden" name="returnTo" value="/admin/workers" />
                  <Button type="submit" variant="danger" className="w-fit">
                    Desactivar trabajador
                  </Button>
                </form>
              </div>
            ) : null}

            {deleteWorker ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-[var(--color-status-danger-fg)]">Baja del trabajador</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Si {worker.displayName} tiene historial (asignaciones, ejecución o nómina), solo se desactiva y el historial se conserva. Si no tiene ninguno, se elimina el registro.
                </p>
                {!confirmDelete ? (
                  <Button
                    type="button"
                    variant="danger"
                    className="w-fit"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Icon name="trash" className="h-4 w-4" aria-hidden="true" />
                    Eliminar trabajador
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={deleteWorker}>
                      <input type="hidden" name="returnTo" value="/admin/workers" />
                      <Button type="submit" variant="danger">
                        Sí, eliminar
                      </Button>
                    </form>
                    <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                      No, conservar
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </DialogDangerZone>
        </DialogMobileBody>

        <DialogMobileFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="primary" size="lg">
            Guardar
          </Button>
        </DialogMobileFooter>
      </DialogMobileContent>
    </Sheet>
  );
}
