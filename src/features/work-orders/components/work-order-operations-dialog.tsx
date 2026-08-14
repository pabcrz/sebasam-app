"use client";

import * as React from "react";
import { CheckCircle2, ClipboardList, Printer, RotateCcw, UserCheck } from "lucide-react";
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
  triggerIconOnlyDesktop?: boolean;
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
  triggerIconOnlyDesktop = false,
}: WorkOrderOperationsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<"assign" | "complete" | "rollback" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Form state for assignment
  const [isSpecial, setIsSpecial] = React.useState(false);
  const [masterId, setMasterId] = React.useState("");
  const [helperIds, setHelperIds] = React.useState<string[]>([]);
  const [confirmComplete, setConfirmComplete] = React.useState(false);
  const [reassigning, setReassigning] = React.useState(false);
  const [reassignMasterId, setReassignMasterId] = React.useState("");
  const [reassignHelperIds, setReassignHelperIds] = React.useState<string[]>([]);
  const [reassignSpecial, setReassignSpecial] = React.useState(false);
  const [showRollback, setShowRollback] = React.useState(false);
  const [rollbackReason, setRollbackReason] = React.useState("");
  const [rollbackTarget, setRollbackTarget] = React.useState<"" | "SENT" | "DRAFT">("");

  const eligibleWorkers = workers.filter((worker) => worker.role === "WORKER" && worker.workerKind !== null);
  const masters = eligibleWorkers.filter((worker) => worker.workerKind === "MASTER");
  const helpers = eligibleWorkers.filter((worker) => worker.workerKind === "HELPER");
  const assignedWorkers = workOrder?.assignments ?? [];

  const runAction = React.useCallback(
    (action: () => Promise<ActionResult>, kind: "assign" | "complete" | "rollback") => {
      setError(null);
      setPendingAction(kind);
      void (async () => {
        try {
          const result = await action();
          if (!result.success) {
            setError(result.error ?? "No se pudo completar la acción.");
            return;
          }
          startTransition(() => {
            router.refresh();
          });
        } catch {
          setError("No se pudo completar la acción. Recarga e inténtalo de nuevo.");
        } finally {
          setPendingAction(null);
        }
      })();
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
      runAction(() => assign({ isSpecial: true }), "assign");
    } else {
      if (!masterId) {
        setError("Selecciona un maestro para el trabajo.");
        return;
      }
      runAction(() =>
        assign({
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
      runAction(() => assign({ isSpecial: true }), "assign");
    } else {
      if (!reassignMasterId) {
        setError("Selecciona un maestro para el trabajo.");
        return;
      }
      runAction(() =>
        assign({
          isSpecial: false,
          masterId: reassignMasterId,
          helperIds: reassignHelperIds,
        }), "assign",
      );
    }
  };

  const handleComplete = () => {
    if (!workOrder || !actions.complete) return;
    runAction(() => actions.complete!({ workOrderId: workOrder.id }), "complete");
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
  const isAssignmentBusy = pendingAction !== null || isPending;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={triggerIconOnlyDesktop ? "w-full sm:w-9 sm:px-0" : "w-full"}
        onClick={(event) => {
          event.stopPropagation();
          setError(null);
          setConfirmComplete(false);
          setShowRollback(false);
          setOpen(true);
        }}
        aria-label={isAssignmentBusy ? "Asignando trabajo..." : workOrder ? `Gestionar orden de trabajo ${workOrder.number}` : `Gestionar trabajo de cotización ${quoteNumber}`}
        title={workOrder ? `Gestionar orden de trabajo ${workOrder.number}` : `Gestionar trabajo de cotización ${quoteNumber}`}
        disabled={isAssignmentBusy}
        loading={isAssignmentBusy}
      >
        {!isAssignmentBusy ? <ClipboardList className="h-4 w-4" aria-hidden="true" /> : null}
        <span className={triggerIconOnlyDesktop ? "sm:sr-only" : undefined}>{isAssignmentBusy ? "Asignando trabajo..." : isCompleted ? "Ver orden" : isAssigned ? "Gestionar trabajo" : "Asignar trabajo"}</span>
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!isAssignmentBusy) setOpen(nextOpen); }}>
        <DialogContent
          className="max-w-xl"
          onEscapeKeyDown={(event) => { if (isAssignmentBusy) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (isAssignmentBusy) event.preventDefault(); }}
        >
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
                  label="Trabajo especial (Taller)"
                  checked={isSpecial}
                  onCheckedChange={(checked) => setIsSpecial(checked === true)}
                  disabled={isAssignmentBusy}
                />

                {!isSpecial ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="master-select">Maestro responsable *</Label>
                      <Select value={masterId} onValueChange={setMasterId} disabled={isAssignmentBusy}>
                        <SelectTrigger id="master-select" disabled={isAssignmentBusy}>
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
                              disabled={isAssignmentBusy}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <p role="status" className="sr-only">{pendingAction === "assign" ? "Asignando..." : ""}</p>
                <Button type="button" variant="primary" loading={pendingAction === "assign"} disabled={!actions.assign || isAssignmentBusy} onClick={handleAssign}>
                  {pendingAction !== "assign" ? <UserCheck className="h-4 w-4" aria-hidden="true" /> : null}
                  {pendingAction === "assign" ? "Asignando..." : "Asignar e iniciar trabajo"}
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
                      <span className="text-[var(--color-text-muted)]">Taller</span>
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
                    <Checkbox id="reassign-special-toggle" label="Trabajo especial (Taller)" checked={reassignSpecial} onCheckedChange={(checked) => setReassignSpecial(checked === true)} disabled={isAssignmentBusy} />
                    {!reassignSpecial ? (
                      <>
                        <div className="grid gap-2">
                          <Label htmlFor="reassign-master-select">Maestro responsable *</Label>
                          <Select value={reassignMasterId} onValueChange={setReassignMasterId} disabled={isAssignmentBusy}>
                            <SelectTrigger id="reassign-master-select" disabled={isAssignmentBusy}><SelectValue placeholder="Selecciona un maestro" /></SelectTrigger>
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
                                  }} disabled={isAssignmentBusy} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" size="sm" loading={pendingAction === "assign"} disabled={!actions.assign || isAssignmentBusy} onClick={handleReassign} className="flex-1">
                        {pendingAction !== "assign" ? <UserCheck className="h-4 w-4" aria-hidden="true" /> : null}
                        {pendingAction === "assign" ? "Asignando..." : "Confirmar reasignación"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={isAssignmentBusy} onClick={() => setReassigning(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {!reassigning && !confirmComplete ? (
                  <Button type="button" variant="primary" disabled={isAssignmentBusy} onClick={() => setConfirmComplete(true)}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    Finalizar trabajo
                  </Button>
                ) : !reassigning && confirmComplete ? (
                  <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">¿Confirmás que el trabajo fue completado?</p>
                    <p className="text-xs text-[var(--color-text-muted)]">Al finalizar, los conceptos quedan congelados y se habilita la impresión de la Nota de Remisión.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="primary" size="sm" loading={pendingAction === "complete"} disabled={isAssignmentBusy} onClick={handleComplete} className="flex-1">Sí, finalizar orden</Button>
                      <Button type="button" variant="outline" size="sm" disabled={isAssignmentBusy} onClick={() => setConfirmComplete(false)}>Cancelar</Button>
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
                  size="sm"
                  className="w-full sm:w-9 sm:px-0"
                  title={`Imprimir nota de remisión ${workOrder.number}`}
                  aria-label={`Imprimir nota de remisión ${workOrder.number}`}
                  onClick={() => window.open(`/admin/notas/${workOrder.id}/print`, "_blank")}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span className="sm:sr-only">Imprimir Nota de Remisión</span>
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
                  <Button type="button" variant="danger" disabled={!actions.rollback || isAssignmentBusy} onClick={() => setShowRollback(true)}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    Cancelar orden y regresar cotización
                  </Button>
                ) : (
                  <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-status-danger)] p-4">
                    <Label htmlFor="rollback-reason">Motivo de la corrección *</Label>
                    <Input id="rollback-reason" value={rollbackReason} onChange={(event) => setRollbackReason(event.target.value)} disabled={isAssignmentBusy} />
                    <Label htmlFor="rollback-target">Regresar cotización a *</Label>
                    <Select value={rollbackTarget} onValueChange={(value) => setRollbackTarget(value as "SENT" | "DRAFT")} disabled={isAssignmentBusy}>
                      <SelectTrigger id="rollback-target" disabled={isAssignmentBusy}><SelectValue placeholder="Selecciona el estado" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SENT">Enviada</SelectItem>
                        <SelectItem value="DRAFT">Borrador</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button type="button" variant="danger" loading={pendingAction === "rollback"} disabled={isAssignmentBusy} onClick={handleRollback} className="flex-1">Confirmar corrección</Button>
                      <Button type="button" variant="outline" disabled={isAssignmentBusy} onClick={() => setShowRollback(false)}>Cancelar</Button>
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isAssignmentBusy}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
