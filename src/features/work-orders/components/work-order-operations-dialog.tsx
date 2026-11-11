"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import type { QuoteOperationKind } from "@/generated/prisma/enums";
import type { QuoteStatus, UserRole, WorkOrderStatus } from "@/generated/prisma/client";
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
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
import type { ButtonVariant } from "@/components/ui";

import { useRouter } from "next/navigation";
import { WorkOrderAdvanceDialog } from "./work-order-advance-dialog";

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
  convert?: (input: unknown) => Promise<ActionResult>;
  assign?: (input: unknown) => Promise<ActionResult>;
  complete?: (input: unknown) => Promise<ActionResult>;
  rollback?: (input: unknown) => Promise<ActionResult>;
  ensureWaiting?: () => Promise<ActionResult>;
  start?: (input: unknown) => Promise<ActionResult>;
  recordExecution?: (input: unknown) => Promise<ActionResult>;
  removeExecution?: (executionRecordId: string) => Promise<ActionResult>;
};

type WorkOrderOperationsDialogProps = {
  quoteId?: string;
  quoteOperation?: QuoteOperationKind;
  hasPayableNote?: boolean;
  quoteNumber: string;
  quoteStatus: QuoteStatus;
  workOrder: WorkOrder | null;
  workers?: WorkerOption[];
  actions?: WorkOrderActions;
  triggerIconOnlyMobile?: boolean;
  triggerVariant?: ButtonVariant;
  triggerClassName?: string;
  alwaysRenderTrigger?: boolean;
  triggerDisabled?: boolean;
  triggerFlowLabel?: string;
};

const noopActions: WorkOrderActions = {
  assign: async () => ({ success: false, error: "Acción no disponible." }),
  complete: async () => ({ success: false, error: "Acción no disponible." }),
};

export function WorkOrderOperationsDialog({
  quoteId,
  quoteOperation = "WORK",
  hasPayableNote = false,
  quoteNumber,
  quoteStatus,
  workOrder,
  workers = [],
  actions = noopActions,
  triggerIconOnlyMobile = false,
  triggerVariant = "outline",
  triggerClassName,
  alwaysRenderTrigger = false,
  triggerDisabled = false,
  triggerFlowLabel,
}: WorkOrderOperationsDialogProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [isPending, startTransition] = React.useTransition();
  const [pendingAction, setPendingAction] = React.useState<"assign" | "complete" | "rollback" | null>(null);
  const [customerAccepted, setCustomerAccepted] = React.useState(true);
  const [acceptanceReason, setAcceptanceReason] = React.useState("");
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
  const [advanceOpen, setAdvanceOpen] = React.useState(false);

  const eligibleWorkers = workers.filter((worker) => worker.role === "WORKER" && worker.workerKind !== null);
  const masters = eligibleWorkers.filter((worker) => worker.workerKind === "MASTER");
  const helpers = eligibleWorkers.filter((worker) => worker.workerKind === "HELPER");
  const assignedWorkers = workOrder?.assignments ?? [];

  const runAction = React.useCallback(
    (
      action: () => Promise<ActionResult>,
      kind: "assign" | "complete" | "rollback",
      onSuccess?: () => void,
    ) => {
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
            if (onSuccess) onSuccess();
            else router.refresh();
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

  const handleConvert = () => {
    if (!quoteId || !actions.convert) return;
    runAction(
      () => actions.convert!({ quoteId, operation: quoteOperation }),
      "assign",
      quoteOperation === "SALE" ? () => router.push("/admin/notas") : undefined,
    );
  };

  const handleAssign = () => {
    const assign = actions.assign;
    if (!assign) return;
    const needsAcceptance = !workOrder && quoteStatus !== "APPROVED" && quoteOperation === "WORK";
    if (needsAcceptance && customerAccepted === false && acceptanceReason.trim().length < 3) {
      setError("Indica el motivo para continuar sin aceptación formal.");
      return;
    }
    const acceptanceInput = needsAcceptance
      ? { customerAccepted, acceptanceReason: acceptanceReason.trim() }
      : {};
    if (isSpecial) {
      runAction(() => assign({ isSpecial: true, ...acceptanceInput }), "assign");
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
          ...acceptanceInput,
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

  if (!alwaysRenderTrigger && !(["DRAFT", "SENT", "APPROVED"] as QuoteStatus[]).includes(quoteStatus)) return null;

  const isAssigned = workOrder?.status === "ASSIGNED";
  const isCompleted = workOrder?.status === "COMPLETED";
  if (!alwaysRenderTrigger && hasPayableNote && !workOrder) return null;
  const isSaleIntent = !workOrder && !hasPayableNote && quoteOperation === "SALE";
  const canRollback = workOrder && ["PLANNED", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(workOrder.status);
  const isAssignmentBusy = pendingAction !== null || isPending;

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size="sm"
        ref={triggerRef}
        className={triggerClassName ?? (triggerIconOnlyMobile ? "h-10 w-10 px-0 sm:h-9 sm:w-auto sm:px-3" : "w-full")}
        onClick={(event) => {
          event.stopPropagation();
          setError(null);
          setConfirmComplete(false);
          setShowRollback(false);
          setCustomerAccepted(true);
          setAcceptanceReason("");
          setOpen(true);
        }}
        aria-label={isAssignmentBusy ? "Asignando trabajo..." : triggerFlowLabel ? `${triggerFlowLabel} para cotización ${quoteNumber}` : workOrder ? `Gestionar orden de trabajo ${workOrder.number}` : isSaleIntent ? `Crear nota de venta para cotización ${quoteNumber}` : `Gestionar trabajo de cotización ${quoteNumber}`}
        title={triggerFlowLabel ? `${triggerFlowLabel} para cotización ${quoteNumber}` : workOrder ? `Gestionar orden de trabajo ${workOrder.number}` : isSaleIntent ? `Crear nota de venta para cotización ${quoteNumber}` : `Gestionar trabajo de cotización ${quoteNumber}`}
        disabled={triggerDisabled || isAssignmentBusy}
        loading={isAssignmentBusy}
      >
        {!isAssignmentBusy ? <Icon name="clipboard" className="h-5 w-5" aria-hidden="true" /> : null}
        {!isAssignmentBusy ? <span className={triggerIconOnlyMobile ? "sr-only sm:not-sr-only" : undefined}>{triggerFlowLabel ?? (isCompleted ? "Gestionar orden" : isAssigned ? "Gestionar trabajo" : isSaleIntent ? "Crear nota de venta" : "Asignar trabajo")}</span> : null}
      </Button>

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!isAssignmentBusy) setOpen(nextOpen); }}>
        <DialogContent
          className="max-w-xl"
          onEscapeKeyDown={(event) => { if (isAssignmentBusy) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (isAssignmentBusy) event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4"
              aria-label="Cerrar diálogo de orden de trabajo"
              title="Cerrar"
              disabled={isAssignmentBusy}
            >
              <Icon name="close" className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>
              {workOrder ? `Orden de trabajo ${workOrder.number}` : quoteOperation === "SALE" ? `Crear nota de venta — Cotización ${quoteNumber}` : `Asignar trabajo — Cotización ${quoteNumber}`}
            </DialogTitle>
            <DialogDescription>
              {isCompleted
                ? `Orden finalizada para la cotización ${quoteNumber}. Los conceptos están congelados.`
                : isAssigned
                ? `Trabajo en proceso para la cotización ${quoteNumber}.`
                : quoteOperation === "SALE"
                ? "Crea una nota de venta con esta cotización. Esta operación no crea una orden de trabajo."
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

            {quoteOperation === "SALE" && !workOrder && !hasPayableNote && quoteId && actions.convert ? (
              <section className="grid gap-4">
                <p className="text-sm text-[var(--color-text-muted)]">La venta solo admite conceptos de material o refacciones y no crea una orden de trabajo.</p>
                <Button type="button" variant="primary" loading={pendingAction === "assign"} disabled={isAssignmentBusy} onClick={handleConvert}>
                  {pendingAction === "assign" ? "Creando nota de venta..." : "Crear nota de venta"}
                </Button>
              </section>
            ) : null}

            {/* Section 1: Unassigned or Planned -> Assign form */}
            {(!workOrder || workOrder.status === "PLANNED") && quoteOperation === "WORK" ? (
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

                {!workOrder && quoteStatus !== "APPROVED" && quoteOperation === "WORK" ? (
                   <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
                     <p className="text-sm font-medium text-[var(--color-text-main)]">¿El cliente aceptó la cotización?</p>
                     <div className="flex gap-2">
                       <Button type="button" variant={customerAccepted === true ? "primary" : "outline"} onClick={() => { setCustomerAccepted(true); setAcceptanceReason(""); }} disabled={isAssignmentBusy}>Sí, aceptó</Button>
                       <Button type="button" variant={customerAccepted === false ? "primary" : "outline"} onClick={() => setCustomerAccepted(false)} disabled={isAssignmentBusy}>No, fue una excepción</Button>
                     </div>
                     {customerAccepted === false ? (
                       <Input aria-label="Motivo de aceptación excepcional" value={acceptanceReason} onChange={(event) => setAcceptanceReason(event.target.value)} placeholder="Motivo (por ejemplo, aceptación verbal)" disabled={isAssignmentBusy} />
                     ) : null}
                   </div>
                 ) : null}
                 <p role="status" className="sr-only">{pendingAction === "assign" ? "Asignando..." : ""}</p>
                <Button type="button" variant="primary" loading={pendingAction === "assign"} disabled={!actions.assign || isAssignmentBusy} onClick={handleAssign}>
                  {pendingAction !== "assign" ? <Icon name="user-check" className="h-4 w-4" aria-hidden="true" /> : null}
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
                        {pendingAction !== "assign" ? <Icon name="user-check" className="h-4 w-4" aria-hidden="true" /> : null}
                        {pendingAction === "assign" ? "Asignando..." : "Confirmar reasignación"}
                      </Button>
                      <Button type="button" variant="outline" size="sm" disabled={isAssignmentBusy} onClick={() => setReassigning(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}

                {!reassigning && !confirmComplete ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    {!workOrder.isSpecial ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isAssignmentBusy}
                        onClick={() => setAdvanceOpen(true)}
                      >
                        <Icon name="coins" className="h-4 w-4" aria-hidden="true" />
                        Avance de mano de obra
                      </Button>
                    ) : null}
                    <Button type="button" variant="primary" disabled={isAssignmentBusy} onClick={() => setConfirmComplete(true)} className="flex-1">
                      <Icon name="check-circle" className="h-4 w-4" aria-hidden="true" />
                      Finalizar trabajo
                    </Button>
                  </div>
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
                  Trabajo completado. Podes generar la Nota de Remisión desde el panel de Notas.
                </p>
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
                    <Icon name="undo" className="h-4 w-4" aria-hidden="true" />
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
      {workOrder && !workOrder.isSpecial ? (
        <WorkOrderAdvanceDialog
          workOrderId={workOrder.id}
          workOrderNumber={workOrder.number}
          open={advanceOpen}
          onOpenChange={setAdvanceOpen}
        />
      ) : null}
    </>
  );
}
