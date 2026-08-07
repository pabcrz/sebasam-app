"use client";

import * as React from "react";
import { ClipboardList, Plus, Trash2 } from "lucide-react";
import type { QuoteStatus, UserRole, WorkOrderStatus } from "@prisma/client";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";

export type WorkerOption = {
  id: string;
  displayName: string;
  role: UserRole;
  workerKind: "MASTER" | "HELPER" | null;
};

type Assignment = {
  id: string;
  workerId: string;
  status: string;
  worker: { displayName: string; workerKind: WorkerOption["workerKind"] };
};

type ExecutionRecord = {
  id: string;
  summary: string;
  notes: string | null;
  progressPercent: number;
  isExtra: boolean;
  happenedAt: Date;
  worker: { displayName: string } | null;
};

type WorkOrder = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  assignments?: Assignment[];
  executionRecords?: ExecutionRecord[];
};

type ActionResult = { success: boolean; error?: string };

export type WorkOrderActions = {
  ensureWaiting: () => Promise<ActionResult>;
  assign: (input: unknown) => Promise<ActionResult>;
  start: (input: unknown) => Promise<ActionResult>;
  recordExecution: (input: unknown) => Promise<ActionResult>;
  removeExecution: (executionRecordId: string) => Promise<ActionResult>;
};

type WorkOrderOperationsDialogProps = {
  quoteNumber: string;
  quoteStatus: QuoteStatus;
  workOrder: WorkOrder | null;
  workers?: WorkerOption[];
  actions?: WorkOrderActions;
};

const noopActions: WorkOrderActions = {
  ensureWaiting: async () => ({ success: false, error: "Acción no disponible." }),
  assign: async () => ({ success: false, error: "Acción no disponible." }),
  start: async () => ({ success: false, error: "Acción no disponible." }),
  recordExecution: async () => ({ success: false, error: "Acción no disponible." }),
  removeExecution: async () => ({ success: false, error: "Acción no disponible." }),
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

const timelineSteps = [
  { status: "PLANNED" as const, label: "En espera" },
  { status: "ASSIGNED" as const, label: "Asignada" },
  { status: "IN_PROGRESS" as const, label: "En proceso" },
];

function WorkOrderTimeline({ status }: { status: WorkOrderStatus }) {
  const terminal = status === "COMPLETED" || status === "CANCELLED";
  const currentIndex = timelineSteps.findIndex((step) => step.status === status);

  return (
    <ol aria-label="Etapas de la orden de trabajo" className="grid gap-2 sm:grid-cols-3 sm:gap-0">
      {timelineSteps.map((step, index) => {
        const complete = terminal || (currentIndex >= 0 && index < currentIndex);
        const current = step.status === status;

        return (
          <li key={step.status} className="relative flex items-center gap-3 sm:block sm:text-center">
            {index > 0 ? <span aria-hidden="true" className={`hidden sm:absolute sm:left-0 sm:top-4 sm:block sm:h-0.5 sm:w-1/2 ${complete || current ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-light)]"}`} /> : null}
            {index < timelineSteps.length - 1 ? <span aria-hidden="true" className={`hidden sm:absolute sm:right-0 sm:top-4 sm:block sm:h-0.5 sm:w-1/2 ${complete ? "bg-[var(--color-primary)]" : "bg-[var(--color-border-light)]"}`} /> : null}
            <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold sm:mx-auto ${complete || current ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-border-light)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"}`}>
              {index + 1}
            </span>
            <span className={`text-sm sm:mt-2 sm:block ${current ? "font-semibold text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"}`} aria-current={current ? "step" : undefined}>
              {step.label}
            </span>
          </li>
        );
      })}
      {terminal ? (
        <li className="mt-1 text-sm font-semibold text-[var(--color-text-main)] sm:col-span-3 sm:mt-3 sm:text-center">
          Estado terminal: {status === "COMPLETED" ? "Completada" : "Cancelada"}
        </li>
      ) : null}
    </ol>
  );
}

export function WorkOrderOperationsDialog({
  quoteNumber,
  quoteStatus,
  workOrder,
  workers = [],
  actions = noopActions,
}: WorkOrderOperationsDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [masterId, setMasterId] = React.useState("");
  const [helperIds, setHelperIds] = React.useState<string[]>([]);
  const [capacityConfirmed, setCapacityConfirmed] = React.useState(false);
  const [availabilityConfirmed, setAvailabilityConfirmed] = React.useState(false);
  const [detail, setDetail] = React.useState("");
  const [progressPercent, setProgressPercent] = React.useState("0");
  const [workerId, setWorkerId] = React.useState("");
  const [isExtra, setIsExtra] = React.useState(false);
  const [happenedAt, setHappenedAt] = React.useState(() => new Date().toISOString().slice(0, 16));

  const eligibleWorkers = workers.filter((worker) => worker.role === "WORKER" && worker.workerKind !== null);
  const masters = eligibleWorkers.filter((worker) => worker.workerKind === "MASTER");
  const helpers = eligibleWorkers.filter((worker) => worker.workerKind === "HELPER");
  const assignedWorkers = workOrder?.assignments ?? [];
  const records = workOrder?.executionRecords ?? [];

  const runAction = React.useCallback(
    (action: () => Promise<ActionResult>) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (!result.success) {
          setError(result.error ?? "No se pudo completar la acción.");
          return;
        }
        setOpen(false);
        if (typeof window !== "undefined") window.location.reload();
      });
    },
    [],
  );

  const toggleHelper = (id: string, checked: boolean | "indeterminate") => {
    if (checked === true) setHelperIds((current) => [...current, id]);
    if (checked === false) setHelperIds((current) => current.filter((helperId) => helperId !== id));
  };

  const handleAssign = () => {
    if (!masterId || !capacityConfirmed || !availabilityConfirmed) {
      setError("Selecciona un maestro y confirma el espacio del taller y su disponibilidad.");
      return;
    }

    runAction(() => actions.assign({
      workOrderId: workOrder!.id,
      masterId,
      helperIds,
      workshopCapacityConfirmed: capacityConfirmed,
      masterAvailabilityConfirmed: availabilityConfirmed,
    }));
  };

  const handleStart = () => {
    runAction(() => actions.start({ workOrderId: workOrder!.id }));
  };

  const handleRecord = () => {
    if (!workOrder || !workerId) {
      setError("Selecciona quién realizó el trabajo.");
      return;
    }

    runAction(() => actions.recordExecution({
      workOrderId: workOrder.id,
      workerId,
      summary: detail,
      progressPercent,
      isExtra,
      happenedAt: happenedAt ? new Date(happenedAt).toISOString() : undefined,
    }));
  };

  if (quoteStatus !== "APPROVED") return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={(event) => {
          event.stopPropagation();
          setError(null);
          setOpen(true);
        }}
        aria-label={workOrder ? `Gestionar orden de trabajo ${workOrder.number}` : `Enviar cotización ${quoteNumber} a espera`}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        <span>{workOrder ? "Gestionar trabajo" : "Enviar a espera"}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{workOrder ? `Orden de trabajo ${workOrder.number}` : "Enviar cotización a espera"}</DialogTitle>
            <DialogDescription>
              {workOrder
                ? `Seguimiento operativo de la cotización ${quoteNumber}. Las acciones administrativas quedan vinculadas a esta orden.`
                : `La cotización ${quoteNumber} está aceptada y puede entrar a En espera.`}
            </DialogDescription>
          </DialogHeader>

          {!workOrder ? (
            <div className="grid gap-3">
              <p className="text-sm text-[var(--color-text-muted)]">
                En espera no inicia el trabajo. Primero se debe confirmar capacidad y asignar un maestro.
              </p>
              <Button type="button" loading={isPending} onClick={() => runAction(actions.ensureWaiting)}>
                Crear orden en espera
              </Button>
            </div>
          ) : (
            <div className="grid gap-5">
              <WorkOrderTimeline status={workOrder.status} />

              {workOrder.status === "PLANNED" ? (
                <section className="grid gap-3">
                  <h3 className="font-semibold">Asignación</h3>
                  <div className="grid gap-2">
                    <Label htmlFor={`master-${workOrder.id}`}>Maestro requerido</Label>
                    <Select value={masterId} onValueChange={setMasterId}>
                      <SelectTrigger id={`master-${workOrder.id}`}>
                        <SelectValue placeholder="Selecciona un maestro" />
                      </SelectTrigger>
                      <SelectContent>
                        {masters.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.displayName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Ayudantes opcionales</Label>
                    {helpers.length === 0 ? <p className="text-sm text-[var(--color-text-muted)]">No hay ayudantes activos disponibles.</p> : null}
                    {helpers.map((worker) => (
                      <Checkbox
                        key={worker.id}
                        id={`helper-${worker.id}`}
                        label={worker.displayName}
                        checked={helperIds.includes(worker.id)}
                        onCheckedChange={(checked) => toggleHelper(worker.id, checked)}
                      />
                    ))}
                  </div>
                  <Checkbox
                    label="Confirmo que hay espacio disponible en el taller"
                    checked={capacityConfirmed}
                    onCheckedChange={(checked) => setCapacityConfirmed(checked === true)}
                  />
                  <Checkbox
                    label="Confirmo la disponibilidad del maestro"
                    checked={availabilityConfirmed}
                    onCheckedChange={(checked) => setAvailabilityConfirmed(checked === true)}
                  />
                  <Button type="button" loading={isPending} onClick={handleAssign}>Asignar personal</Button>
                </section>
              ) : null}

              {workOrder.status === "ASSIGNED" ? (
                <section className="grid gap-3">
                  <h3 className="font-semibold">Personal asignado</h3>
                  <ul className="grid gap-1 text-sm text-[var(--color-text-muted)]">
                    {assignedWorkers.map((assignment) => <li key={assignment.id}>{assignment.worker.displayName} ({assignment.worker.workerKind === "MASTER" ? "Maestro" : "Ayudante"})</li>)}
                  </ul>
                  <p className="text-sm text-[var(--color-text-muted)]">Capacidad y disponibilidad confirmadas durante la asignación.</p>
                  <Button type="button" loading={isPending} onClick={handleStart}>Iniciar trabajo</Button>
                </section>
              ) : null}

              {workOrder.status === "IN_PROGRESS" ? <section className="grid gap-3 border-t border-[var(--color-border-light)] pt-4">
                <h3 className="font-semibold">Registrar ejecución</h3>
                <div className="grid gap-2">
                  <Label htmlFor={`execution-worker-${workOrder.id}`}>Trabajador</Label>
                  <Select value={workerId} onValueChange={setWorkerId}>
                    <SelectTrigger id={`execution-worker-${workOrder.id}`}>
                      <SelectValue placeholder="Selecciona quién realizó el trabajo" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleWorkers.map((worker) => <SelectItem key={worker.id} value={worker.id}>{worker.displayName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`execution-detail-${workOrder.id}`}>Detalle (opcional)</Label>
                  <Textarea id={`execution-detail-${workOrder.id}`} value={detail} onChange={(event) => setDetail(event.target.value)} rows={2} placeholder="Ej. Se desmontó la suspensión trasera" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`execution-progress-${workOrder.id}`}>Avance: {progressPercent}%</Label>
                    <div role="progressbar" aria-label="Avance actual" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number(progressPercent)} className="h-2 overflow-hidden rounded-full bg-[var(--color-bg-soft)]">
                      <div className="h-full bg-[var(--color-primary)] transition-[width]" style={{ width: `${progressPercent}%` }} />
                    </div>
                    <Input id={`execution-progress-${workOrder.id}`} type="range" min={0} max={100} step={10} value={progressPercent} onChange={(event) => setProgressPercent(event.target.value)} className="h-8 cursor-pointer accent-[var(--color-primary)]" aria-label="Avance en incrementos de diez" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`execution-date-${workOrder.id}`}>Fecha y hora</Label>
                    <Input id={`execution-date-${workOrder.id}`} type="datetime-local" value={happenedAt} onChange={(event) => setHappenedAt(event.target.value)} />
                  </div>
                </div>
                <Checkbox label="Es un adicional controlado por administración" checked={isExtra} onCheckedChange={(checked) => setIsExtra(checked === true)} />
                <Button type="button" variant="primary" loading={isPending} onClick={handleRecord}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Registrar ejecución
                </Button>
              </section> : null}

              {records.length > 0 ? (
                <section className="grid gap-2 border-t border-[var(--color-border-light)] pt-4">
                  <h3 className="font-semibold">Historial</h3>
                  {records.map((record) => (
                    <div key={record.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-3 text-sm">
                      <div>
                        <p className="font-medium">{record.summary || "Sin detalle"}{record.isExtra ? " — Adicional" : ""}</p>
                        <p className="text-[var(--color-text-muted)]">{record.worker?.displayName ?? "Sin trabajador"} · {record.progressPercent}% · {formatDate(record.happenedAt)}</p>
                        {record.notes ? <p className="mt-1 text-[var(--color-text-muted)]">{record.notes}</p> : null}
                      </div>
                      {record.isExtra ? (
                        <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => runAction(() => actions.removeExecution(record.id))} aria-label={`Quitar adicional ${record.summary}`}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </section>
              ) : null}
            </div>
          )}

          {error ? <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
