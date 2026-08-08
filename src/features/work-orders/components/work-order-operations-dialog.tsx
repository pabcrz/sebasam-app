"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, UserCheck } from "lucide-react";
import type { QuoteStatus, UserRole, WorkOrderStatus } from "@prisma/client";
import {
  Badge,
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

type WorkOrder = {
  id: string;
  number: string;
  status: WorkOrderStatus;
  isSpecial?: boolean;
  specialAssigneeName?: string | null;
  assignments?: Assignment[];
};

type ActionResult = { success: boolean; error?: string };

export type WorkOrderActions = {
  assign: (input: unknown) => Promise<ActionResult>;
  complete?: (input: unknown) => Promise<ActionResult>;
  ensureWaiting?: () => Promise<ActionResult>;
  start?: (input: unknown) => Promise<ActionResult>;
  recordExecution?: (input: unknown) => Promise<ActionResult>;
  removeExecution?: (executionRecordId: string) => Promise<ActionResult>;
};

type WorkOrderOperationsDialogProps = {
  quoteNumber: string;
  quoteStatus: QuoteStatus;
  workOrder: WorkOrder | null;
  workers?: WorkerOption[];
  actions?: WorkOrderActions;
};

const noopActions: WorkOrderActions = {
  assign: async () => ({ success: false, error: "Acción no disponible." }),
  complete: async () => ({ success: false, error: "Acción no disponible." }),
};

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

  // Form state for assignment
  const [isSpecial, setIsSpecial] = React.useState(false);
  const [specialAssigneeName, setSpecialAssigneeName] = React.useState("");
  const [masterId, setMasterId] = React.useState("");
  const [helperIds, setHelperIds] = React.useState<string[]>([]);
  const [confirmComplete, setConfirmComplete] = React.useState(false);

  const eligibleWorkers = workers.filter((worker) => worker.role === "WORKER" && worker.workerKind !== null);
  const masters = eligibleWorkers.filter((worker) => worker.workerKind === "MASTER");
  const helpers = eligibleWorkers.filter((worker) => worker.workerKind === "HELPER");
  const assignedWorkers = workOrder?.assignments ?? [];

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
    if (isSpecial) {
      if (!specialAssigneeName.trim()) {
        setError("Indica el nombre de quien realiza el trabajo especial.");
        return;
      }
      runAction(() =>
        actions.assign({
          workOrderId: workOrder?.id || "pending",
          isSpecial: true,
          specialAssigneeName: specialAssigneeName.trim(),
        }),
      );
    } else {
      if (!masterId) {
        setError("Selecciona un maestro para el trabajo.");
        return;
      }
      runAction(() =>
        actions.assign({
          workOrderId: workOrder?.id || "pending",
          isSpecial: false,
          masterId,
          helperIds,
        }),
      );
    }
  };

  const handleComplete = () => {
    if (!workOrder || !actions.complete) return;
    runAction(() => actions.complete!({ workOrderId: workOrder.id }));
  };

  if (quoteStatus !== "APPROVED") return null;

  const isAssigned = workOrder?.status === "ASSIGNED";
  const isCompleted = workOrder?.status === "COMPLETED";

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
          setConfirmComplete(false);
          setOpen(true);
        }}
        aria-label={workOrder ? `Gestionar orden de trabajo ${workOrder.number}` : `Gestionar trabajo de cotización ${quoteNumber}`}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        <span>{isCompleted ? "Ver orden" : isAssigned ? "Gestionar trabajo" : "Asignar trabajo"}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {workOrder ? `Orden de trabajo ${workOrder.number}` : `Asignar trabajo — Cotización ${quoteNumber}`}
            </DialogTitle>
            <DialogDescription>
              {isCompleted
                ? `Orden finalizada para la cotización ${quoteNumber}. Los conceptos están congelados.`
                : isAssigned
                ? `Trabajo en proceso para la cotización ${quoteNumber}.`
                : `Asigna un maestro o registra un trabajo especial para iniciar.`}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            {/* Status Header */}
            <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <span className="text-sm font-medium text-[var(--color-text-muted)]">Estado operativo</span>
              <Badge
                variant={isCompleted ? "success" : isAssigned ? "info" : "warning"}
                className="w-fit"
              >
                {isCompleted ? "Completada" : isAssigned ? "En proceso" : "Sin asignar"}
              </Badge>
            </div>

            {/* Section 1: Unassigned or Planned -> Assign form */}
            {!workOrder || workOrder.status === "PLANNED" ? (
              <section className="grid gap-4">
                <h3 className="font-semibold text-[var(--color-text-main)]">Asignación de personal</h3>

                <Checkbox
                  id="special-order-toggle"
                  label="Trabajo especial (Patrón o personal no registrado)"
                  checked={isSpecial}
                  onCheckedChange={(checked) => setIsSpecial(checked === true)}
                />

                {isSpecial ? (
                  <div className="grid gap-2">
                    <Label htmlFor="special-name">Nombre del responsable *</Label>
                    <Input
                      id="special-name"
                      placeholder="Ej. Patrón, Sebastián, Externo..."
                      value={specialAssigneeName}
                      onChange={(e) => setSpecialAssigneeName(e.target.value)}
                    />
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Se registrará en la nota sin vincular a la nómina de trabajadores.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="master-select">Maestro responsable *</Label>
                      <Select value={masterId} onValueChange={setMasterId}>
                        <SelectTrigger id="master-select">
                          <SelectValue placeholder="Selecciona un maestro" />
                        </SelectTrigger>
                        <SelectContent>
                          {masters.map((w) => (
                            <SelectItem key={w.id} value={w.id}>
                              {w.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {helpers.length > 0 ? (
                      <div className="grid gap-2">
                        <Label>Ayudantes opcionales</Label>
                        <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-3">
                          {helpers.map((w) => (
                            <Checkbox
                              key={w.id}
                              id={`helper-${w.id}`}
                              label={w.displayName}
                              checked={helperIds.includes(w.id)}
                              onCheckedChange={(checked) => toggleHelper(w.id, checked)}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                <Button type="button" variant="primary" loading={isPending} onClick={handleAssign}>
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  Asignar e iniciar trabajo
                </Button>
              </section>
            ) : null}

            {/* Section 2: Assigned -> In process details + Complete button */}
            {isAssigned ? (
              <section className="grid gap-4">
                <div className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
                  <h3 className="mb-2 font-semibold text-[var(--color-text-main)]">Personal asignado</h3>
                  {workOrder.isSpecial ? (
                    <p className="text-sm">
                      <span className="font-medium text-[var(--color-text-main)]">Trabajo especial: </span>
                      <span className="text-[var(--color-text-muted)]">{workOrder.specialAssigneeName ?? "Sin nombre"}</span>
                    </p>
                  ) : assignedWorkers.length > 0 ? (
                    <ul className="grid gap-1 text-sm text-[var(--color-text-muted)]">
                      {assignedWorkers.map((a) => (
                        <li key={a.id}>
                          <span className="font-medium text-[var(--color-text-main)]">{a.worker.displayName}</span>{" "}
                          ({a.worker.workerKind === "MASTER" ? "Maestro" : "Ayudante"})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)]">Sin información de asignación.</p>
                  )}
                </div>

                {!confirmComplete ? (
                  <Button
                    type="button"
                    variant="primary"
                    loading={isPending}
                    onClick={() => setConfirmComplete(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Finalizar trabajo
                  </Button>
                ) : (
                  <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">
                      ¿Confirmas que el trabajo fue completado?
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Al finalizar, los conceptos quedan congelados y se habilita la impresión de la Nota de Remisión.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        loading={isPending}
                        onClick={handleComplete}
                        className="flex-1"
                      >
                        Sí, finalizar orden
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        onClick={() => setConfirmComplete(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {/* Section 3: Completed -> Finished summary */}
            {isCompleted ? (
              <section className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
                <p className="text-sm text-[var(--color-text-muted)]">
                  Trabajo completado. Podes generar la Nota de Remisión desde el panel de Notas o imprimir la orden.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.open(`/admin/notas/${workOrder.id}/print`, "_blank")}
                >
                  Imprimir Nota de Remisión
                </Button>
              </section>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
