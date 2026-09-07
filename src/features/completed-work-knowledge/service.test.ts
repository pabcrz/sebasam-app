import { KnowledgeIndexState, QuoteItemType, WorkOrderStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    workOrder: { findUnique: vi.fn() },
    completedWorkKnowledgeSource: { updateMany: vi.fn() },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  buildCompletedWorkKnowledgeContext,
  ineligibleCompletedWorkKnowledge,
  synchronizeCompletedWorkKnowledge,
} from "./service";

const provider = { embedText: vi.fn() };

function completedWorkOrder() {
  return {
    id: "work-order-1",
    number: "T-0907-01",
    status: WorkOrderStatus.COMPLETED,
    completedAt: new Date("2026-09-07T18:00:00.000Z"),
    isSpecial: false,
    specialAssigneeName: null,
    assignments: [{ worker: { displayName: "Ana Master" } }],
    quote: {
      vehicle: { plate: "ABC-123", brand: "Nissan", model: "NP300" },
      vehicleSnapshot: null,
      sections: [{
        isAuthorized: true,
        items: [{ id: "quote-item-1", type: QuoteItemType.LABOR, description: "Replace bushings" }],
      }],
      items: [],
    },
  };
}

function mockRawResults(...results: unknown[]) {
  vi.mocked(prisma.$queryRaw).mockImplementation(async () => results.shift() as never);
}

describe("completed work knowledge synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(completedWorkOrder() as never);
    provider.embedText.mockResolvedValue(new Array(1536).fill(0.25));
    vi.mocked(prisma.$executeRaw).mockResolvedValue(1 as never);
  });

  it("projects eligible completed concepts without copying mutable financial data", async () => {
    mockRawResults(
      [{ id: "source-1", indexState: KnowledgeIndexState.PENDING, contextHash: "new-context" }],
      [{ id: "source-1" }],
    );

    const result = await synchronizeCompletedWorkKnowledge("work-order-1", provider);

    expect(result).toEqual({ indexed: 1, failed: 0, skipped: 0 });
    expect(provider.embedText).toHaveBeenCalledWith(expect.stringContaining("Work order T-0907-01"));
    const context = provider.embedText.mock.calls[0][0] as string;
    expect(context).toContain("Completed on 2026-09-07");
    expect(context).toContain("Nissan NP300, Plate ABC-123");
    expect(context).toContain("Responsible worker Ana Master");
    expect(context).toContain("Concept type LABOR");
    expect(context).toContain("Description Replace bushings");
    expect(context).not.toMatch(/price|total|payment|payroll|commission|\$/i);
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
    const persistenceQuery = vi.mocked(prisma.$queryRaw).mock.calls[0]![0] as { strings: readonly string[] };
    const embeddingWriteQuery = vi.mocked(prisma.$executeRaw).mock.calls[0]![0] as { strings: readonly string[] };
    expect(persistenceQuery.strings.join(" ")).toContain("FOR SHARE");
    expect(persistenceQuery.strings.join(" ")).toContain('"contextHash" <> EXCLUDED."contextHash"');
    expect(embeddingWriteQuery.strings.join(" ")).toContain('"indexState" = CAST(');
    expect(embeddingWriteQuery.strings.join(" ")).toContain('"contextHash" = ');
  });

  it("does not re-embed an unchanged indexed source on retry", async () => {
    mockRawResults([
      { id: "source-1", indexState: KnowledgeIndexState.INDEXED, contextHash: "unchanged-context" },
    ]);

    const retried = await synchronizeCompletedWorkKnowledge("work-order-1", provider);

    expect(retried).toEqual({ indexed: 0, failed: 0, skipped: 1 });
    expect(provider.embedText).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("marks every source ineligible after a rollback", async () => {
    const tx = { completedWorkKnowledgeSource: { updateMany: vi.fn() } };
    await ineligibleCompletedWorkKnowledge("work-order-1", tx as never);

    expect(tx.completedWorkKnowledgeSource.updateMany).toHaveBeenCalledWith({
      where: { workOrderId: "work-order-1" },
      data: { indexState: KnowledgeIndexState.INELIGIBLE, lastIndexError: null },
    });
  });

  it("persists embedding failures for recovery without throwing", async () => {
    mockRawResults(
      [{ id: "source-1", indexState: KnowledgeIndexState.PENDING, contextHash: "new-context" }],
      [{ id: "source-1" }],
    );
    provider.embedText.mockRejectedValueOnce(new Error("Gemini unavailable"));

    await expect(synchronizeCompletedWorkKnowledge("work-order-1", provider))
      .resolves.toEqual({ indexed: 0, failed: 1, skipped: 0 });
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });

  it("includes legacy quote items without a section", async () => {
    const completed = completedWorkOrder();
    const workOrder = {
      ...completed,
      quote: {
        ...completed.quote,
        sections: [],
        items: [{ id: "legacy-item-1", type: QuoteItemType.MATERIAL, description: "Legacy bracket" }],
      },
    };
    vi.mocked(prisma.workOrder.findUnique).mockResolvedValue(workOrder as never);
    mockRawResults(
      [{ id: "source-1", indexState: KnowledgeIndexState.PENDING, contextHash: "legacy-context" }],
      [{ id: "source-1" }],
    );

    await synchronizeCompletedWorkKnowledge("work-order-1", provider);

    expect(provider.embedText).toHaveBeenCalledWith(expect.stringContaining("Description Legacy bracket"));
  });

  it("does not double-index a source already claimed by another synchronizer", async () => {
    mockRawResults(
      [{ id: "source-1", indexState: KnowledgeIndexState.PENDING, contextHash: "new-context" }],
      [],
    );

    await expect(synchronizeCompletedWorkKnowledge("work-order-1", provider))
      .resolves.toEqual({ indexed: 0, failed: 0, skipped: 1 });

    expect(provider.embedText).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("uses the Mexico City operational day in the searchable context", () => {
    const context = buildCompletedWorkKnowledgeContext({
      orderNumber: "T-0907-01",
      completedAt: new Date("2026-09-07T02:00:00.000Z"),
      vehicle: null,
      vehicleSnapshot: null,
      responsibleWorker: "Ana Master",
      type: "LABOR",
      description: "Replace bushings",
    });

    expect(context).toContain("Completed on 2026-09-06");
  });
});
