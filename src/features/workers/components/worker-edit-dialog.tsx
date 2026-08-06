"use client";

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
};

export function WorkerEditDialog({ worker, updateAction, setActiveAction }: WorkerEditDialogProps) {
  const updateWorker = updateAction.bind(null, worker.id);
  const setWorkerActive = setActiveAction.bind(null, worker.id);

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

        <div className="border-t border-[var(--color-border-light)] pt-4">
          <p className="text-sm font-medium text-[var(--color-text-main)]">Estado del trabajador</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Desactivar conserva sus asignaciones y registros históricos.
          </p>
          <form action={setWorkerActive} className="mt-3">
            <input type="hidden" name="isActive" value={worker.isActive ? "false" : "true"} />
            <input type="hidden" name="returnTo" value="/admin/workers" />
            <Button type="submit" variant={worker.isActive ? "danger" : "secondary"}>
              {worker.isActive ? "Desactivar trabajador" : "Activar trabajador"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
