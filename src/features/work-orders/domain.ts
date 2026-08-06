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
    throw new WorkOrderOperationError("Solo una cotización aceptada puede entrar a espera.");
  }
}

export function assertWorkOrderCanBeAssigned(status: WorkOrderStatus) {
  if (status !== WorkOrderStatus.PLANNED) {
    throw new WorkOrderOperationError("La orden solo se puede asignar cuando está en espera.");
  }
}

export function assertWorkOrderCanBeStarted(status: WorkOrderStatus) {
  if (status !== WorkOrderStatus.ASSIGNED) {
    throw new WorkOrderOperationError("La orden debe tener una asignación antes de iniciar.");
  }
}

export function assertExecutionCanBeRecorded(status: WorkOrderStatus) {
  if (status !== WorkOrderStatus.IN_PROGRESS) {
    throw new WorkOrderOperationError("La orden no permite registrar ejecución en este estado.");
  }
}

export function assertWorkOrderCanBeChanged(status: WorkOrderStatus) {
  if (status === WorkOrderStatus.COMPLETED || status === WorkOrderStatus.CANCELLED) {
    throw new WorkOrderOperationError("La orden está protegida contra cambios inseguros.");
  }
}

export function assertCapacityConfirmed(confirmed: boolean) {
  if (!confirmed) {
    throw new WorkOrderOperationError("Confirma que existe espacio disponible en el taller.");
  }
}

export function assertMasterAvailabilityConfirmed(confirmed: boolean) {
  if (!confirmed) {
    throw new WorkOrderOperationError("Confirma la disponibilidad del maestro.");
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
