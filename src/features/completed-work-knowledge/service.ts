import { createHash, randomUUID } from "node:crypto";
import { KnowledgeIndexState, Prisma, WorkerKind, WorkOrderStatus } from "@/generated/prisma/client";
import { createGeminiProvider, type HistoricalProvider } from "@/features/historical/provider";
import { mexicoCityCalendarDate } from "@/features/quotes/lib/operational-date";
import { prisma } from "@/lib/prisma";

type EmbeddingProvider = Pick<HistoricalProvider, "embedText">;

type KnowledgeSource = {
  quoteItemId: string;
  originKey: string;
  contextText: string;
  contextHash: string;
};

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function formatCompletionDate(completedAt: Date): string {
  return mexicoCityCalendarDate(completedAt);
}

function vehicleContext(
  vehicle: { plate: string | null; brand: string | null; model: string | null } | null,
  vehicleSnapshot: unknown,
): string {
  const snapshot = vehicleSnapshot && typeof vehicleSnapshot === "object" && !Array.isArray(vehicleSnapshot)
    ? vehicleSnapshot as Record<string, unknown>
    : {};
  const plate = vehicle?.plate ?? (typeof snapshot.plate === "string" ? snapshot.plate : null);
  const brand = vehicle?.brand ?? (typeof snapshot.brand === "string" ? snapshot.brand : null);
  const model = vehicle?.model ?? (typeof snapshot.model === "string" ? snapshot.model : null);
  const unit = [brand, model].filter(Boolean).join(" ");
  return [unit, plate ? `Plate ${plate}` : ""].filter(Boolean).join(", ") || "Unspecified unit";
}

export function buildCompletedWorkKnowledgeContext(input: {
  orderNumber: string;
  completedAt: Date;
  vehicle: { plate: string | null; brand: string | null; model: string | null } | null;
  vehicleSnapshot: unknown;
  responsibleWorker: string;
  type: string;
  description: string;
}): string {
  return [
    `Work order ${input.orderNumber}`,
    `Completed on ${formatCompletionDate(input.completedAt)}`,
    `Unit ${vehicleContext(input.vehicle, input.vehicleSnapshot)}`,
    `Responsible worker ${input.responsibleWorker}`,
    `Concept type ${input.type}`,
    `Description ${input.description}`,
  ].join(". ");
}

function contextHash(contextText: string): string {
  return createHash("sha256").update(contextText).digest("hex");
}

function sourceError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadCompletedWorkSources(workOrderId: string): Promise<KnowledgeSource[] | null> {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      quote: {
        include: {
          vehicle: { select: { plate: true, brand: true, model: true } },
          sections: {
            where: { isAuthorized: true },
            include: { items: { select: { id: true, type: true, description: true } } },
          },
          items: {
            where: { sectionId: null },
            select: { id: true, type: true, description: true },
          },
        },
      },
      assignments: {
        where: { worker: { workerKind: WorkerKind.MASTER } },
        include: { worker: { select: { displayName: true } } },
      },
    },
  });

  if (!workOrder || workOrder.status !== WorkOrderStatus.COMPLETED || !workOrder.completedAt) {
    return null;
  }

  const responsibleWorker = workOrder.isSpecial
    ? (workOrder.specialAssigneeName?.trim() || "Workshop")
    : (workOrder.assignments[0]?.worker.displayName || "Unassigned");

  const eligibleItems = [
    ...workOrder.quote.sections.flatMap((section) => section.items),
    ...workOrder.quote.items,
  ];

  return eligibleItems.map((item) => {
    const text = buildCompletedWorkKnowledgeContext({
      orderNumber: workOrder.number,
      completedAt: workOrder.completedAt!,
      vehicle: workOrder.quote.vehicle,
      vehicleSnapshot: workOrder.quote.vehicleSnapshot,
      responsibleWorker,
      type: item.type,
      description: item.description,
    });
    return {
      quoteItemId: item.id,
      originKey: `completed-work:${workOrder.id}:${item.id}`,
      contextText: text,
      contextHash: contextHash(text),
    };
  });
}

export async function ineligibleCompletedWorkKnowledge(
  workOrderId: string,
  client: Pick<Prisma.TransactionClient, "completedWorkKnowledgeSource"> = prisma,
): Promise<void> {
  await client.completedWorkKnowledgeSource.updateMany({
    where: { workOrderId },
    data: {
      indexState: KnowledgeIndexState.INELIGIBLE,
      lastIndexError: null,
    },
  });
}

type PersistedSource = {
  id: string;
  indexState: KnowledgeIndexState;
  contextHash: string;
};

async function persistEligibleSource(
  workOrderId: string,
  source: KnowledgeSource,
): Promise<PersistedSource | null> {
  const persisted = await prisma.$queryRaw<PersistedSource[]>(Prisma.sql`
    INSERT INTO "completed_work_knowledge_sources" (
      "id", "originKey", "workOrderId", "quoteItemId", "contextText", "contextHash", "indexState", "updatedAt"
    )
    SELECT
      ${randomUUID()}, ${source.originKey}, ${workOrderId}, ${source.quoteItemId}, ${source.contextText}, ${source.contextHash},
      CAST(${KnowledgeIndexState.PENDING} AS "KnowledgeIndexState"), CURRENT_TIMESTAMP
    FROM "WorkOrder"
    WHERE "id" = ${workOrderId}
      AND "status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
    FOR SHARE
    ON CONFLICT ("workOrderId", "quoteItemId") DO UPDATE
    SET
      "originKey" = EXCLUDED."originKey",
      "contextText" = EXCLUDED."contextText",
      "embedding" = CASE
        WHEN "completed_work_knowledge_sources"."contextHash" <> EXCLUDED."contextHash" THEN NULL
        ELSE "completed_work_knowledge_sources"."embedding"
      END,
      "contextHash" = EXCLUDED."contextHash",
      "indexState" = CASE
        WHEN "completed_work_knowledge_sources"."contextHash" <> EXCLUDED."contextHash"
          THEN CAST(${KnowledgeIndexState.PENDING} AS "KnowledgeIndexState")
        ELSE "completed_work_knowledge_sources"."indexState"
      END,
      "lastIndexError" = CASE
        WHEN "completed_work_knowledge_sources"."contextHash" <> EXCLUDED."contextHash" THEN NULL
        ELSE "completed_work_knowledge_sources"."lastIndexError"
      END,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE EXISTS (
      SELECT 1 FROM "WorkOrder"
      WHERE "id" = ${workOrderId}
        AND "status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
    )
    RETURNING "id", "indexState", "contextHash"
  `);

  return persisted[0] ?? null;
}

async function claimEligibleSource(source: PersistedSource): Promise<boolean> {
  const claimed = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "completed_work_knowledge_sources"
    SET
      "indexState" = CAST(${KnowledgeIndexState.INDEXING} AS "KnowledgeIndexState"),
      "indexingAttempts" = "indexingAttempts" + 1,
      "lastAttemptedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${source.id}
      AND "contextHash" = ${source.contextHash}
      AND (
        "indexState" IN (
          CAST(${KnowledgeIndexState.PENDING} AS "KnowledgeIndexState"),
          CAST(${KnowledgeIndexState.FAILED} AS "KnowledgeIndexState")
        )
        OR (
          "indexState" = CAST(${KnowledgeIndexState.INDEXING} AS "KnowledgeIndexState")
          AND "lastAttemptedAt" < CURRENT_TIMESTAMP - INTERVAL '10 minutes'
        )
      )
      AND EXISTS (
        SELECT 1 FROM "WorkOrder"
        WHERE "id" = "completed_work_knowledge_sources"."workOrderId"
          AND "status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
      )
    RETURNING "id"
  `);

  return claimed.length === 1;
}

export async function prepareCompletedWorkKnowledge(workOrderId: string): Promise<number> {
  const sources = await loadCompletedWorkSources(workOrderId);
  if (!sources) {
    await ineligibleCompletedWorkKnowledge(workOrderId);
    return 0;
  }

  let persisted = 0;
  for (const source of sources) {
    if (await persistEligibleSource(workOrderId, source)) persisted += 1;
  }
  return persisted;
}

/**
 * Synchronizes the completed-work retrieval projection independently from the
 * operational transaction. A provider failure is persisted per source and is
 * intentionally not rethrown to a lifecycle action.
 */
export async function synchronizeCompletedWorkKnowledge(
  workOrderId: string,
  providedProvider?: EmbeddingProvider,
): Promise<{ indexed: number; failed: number; skipped: number }> {
  const sources = await loadCompletedWorkSources(workOrderId);
  if (!sources) {
    await ineligibleCompletedWorkKnowledge(workOrderId);
    return { indexed: 0, failed: 0, skipped: 0 };
  }

  let indexed = 0;
  let failed = 0;
  let skipped = 0;
  let provider = providedProvider;

  for (const source of sources) {
    const existing = await persistEligibleSource(workOrderId, source);
    if (!existing || existing.indexState === KnowledgeIndexState.INDEXED) {
      skipped += 1;
      continue;
    }

    if (!await claimEligibleSource(existing)) {
      skipped += 1;
      continue;
    }

    const attemptedAt = new Date();
    try {
      provider ??= createGeminiProvider();
      const embedding = await provider.embedText(source.contextText);
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "completed_work_knowledge_sources"
        SET "embedding" = CAST(${vectorLiteral(embedding)} AS vector(1536)),
            "indexState" = CAST(${KnowledgeIndexState.INDEXED} AS "KnowledgeIndexState"),
            "indexingAttempts" = "indexingAttempts" + 1,
            "lastIndexError" = NULL,
            "lastAttemptedAt" = ${attemptedAt},
            "indexedAt" = ${attemptedAt},
            "updatedAt" = ${attemptedAt}
        WHERE "id" = ${existing.id}
          AND "contextHash" = ${existing.contextHash}
          AND "indexState" = CAST(${KnowledgeIndexState.INDEXING} AS "KnowledgeIndexState")
          AND EXISTS (
            SELECT 1 FROM "WorkOrder"
            WHERE "id" = "completed_work_knowledge_sources"."workOrderId"
              AND "status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
          )
      `);
      indexed += 1;
    } catch (error) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE "completed_work_knowledge_sources"
        SET
          "indexState" = CAST(${KnowledgeIndexState.FAILED} AS "KnowledgeIndexState"),
          "lastIndexError" = ${sourceError(error)},
          "lastAttemptedAt" = ${attemptedAt},
          "updatedAt" = ${attemptedAt}
        WHERE "id" = ${existing.id}
          AND "contextHash" = ${existing.contextHash}
          AND "indexState" = CAST(${KnowledgeIndexState.INDEXING} AS "KnowledgeIndexState")
          AND EXISTS (
            SELECT 1 FROM "WorkOrder"
            WHERE "id" = "completed_work_knowledge_sources"."workOrderId"
              AND "status" = CAST(${WorkOrderStatus.COMPLETED} AS "WorkOrderStatus")
          )
      `);
      failed += 1;
    }
  }

  return { indexed, failed, skipped };
}
