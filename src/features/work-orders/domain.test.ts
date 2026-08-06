import { describe, expect, it } from "vitest";
import { QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@prisma/client";
import {
  assertActiveWorker,
  assertApprovedQuote,
  assertCapacityConfirmed,
  assertDistinctWorkers,
  assertExecutionCanBeRecorded,
  assertMasterAvailabilityConfirmed,
  assertWorkOrderCanBeAssigned,
  assertWorkOrderCanBeChanged,
  assertWorkOrderCanBeStarted,
  WorkOrderOperationError,
} from "./domain";

describe("work order domain rules", () => {
  it("only allows approved quotes to enter the operational flow", () => {
    expect(() => assertApprovedQuote(QuoteStatus.SENT)).toThrow(WorkOrderOperationError);
    expect(() => assertApprovedQuote(QuoteStatus.APPROVED)).not.toThrow();
  });

  it("keeps waiting, assignment, progress, and terminal transitions explicit", () => {
    expect(() => assertWorkOrderCanBeAssigned(WorkOrderStatus.PLANNED)).not.toThrow();
    expect(() => assertWorkOrderCanBeAssigned(WorkOrderStatus.ASSIGNED)).toThrow();
    expect(() => assertWorkOrderCanBeStarted(WorkOrderStatus.ASSIGNED)).not.toThrow();
    expect(() => assertWorkOrderCanBeStarted(WorkOrderStatus.PLANNED)).toThrow();
    expect(() => assertExecutionCanBeRecorded(WorkOrderStatus.IN_PROGRESS)).not.toThrow();
    expect(() => assertExecutionCanBeRecorded(WorkOrderStatus.CANCELLED)).toThrow();
    expect(() => assertWorkOrderCanBeChanged(WorkOrderStatus.COMPLETED)).toThrow("protegida");
  });

  it("requires both operational confirmations", () => {
    expect(() => assertCapacityConfirmed(false)).toThrow("espacio");
    expect(() => assertMasterAvailabilityConfirmed(false)).toThrow("disponibilidad");
    expect(() => assertCapacityConfirmed(true)).not.toThrow();
    expect(() => assertMasterAvailabilityConfirmed(true)).not.toThrow();
  });

  it("requires one distinct master and rejects duplicate workers", () => {
    expect(() => assertDistinctWorkers("master-1", ["helper-1"])).not.toThrow();
    expect(() => assertDistinctWorkers("master-1", ["master-1"])).toThrow();
    expect(() => assertDistinctWorkers("master-1", ["helper-1", "helper-1"])).toThrow();
  });

  it("validates active worker classification", () => {
    const master = { id: "master-1", role: UserRole.WORKER, workerKind: WorkerKind.MASTER, isActive: true };
    expect(() => assertActiveWorker(master, WorkerKind.MASTER)).not.toThrow();
    expect(() => assertActiveWorker({ ...master, isActive: false }, WorkerKind.MASTER)).toThrow();
    expect(() => assertActiveWorker({ ...master, workerKind: WorkerKind.HELPER }, WorkerKind.MASTER)).toThrow();
  });
});
