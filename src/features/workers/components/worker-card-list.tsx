"use client";

import * as React from "react";
import { Badge, ListRow } from "@/components/ui";
import { WorkerEditDialog } from "./worker-edit-dialog";

type WorkerCardListWorker = {
  id: string;
  displayName: string;
  username: string;
  email: string;
  workerKind: "MASTER" | "HELPER" | null;
  isActive: boolean;
  _count?: { assignments: number } | null;
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

function workloadLabel(activeJobs: number) {
  if (activeJobs === 0) return "Sin trabajos";
  return `${activeJobs} trabajo${activeJobs === 1 ? "" : "s"} activo${activeJobs === 1 ? "" : "s"}`;
}

/** One whole-row button per worker; the workload sits on the right. Tapping a row opens its edit sheet. */
export function WorkerCardList({ workers, updateAction, setActiveAction, deleteAction }: WorkerCardListProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const editing = workers.find((worker) => worker.id === editingId) ?? null;

  return (
    <div className="grid gap-3" data-testid="worker-card-list">
      {workers.map((worker) => {
        const activeJobs = worker._count?.assignments;

        return (
          <ListRow
            key={worker.id}
            openLabel={`Editar a ${worker.displayName}`}
            onOpen={() => setEditingId(worker.id)}
            decision={
              activeJobs === undefined ? null : (
                <span className="text-sm tabular-nums text-[var(--color-text-muted)]">{workloadLabel(activeJobs)}</span>
              )
            }
          >
            <span className="grid min-w-0 gap-0.5">
              <span className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="truncate font-medium text-[var(--color-text-main)]">{worker.displayName}</span>
                {worker.isActive ? null : <Badge variant="default">Inactivo</Badge>}
              </span>
              <span className="truncate text-sm text-[var(--color-text-muted)]">
                {kindLabels[worker.workerKind ?? "HELPER"]} · @{worker.username}
              </span>
            </span>
          </ListRow>
        );
      })}

      {editing ? (
        <WorkerEditDialog
          key={editing.id}
          worker={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
          updateAction={updateAction}
          setActiveAction={setActiveAction}
          deleteAction={deleteAction}
        />
      ) : null}

      {workers.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
          No se encontraron trabajadores.
        </p>
      ) : null}
    </div>
  );
}
