import { describe, expect, it } from "vitest";
import { QuoteStatus, UserRole, WorkOrderStatus, WorkerKind } from "@/generated/prisma/client";
import {
  assertActiveWorker,
  assertApprovedQuote,
  assertDistinctWorkers,
  assertExecutionCanBeRecorded,
  assertWorkOrderCanBeAssigned,
  assertWorkOrderCanBeChanged,
  assertWorkOrderCanBeCompleted,
  WorkOrderOperationError,
} from "./domain";

describe("work order domain rules", () => {
  it("only allows approved quotes to enter the operational flow", () => {
    expect(() => assertApprovedQuote(QuoteStatus.SENT)).toThrow(WorkOrderOperationError);
    expect(() => assertApprovedQuote(QuoteStatus.DRAFT)).toThrow(WorkOrderOperationError);
    expect(() => assertApprovedQuote(QuoteStatus.APPROVED)).not.toThrow();
  });

  it("keeps assignment, completion, and terminal transitions explicit", () => {
    // Only PLANNED and ASSIGNED can be assigned
    expect(() => assertWorkOrderCanBeAssigned(WorkOrderStatus.PLANNED)).not.toThrow();
    expect(() => assertWorkOrderCanBeAssigned(WorkOrderStatus.ASSIGNED)).not.toThrow();
    expect(() => assertWorkOrderCanBeAssigned(WorkOrderStatus.COMPLETED)).toThrow();

    // Only ASSIGNED can be completed (simplified flow: no IN_PROGRESS step)
    expect(() => assertWorkOrderCanBeCompleted(WorkOrderStatus.ASSIGNED)).not.toThrow();
    expect(() => assertWorkOrderCanBeCompleted(WorkOrderStatus.PLANNED)).toThrow("en proceso");
    expect(() => assertWorkOrderCanBeCompleted(WorkOrderStatus.COMPLETED)).toThrow("en proceso");

    // COMPLETED and CANCELLED are protected against unsafe changes
    expect(() => assertWorkOrderCanBeChanged(WorkOrderStatus.COMPLETED)).toThrow("protegida");
    expect(() => assertWorkOrderCanBeChanged(WorkOrderStatus.CANCELLED)).toThrow("protegida");
    expect(() => assertWorkOrderCanBeChanged(WorkOrderStatus.ASSIGNED)).not.toThrow();
  });

  it("allows recording execution on ASSIGNED or IN_PROGRESS orders (future tracking feature)", () => {
    expect(() => assertExecutionCanBeRecorded(WorkOrderStatus.ASSIGNED)).not.toThrow();
    expect(() => assertExecutionCanBeRecorded(WorkOrderStatus.IN_PROGRESS)).not.toThrow();
    expect(() => assertExecutionCanBeRecorded(WorkOrderStatus.CANCELLED)).toThrow();
    expect(() => assertExecutionCanBeRecorded(WorkOrderStatus.COMPLETED)).toThrow();
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
