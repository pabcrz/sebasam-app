"use client";

import { Badge, ListItemCard, type BadgeVariant } from "@/components/ui";
import { WorkerEditDialog } from "./worker-edit-dialog";

type WorkerCardListWorker = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  workerKind: "MASTER" | "HELPER" | null;
  isActive: boolean;
};

type WorkerCardListProps = {
  workers: WorkerCardListWorker[];
  updateAction: (workerId: string, formData: FormData) => void | Promise<void>;
  setActiveAction: (workerId: string, formData: FormData) => void | Promise<void>;
  deleteAction?: (workerId: string, formData: FormData) => void | Promise<void>;
};

const kindLabels = {
  MASTER: "Maestro",
  HELPER: "Ayudante",
} as const;

export function WorkerCardList({ workers, updateAction, setActiveAction, deleteAction }: WorkerCardListProps) {
  return (
    <div className="grid gap-3" data-testid="worker-card-list">
      {workers.map((worker) => {
        const statusLabel = worker.isActive ? "Activo" : "Inactivo";
        const statusVariant: BadgeVariant = worker.isActive ? "success" : "default";

        return (
          <ListItemCard
            key={worker.id}
            body={
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-[var(--color-text-main)]">{worker.displayName}</p>
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </div>
                <div className="mt-1 grid gap-0.5 text-sm text-[var(--color-text-muted)]">
                  <p>{kindLabels[worker.workerKind ?? "HELPER"]}</p>
                  <p className="truncate">@{worker.username}</p>
                  <p className="truncate">{worker.email}</p>
                </div>
              </>
            }
            actions={
              <WorkerEditDialog
                worker={worker}
                updateAction={updateAction}
                setActiveAction={setActiveAction}
                deleteAction={deleteAction}
              />
            }
          />
        );
      })}

      {workers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          No se encontraron trabajadores.
        </p>
      ) : null}
    </div>
  );
}
