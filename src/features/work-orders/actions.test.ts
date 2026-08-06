import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { assignWorker, recordExecution, WorkerUnavailableError } from "./actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findFirst: vi.fn(),
    },
    workAssignment: {
      create: vi.fn(),
    },
    executionRecord: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn(),
}));

vi.mock("@/features/quotes/lib/sequence", () => ({
  nextWorkOrderNumber: vi.fn(),
}));

describe("work order worker validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockResolvedValue({
      profile: { id: "admin-1" },
    });
    (prisma.userProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "worker-1" });
    (prisma.workAssignment.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "assignment-1" });
    (prisma.executionRecord.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "record-1" });
  });

  it("rejects inactive workers for new assignments", async () => {
    (prisma.userProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      assignWorker({ workOrderId: "wo-1", workerId: "11111111-1111-4111-8111-111111111111" }),
    ).rejects.toBeInstanceOf(WorkerUnavailableError);
    expect(prisma.workAssignment.create).not.toHaveBeenCalled();
  });

  it("allows active workers to receive assignments", async () => {
    await assignWorker({ workOrderId: "wo-1", workerId: "11111111-1111-4111-8111-111111111111" });

    expect(prisma.workAssignment.create).toHaveBeenCalledWith({
      data: {
        workOrderId: "wo-1",
        workerId: "11111111-1111-4111-8111-111111111111",
      },
    });
  });

  it("rejects inactive workers for execution records", async () => {
    (prisma.userProfile.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      recordExecution({
        workOrderId: "wo-1",
        workerId: "11111111-1111-4111-8111-111111111111",
        summary: "Cambio de pieza",
      }),
    ).rejects.toBeInstanceOf(WorkerUnavailableError);
    expect(prisma.executionRecord.create).not.toHaveBeenCalled();
  });

  it("requires an operational role before validating worker assignments", async () => {
    (requireOperationalRole as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Unauthorized"));

    await expect(
      assignWorker({ workOrderId: "wo-1", workerId: "11111111-1111-4111-8111-111111111111" }),
    ).rejects.toThrow("Unauthorized");
    expect(prisma.userProfile.findFirst).not.toHaveBeenCalled();
  });
});
