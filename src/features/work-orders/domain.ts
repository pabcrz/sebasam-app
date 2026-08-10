import { QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@prisma/client";

export class WorkOrderOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkOrderOperationError";
  }
}

export class WorkerUnavailableError extends Error {
  constructor() {
    super("Only active workers with a classification can receive assignments or execution records.");
    this.name = "WorkerUnavailableError";
  }
}

type WorkerProfile = {
  id: string;
  role: UserRole;
  workerKind: WorkerKind | null;
  isActive: boolean;
};

export function assertApprovedQuote(status: QuoteStatus) {
  if (status !== QuoteStatus.APPROVED) {
    throw new WorkOrderOperationError("Solo una cotización aceptada puede tener una orden de trabajo activa.");
  }
}

export function assertWorkOrderCanBeAssigned(status: WorkOrderStatus) {
  if (status !== WorkOrderStatus.PLANNED && status !== WorkOrderStatus.ASSIGNED) {
    throw new WorkOrderOperationError("La orden solo se puede asignar o reasignar si está en proceso.");
  }
}

export function assertWorkOrderCanBeCompleted(status: WorkOrderStatus) {
  if (status !== WorkOrderStatus.ASSIGNED) {
    throw new WorkOrderOperationError("La orden debe estar en proceso para poder finalizarse.");
  }
}

export function assertWorkOrderCanBeChanged(status: WorkOrderStatus) {
  if (status === WorkOrderStatus.COMPLETED || status === WorkOrderStatus.CANCELLED) {
    throw new WorkOrderOperationError("La orden está protegida contra cambios inseguros.");
  }
}

export function assertExecutionCanBeRecorded(status: WorkOrderStatus) {
  if (status !== WorkOrderStatus.IN_PROGRESS && status !== WorkOrderStatus.ASSIGNED) {
    throw new WorkOrderOperationError("La orden no permite registrar ejecución en este estado.");
  }
}

export function assertActiveWorker(worker: WorkerProfile, kind: WorkerKind) {
  if (worker.role !== UserRole.WORKER || !worker.isActive || worker.workerKind !== kind) {
    throw new WorkOrderOperationError(
      kind === WorkerKind.MASTER
        ? "El maestro debe ser un trabajador activo con clasificación Maestro."
        : "Los ayudantes deben ser trabajadores activos con clasificación Ayudante.",
    );
  }
}

export function assertDistinctWorkers(masterId: string, helperIds: string[]) {
  if (new Set(helperIds).size !== helperIds.length || helperIds.includes(masterId)) {
    throw new WorkOrderOperationError("El maestro no puede repetirse como ayudante.");
  }
}
