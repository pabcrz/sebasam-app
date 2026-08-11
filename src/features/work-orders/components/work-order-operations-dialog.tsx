"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, RotateCcw, UserCheck } from "lucide-react";
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

import { useRouter } from "next/navigation";

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
  assign?: (input: unknown) => Promise<ActionResult>;
  complete?: (input: unknown) => Promise<ActionResult>;
  rollback?: (input: unknown) => Promise<ActionResult>;
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
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<"assign" | "rollback" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form state for assignment
  const [isSpecial, setIsSpecial] = React.useState(false);
  const [specialAssigneeName, setSpecialAssigneeName] = React.useState("");
  const [masterId, setMasterId] = React.useState("");
  const [helperIds, setHelperIds] = React.useState<string[]>([]);
  const [confirmComplete, setConfirmComplete] = React.useState(false);
  const [reassigning, setReassigning] = React.useState(false);
  const [reassignMasterId, setReassignMasterId] = React.useState("");
  const [reassignHelperIds, setReassignHelperIds] = React.useState<string[]>([]);
  const [reassignSpecial, setReassignSpecial] = React.useState(false);
  const [reassignSpecialName, setReassignSpecialName] = React.useState("");
  const [showRollback, setShowRollback] = React.useState(false);
  const [rollbackReason, setRollbackReason] = React.useState("");
  const [rollbackTarget, setRollbackTarget] = React.useState<"" | "SENT" | "DRAFT">("");

  const eligibleWorkers = workers.filter((worker) => worker.role === "WORKER" && worker.workerKind !== null);
  const masters = eligibleWorkers.filter((worker) => worker.workerKind === "MASTER");
  const helpers = eligibleWorkers.filter((worker) => worker.workerKind === "HELPER");
  const assignedWorkers = workOrder?.assignments ?? [];

  const runAction = React.useCallback(
    (action: () => Promise<ActionResult>, kind: "assign" | "rollback" | null = null) => {
      setError(null);
      setPendingAction(kind);
      startTransition(async () => {
        try {
          const result = await action();
          if (!result.success) {
            setError(result.error ?? "No se pudo completar la acción.");
            return;
          }
          setOpen(false);
          router.refresh();
        } catch {
          setError("No se pudo completar la acción. Recarga e inténtalo de nuevo.");
        } finally {
          setPendingAction(null);
        }
      });
    },
    [router],
  );


  const toggleHelper = (id: string, checked: boolean | "indeterminate") => {
    if (checked === true) setHelperIds((current) => [...current, id]);
    if (checked === false) setHelperIds((current) => current.filter((helperId) => helperId !== id));
  };

  const handleAssign = () => {
    const assign = actions.assign;
    if (!assign) return;
    if (isSpecial) {
      if (!specialAssigneeName.trim()) {
        setError("Indica el nombre de quien realiza el trabajo especial.");
        return;
      }
      runAction(() =>
        assign({
          workOrderId: workOrder?.id || "pending",
          isSpecial: true,
          specialAssigneeName: specialAssigneeName.trim(),
        }), "assign",
      );
    } else {
      if (!masterId) {
        setError("Selecciona un maestro para el trabajo.");
        return;
      }
      runAction(() =>
        assign({
          workOrderId: workOrder?.id || "pending",
          isSpecial: false,
          masterId,
          helperIds,
        }), "assign",
      );
    }
  };

  const handleReassign = () => {
    const assign = actions.assign;
    if (!assign) return;
    if (reassignSpecial) {
      if (!reassignSpecialName.trim()) {
        setError("Indica el nombre de quien realiza el trabajo especial.");
        return;
      }
      runAction(() =>
        assign({
          workOrderId: workOrder?.id || "pending",
          isSpecial: true,
          specialAssigneeName: reassignSpecialName.trim(),
        }), "assign",
      );
    } else {
      if (!reassignMasterId) {
        setError("Selecciona un maestro para el trabajo.");
        return;
      }
      runAction(() =>
        assign({
          workOrderId: workOrder?.id || "pending",
          isSpecial: false,
          masterId: reassignMasterId,
          helperIds: reassignHelperIds,
        }), "assign",
      );
    }
  };

  const handleComplete = () => {
    if (!workOrder || !actions.complete) return;
    runAction(() => actions.complete!({ workOrderId: workOrder.id }));
  };

  const handleRollback = () => {
    const rollback = actions.rollback;
    if (!workOrder || !rollback || !rollbackReason.trim() || !rollbackTarget) {
      if (!rollbackReason.trim()) setError("Indica el motivo de la corrección.");
      else if (!rollbackTarget) setError("Selecciona el estado de destino para la cotización.");
      return;
    }
    runAction(() => rollback({
      workOrderId: workOrder.id,
      targetQuoteStatus: rollbackTarget,
      reason: rollbackReason.trim(),
    }), "rollback");
  };

  if (quoteStatus !== "APPROVED") return null;

  const isAssigned = workOrder?.status === "ASSIGNED";
  const isCompleted = workOrder?.status === "COMPLETED";
  const canRollback = workOrder && ["PLANNED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(workOrder.status);
  const isAssignmentPending = pendingAction === "assign";

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
          setShowRollback(false);
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
                  disabled={isAssignmentPending}
                />

                {isSpecial ? (
                  <div className="grid gap-2">
                    <Label htmlFor="special-name">Nombre del responsable *</Label>
                    <Input
                      id="special-name"
                      placeholder="Ej. Patrón, Sebastián, Externo..."
                      value={specialAssigneeName}
                      onChange={(e) => setSpecialAssigneeName(e.target.value)}
                      disabled={isAssignmentPending}
                    />
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Se registrará en la nota sin vincular a la nómina de trabajadores.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="master-select">Maestro responsable *</Label>
                      <Select value={masterId} onValueChange={setMasterId} disabled={isAssignmentPending}>
                        <SelectTrigger id="master-select" disabled={isAssignmentPending}>
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
                              disabled={isAssignmentPending}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}

                <p role="status" className="sr-only">{isAssignmentPending ? "Asignando..." : ""}</p>
                <Button type="button" variant="primary" disabled={!actions.assign || isAssignmentPending} onClick={handleAssign}>
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  {isAssignmentPending ? "Asignando..." : "Asignar e iniciar trabajo"}
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

                {/* Cambiar maestro */}
                {!reassigning ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setReassigning(true); setConfirmComplete(false); }}>
                    Cambiar maestro o asignación
                  </Button>
                ) : (
                  <div className="grid gap-4 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                    <h4 className="text-sm font-semibold text-[var(--color-text-main)]">Reasignar personal</h4>
                    <Checkbox id="reassign-special-toggle" label="Trabajo especial (Patrón o personal no registrado)" checked={reassignSpecial} onCheckedChange={(checked) => setReassignSpecial(checked === true)} disabled={isAssignmentPending} />
                    {reassignSpecial ? (
                      <div className="grid gap-2">
                        <Label htmlFor="reassign-special-name">Nombre del responsable *</Label>
                        <Input id="reassign-special-name" placeholder="Ej. Patrón, Sebastián, Externo..." value={reassignSpecialName} onChange={(e) => setReassignSpecialName(e.target.value)} disabled={isAssignmentPending} />
                      </div>
                    ) : (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="reassign-master-select">Maestro responsable *</Label>
                          <Select value={reassignMasterId} onValueChange={setReassignMasterId} disabled={isAssignmentPending}>
                            <SelectTrigger id="reassign-master-select" disabled={isAssignmentPending}><SelectValue placeholder="Selecciona un maestro" /></SelectTrigger>
                            <SelectContent>{masters.map((w) => (<SelectItem key={w.id} value={w.id}>{w.displayName}</SelectItem>))}</SelectContent>
                          </Select>
                        </div>
                        {helpers.length > 0 ? (
                          <div className="grid gap-2">
                            <Label>Ayudantes opcionales</Label>
                            <div className="grid gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-3">
                              {helpers.map((w) => (
                                <Checkbox key={w.id} id={`reassign-helper-${w.id}`} label={w.displayName} checked={reassignHelperIds.includes(w.id)}
                                  onCheckedChange={(checked) => {
                                   if (checked === true) setReassignHelperIds((c) => [...c, w.id]);
                                   if (checked === false) setReassignHelperIds((c) => c.filter((id) => id !== w.id));
                                  }} disabled={isAssignmentPending} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" size="sm" disabled={!actions.assign || isAssignmentPending} onClick={handleReassign} className="flex-1">
                        <UserCheck className="h-4 w-4" aria-hidden="true" />
                        {isAssignmentPending ? "Asignando..." : "Confirmar reasignación"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setReassigning(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {!reassigning && !confirmComplete ? (
                  <Button type="button" variant="primary" loading={isPending} onClick={() => setConfirmComplete(true)}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Finalizar trabajo
                  </Button>
                ) : !reassigning && confirmComplete ? (
                  <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">¿Confirmás que el trabajo fue completado?</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Al finalizar, los conceptos quedan congelados y se habilita la impresión de la Nota de Remisión.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" size="sm" loading={isPending} onClick={handleComplete} className="flex-1">Sí, finalizar orden</Button>
                      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirmComplete(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : null}
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

            {canRollback ? (
              <section className="grid gap-3 border-t border-[var(--color-border-light)] pt-5">
                <div>
                  <h3 className="font-semibold text-[var(--color-text-main)]">Corregir operación</h3>
                  <p className="text-sm text-[var(--color-text-muted)]">Cancela la orden sin borrar su historial operativo. No está disponible si hay pagos o movimientos financieros.</p>
                </div>
                {!showRollback ? (
                  <Button type="button" variant="danger" disabled={!actions.rollback || isPending} onClick={() => setShowRollback(true)}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Cancelar orden y regresar cotización
                  </Button>
                ) : (
                  <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-status-danger)] p-4">
                    <Label htmlFor="rollback-reason">Motivo de la corrección *</Label>
                    <Input id="rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} disabled={isPending} />
                    <Label htmlFor="rollback-target">Regresar cotización a *</Label>
                    <Select value={rollbackTarget} onValueChange={(value) => setRollbackTarget(value as "SENT" | "DRAFT")} disabled={isPending}>
                      <SelectTrigger id="rollback-target" disabled={isPending}><SelectValue placeholder="Selecciona el estado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SENT">Enviada</SelectItem>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button type="button" variant="danger" loading={isPending && pendingAction === "rollback"} onClick={handleRollback} className="flex-1">Confirmar corrección</Button>
                      <Button type="button" variant="outline" disabled={isPending} onClick={() => setShowRollback(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
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
