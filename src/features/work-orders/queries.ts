import { AssignmentStatus, PaymentStatus, Prisma, SettlementAgreementStatus, WorkerKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { assertOperationalClosureQuote } from "./operational-validation";
import { WorkOrderOperationError } from "./domain";
export { listActiveWorkers } from "@/features/workers/queries";

const workOrderInclude = {
  quote: {
    include: {
      customer: true,
      customerContact: true,
      customerFiscalProfile: true,
      vehicle: true,
      items: { orderBy: { sortOrder: "asc" as const } },
      sections: { orderBy: { sortOrder: "asc" as const }, include: { items: { orderBy: { sortOrder: "asc" as const } } } },
    },
  },
  assignments: {
    where: { status: { not: "CANCELLED" as const } },
    include: { worker: true },
  },
} as const;

const completedWorkOrderInclude = {
  ...workOrderInclude,
  quote: {
    ...workOrderInclude.quote,
    include: {
      ...workOrderInclude.quote.include,
      sharedQuotes: {
        where: { isCanonical: true, revokedAt: null },
        select: { id: true },
      },
    },
  },
} as const;

function serializeWorkOrder<
  T extends {
    quote: {
      subtotalCents: unknown;
      taxCents: unknown;
      totalCents: unknown;
      items: Array<{
        quantity: unknown;
        unitPriceCents: unknown;
        totalCents: unknown;
      }>;
      sections?: Array<{ items: Array<{ quantity: unknown; unitPriceCents: unknown; totalCents: unknown }> }>;
    };
  },
>(workOrder: T) {
  return {
    ...workOrder,
    quote: {
      ...workOrder.quote,
      subtotalCents: workOrder.quote.subtotalCents == null ? null : Number(workOrder.quote.subtotalCents),
      taxCents: workOrder.quote.taxCents == null ? null : Number(workOrder.quote.taxCents),
      totalCents: workOrder.quote.totalCents == null ? null : Number(workOrder.quote.totalCents),
      items: workOrder.quote.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
        totalCents: item.totalCents == null ? null : Number(item.totalCents),
      })),
      sections: workOrder.quote.sections?.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unitPriceCents: item.unitPriceCents == null ? null : Number(item.unitPriceCents),
          totalCents: item.totalCents == null ? null : Number(item.totalCents),
        })),
      })),
    },
  };
}

/** Returns all work orders for the admin list view (all statuses). */
export async function listWorkOrders() {
  await requireOperationalRole();

  const workOrders = await prisma.workOrder.findMany({
    include: workOrderInclude,
    orderBy: { createdAt: "desc" },
  });

  return workOrders.map(serializeWorkOrder);
}

/** Returns active work orders shown in the Trabajos section. */
export async function listActiveWorkOrders() {
  await requireOperationalRole();

  const workOrders = await prisma.workOrder.findMany({
    where: { status: { in: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS] } },
    include: workOrderInclude,
    orderBy: { createdAt: "desc" },
  });

  return workOrders.map(serializeWorkOrder);
}

import { localDateToMexicoCityInstant } from "@/features/quotes/lib/operational-date";
import { mexicoCityDateParts } from "./receivables-policy";

export type ListCompletedWorkOrdersInput = {
  start: Date;
  end: Date;
  payment: "all" | "pending" | "paid";
  assignee: "all" | "workshop" | string;
  customerId?: string;
  overdue?: "all" | "overdue" | "current";
  page: number;
};

export type CompletedWorkOrderTotals = {
  totalPendingCents: number;
  totalOverdueCents: number;
  totalPaidCents: number;
};

type SerializedCompletedWorkOrder = NonNullable<Awaited<ReturnType<typeof getCompletedWorkOrderById>>>;
export type CompletedNoteQuote = SerializedCompletedWorkOrder["quote"] & {
  effectiveTotalCents?: number;
  paidCents?: number;
  remainingCents?: number;
  activePaymentId?: string | null;
  activePaymentMethod?: string | null;
  activePaymentAmountCents?: number | null;
  hasRevocablePublicLink?: boolean;
};
export type CompletedWorkOrderItem = Omit<SerializedCompletedWorkOrder, "quote"> & {
  kind: "WORK";
  payableNoteId: string;
  quote: CompletedNoteQuote;
};
export type CompletedSaleNoteItem = {
  id: string;
  number: string;
  folio: string;
  status: "COMPLETED";
  completedAt: Date | null;
  paymentDueDate: Date | null;
  isSpecial: false;
  assignments: [];
  payableNoteId: string;
  kind: "SALE";
  quote: CompletedNoteQuote;
};
export type CompletedNoteItem = CompletedWorkOrderItem | CompletedSaleNoteItem;

/** Returns completed work orders (COMPLETED) — shown in the Notas section. */
export async function listCompletedWorkOrders(input: ListCompletedWorkOrdersInput): Promise<{
  page: number;
  hasNextPage: boolean;
  totals: CompletedWorkOrderTotals;
  workOrders: CompletedNoteItem[];
}> {
  await requireOperationalRole();
  const pageSize = 20;

  // Active payment application condition:
  // PaymentApplication not reversed, and associated Payment not reversed with status PAID
  const activeAppCondition = Prisma.sql`pa."reversedAt" IS NULL AND p.id IS NOT NULL AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL`;
  const paidCentsExpr = Prisma.sql`COALESCE(SUM(pa."amountCents") FILTER (WHERE ${activeAppCondition}), 0)`;
  const effectiveTotalCentsExpr = Prisma.sql`COALESCE(sa."settlementTotalCents", q."totalCents")`;
  const balanceExpr = Prisma.sql`${effectiveTotalCentsExpr} - ${paidCentsExpr}`;

  const now = new Date();
  const todayParts = mexicoCityDateParts(now);
  const todayCdmxMidnight = localDateToMexicoCityInstant(
    Number(todayParts.year),
    Number(todayParts.month),
    Number(todayParts.day),
    0,
    0,
    0,
  );

  const havingConditions: Prisma.Sql[] = [];

  if (input.payment === "pending") {
    havingConditions.push(Prisma.sql`${balanceExpr} > 0`);
  } else if (input.payment === "paid") {
    havingConditions.push(Prisma.sql`${balanceExpr} = 0`);
  }

  if (input.overdue === "overdue") {
    havingConditions.push(Prisma.sql`${balanceExpr} > 0 AND wo."paymentDueDate" IS NOT NULL AND wo."paymentDueDate" < ${todayCdmxMidnight}`);
  } else if (input.overdue === "current") {
    havingConditions.push(Prisma.sql`(${balanceExpr} <= 0 OR wo."paymentDueDate" IS NULL OR wo."paymentDueDate" >= ${todayCdmxMidnight})`);
  }

  const havingClause =
    havingConditions.length > 0
      ? Prisma.sql`HAVING ${Prisma.join(havingConditions, " AND ")}`
      : Prisma.empty;

  const assigneeFilter =
    input.assignee === "all"
      ? Prisma.empty
      : input.assignee === "workshop"
        ? Prisma.sql`AND wo."isSpecial" = true`
        : Prisma.sql`AND EXISTS (
            SELECT 1 FROM "WorkAssignment" wa
            JOIN "UserProfile" worker ON worker.id = wa."workerId"
            WHERE wa."workOrderId" = wo.id
              AND wa.status::text <> ${AssignmentStatus.CANCELLED}
              AND worker."workerKind"::text = ${WorkerKind.MASTER}
              AND worker.id = ${input.assignee}
          )`;

  const customerFilter =
    input.customerId && input.customerId.trim() !== "" && input.customerId !== "all"
      ? Prisma.sql`AND q."customerId" = ${input.customerId}`
      : Prisma.empty;

  const baseWhere = Prisma.sql`
    WHERE wo.status::text = ${WorkOrderStatus.COMPLETED}
      AND wo."completedAt" >= ${input.start}
      AND wo."completedAt" < ${input.end}
      ${assigneeFilter}
      ${customerFilter}
  `;

  const eligible = await prisma.$queryRaw<Array<{
    id: string;
    effectiveTotalCents: bigint;
    paidCents: bigint;
    activePaymentId: string | null;
    activePaymentMethod: string | null;
    activePaymentAmountCents: bigint | null;
    completedAt: Date;
    totalPaidCents?: bigint;
    totalPendingCents?: bigint;
    totalOverdueCents?: bigint;
  }>>(Prisma.sql`
    SELECT
      wo.id,
      ${effectiveTotalCentsExpr} AS "effectiveTotalCents",
      ${paidCentsExpr} AS "paidCents",
      (array_agg(p.id ORDER BY p."createdAt" ASC, p.id ASC) FILTER (WHERE ${activeAppCondition}))[1] AS "activePaymentId",
      (array_agg(p.method::text ORDER BY p."createdAt" ASC, p.id ASC) FILTER (WHERE ${activeAppCondition}))[1] AS "activePaymentMethod",
      (array_agg(pa."amountCents" ORDER BY p."createdAt" ASC, p.id ASC) FILTER (WHERE ${activeAppCondition}))[1] AS "activePaymentAmountCents",
      wo."completedAt" AS "completedAt",
      COALESCE(SUM(${paidCentsExpr}) OVER(), 0) AS "totalPaidCents",
      COALESCE(SUM(CASE WHEN ${balanceExpr} > 0 THEN ${balanceExpr} ELSE 0 END) OVER(), 0) AS "totalPendingCents",
      COALESCE(SUM(CASE WHEN ${balanceExpr} > 0 AND wo."paymentDueDate" IS NOT NULL AND wo."paymentDueDate" < ${todayCdmxMidnight} THEN ${balanceExpr} ELSE 0 END) OVER(), 0) AS "totalOverdueCents"
    FROM "WorkOrder" wo
    JOIN "Quote" q ON q.id = wo."quoteId"
    LEFT JOIN "SettlementAgreement" sa ON sa."quoteId" = q.id AND sa.status::text = ${SettlementAgreementStatus.ACTIVE}
    LEFT JOIN "PaymentApplication" pa ON pa."workOrderId" = wo.id AND pa."reversedAt" IS NULL
    LEFT JOIN "Payment" p ON p.id = pa."paymentId" AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL
    ${baseWhere}
    GROUP BY wo.id, wo."completedAt", wo."paymentDueDate", q."totalCents", sa."settlementTotalCents"
    ${havingClause}
    ORDER BY wo."completedAt" DESC, wo.id DESC LIMIT ${pageSize + 1} OFFSET ${(input.page - 1) * pageSize}
  `);

  // SALE notes have no WorkOrder by design. Keep their financial predicate at
  // the payable-note boundary and merge them with completed work for the
  // existing Notes workspace.
  const saleCandidate = input.assignee === "all"
    ? await prisma.payableNote.findFirst({ where: { kind: "SALE", status: "ISSUED" }, select: { id: true } })
    : null;
  const saleHavingConditions: Prisma.Sql[] = [];
  const salePaidCentsExpr = Prisma.sql`COALESCE(SUM(pa."amountCents") FILTER (WHERE pa."reversedAt" IS NULL AND p.id IS NOT NULL AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL), 0)`;
  const saleBalanceExpr = Prisma.sql`pn."totalCents" - ${salePaidCentsExpr}`;
  if (input.payment === "pending") saleHavingConditions.push(Prisma.sql`${saleBalanceExpr} > 0`);
  if (input.payment === "paid") saleHavingConditions.push(Prisma.sql`${saleBalanceExpr} = 0`);
  if (input.overdue === "overdue") saleHavingConditions.push(Prisma.sql`${saleBalanceExpr} > 0 AND pn."paymentDueDate" IS NOT NULL AND pn."paymentDueDate" < ${todayCdmxMidnight}`);
  if (input.overdue === "current") saleHavingConditions.push(Prisma.sql`(${saleBalanceExpr} <= 0 OR pn."paymentDueDate" IS NULL OR pn."paymentDueDate" >= ${todayCdmxMidnight})`);
  const saleHavingClause = saleHavingConditions.length > 0 ? Prisma.sql`HAVING ${Prisma.join(saleHavingConditions, " AND ")}` : Prisma.empty;
  const saleEligible = saleCandidate
    ? await prisma.$queryRaw<Array<{
        id: string;
        effectiveTotalCents: bigint;
        paidCents: bigint;
        activePaymentId: string | null;
        activePaymentMethod: string | null;
        activePaymentAmountCents: bigint | null;
        issuedAt: Date;
        totalPaidCents?: bigint;
        totalPendingCents?: bigint;
        totalOverdueCents?: bigint;
      }>>(Prisma.sql`
        SELECT
          pn.id,
          pn."totalCents"::bigint AS "effectiveTotalCents",
          ${salePaidCentsExpr} AS "paidCents",
          (array_agg(p.id ORDER BY p."createdAt" ASC, p.id ASC) FILTER (WHERE pa."reversedAt" IS NULL AND p.id IS NOT NULL AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL))[1] AS "activePaymentId",
          (array_agg(p.method::text ORDER BY p."createdAt" ASC, p.id ASC) FILTER (WHERE pa."reversedAt" IS NULL AND p.id IS NOT NULL AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL))[1] AS "activePaymentMethod",
          (array_agg(pa."amountCents" ORDER BY p."createdAt" ASC, p.id ASC) FILTER (WHERE pa."reversedAt" IS NULL AND p.id IS NOT NULL AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL))[1] AS "activePaymentAmountCents",
          pn."issuedAt",
          COALESCE(SUM(${salePaidCentsExpr}) OVER (), 0) AS "totalPaidCents",
          COALESCE(SUM(CASE WHEN ${saleBalanceExpr} > 0 THEN ${saleBalanceExpr} ELSE 0 END) OVER (), 0) AS "totalPendingCents",
          COALESCE(SUM(CASE WHEN ${saleBalanceExpr} > 0 AND pn."paymentDueDate" IS NOT NULL AND pn."paymentDueDate" < ${todayCdmxMidnight} THEN ${saleBalanceExpr} ELSE 0 END) OVER (), 0) AS "totalOverdueCents"
        FROM "PayableNote" pn
        LEFT JOIN "PaymentApplication" pa ON pa."payableNoteId" = pn.id AND pa."reversedAt" IS NULL
        LEFT JOIN "Payment" p ON p.id = pa."paymentId" AND p.status::text = ${PaymentStatus.PAID} AND p."reversedAt" IS NULL
        WHERE pn.kind::text = 'SALE' AND pn.status::text = 'ISSUED'
          AND pn."issuedAt" >= ${input.start} AND pn."issuedAt" < ${input.end}
          ${input.customerId && input.customerId.trim() !== "" && input.customerId !== "all" ? Prisma.sql`AND pn."customerId" = ${input.customerId}` : Prisma.empty}
        GROUP BY pn.id, pn."totalCents", pn."issuedAt", pn."paymentDueDate"
        ${saleHavingClause}
        ORDER BY pn."issuedAt" DESC, pn.id DESC
      `)
    : [];

  const allEligible = saleEligible.length === 0
    ? eligible.map((row) => ({ ...row, kind: "WORK" as const }))
    : [
        ...eligible.map((row) => ({ ...row, kind: "WORK" as const, sortDate: row.completedAt })),
        ...saleEligible.map((row) => ({ ...row, kind: "SALE" as const, sortDate: row.issuedAt })),
      ].sort((a, b) => (b.sortDate?.getTime() ?? 0) - (a.sortDate?.getTime() ?? 0) || (a.sortDate && b.sortDate ? b.id.localeCompare(a.id) : 0));

  const totals: CompletedWorkOrderTotals = {
    totalPaidCents: Number((eligible[0]?.totalPaidCents ?? BigInt(0)) + (saleEligible[0]?.totalPaidCents ?? BigInt(0))),
    totalPendingCents: Number((eligible[0]?.totalPendingCents ?? BigInt(0)) + (saleEligible[0]?.totalPendingCents ?? BigInt(0))),
    totalOverdueCents: Number((eligible[0]?.totalOverdueCents ?? BigInt(0)) + (saleEligible[0]?.totalOverdueCents ?? BigInt(0))),
  };

  const pageRows = allEligible.slice(0, pageSize);
  if (pageRows.length === 0) {
    return { page: input.page, hasNextPage: false, totals, workOrders: [] };
  }

  const pageWorkIds = pageRows.filter((row) => row.kind === "WORK").map(({ id }) => id);
  const pageSaleIds = pageRows.filter((row) => row.kind === "SALE").map(({ id }) => id);
  const workOrders = await prisma.workOrder.findMany({
    where: { id: { in: pageWorkIds } },
    include: completedWorkOrderInclude,
  });
  const saleNotes = await prisma.payableNote.findMany({
    where: { id: { in: pageSaleIds } },
    include: { quote: { include: completedWorkOrderInclude.quote.include } },
  });

  const byId = new Map(workOrders.map((wo) => [wo.id, wo]));
  const saleById = new Map(saleNotes.map((note) => [note.id, note]));

  return {
    page: input.page,
    hasNextPage: allEligible.length > pageSize,
    totals,
    workOrders: pageRows.flatMap<CompletedNoteItem>(({ id, kind, effectiveTotalCents, paidCents, activePaymentId, activePaymentMethod, activePaymentAmountCents }) => {
      if (kind === "SALE") {
        const note = saleById.get(id);
        if (!note?.quote) return [];
        const quote = (serializeWorkOrder({ quote: note.quote } as never) as { quote: CompletedNoteQuote }).quote;
        return [{
          id: note.id,
          number: note.referenceNumber,
          folio: note.referenceNumber,
          status: "COMPLETED" as const,
          completedAt: note.issuedAt,
          paymentDueDate: note.paymentDueDate,
          isSpecial: false,
          assignments: [],
          payableNoteId: note.id,
          kind: "SALE" as const,
          quote: {
            ...quote,
            effectiveTotalCents: Number(effectiveTotalCents),
            paidCents: Number(paidCents),
            remainingCents: Number(effectiveTotalCents) - Number(paidCents),
            activePaymentId: activePaymentId ?? null,
            activePaymentMethod: activePaymentMethod ?? null,
            activePaymentAmountCents: activePaymentAmountCents == null ? null : Number(activePaymentAmountCents),
            hasRevocablePublicLink: Boolean(note.quote.sharedQuotes?.length),
          },
        }];
      }
      const wo = byId.get(id);
      if (!wo) return [];
      const serialized = serializeWorkOrder(wo);
      const { sharedQuotes, ...quote } = serialized.quote;
      const effectiveTotal = effectiveTotalCents == null ? Number(wo.quote.totalCents) : Number(effectiveTotalCents);
      return [{
        ...serialized,
        payableNoteId: id,
        kind: "WORK" as const,
        quote: {
          ...quote,
          effectiveTotalCents: effectiveTotal,
          paidCents: Number(paidCents),
          remainingCents: effectiveTotal - Number(paidCents),
          activePaymentId: activePaymentId ?? null,
          activePaymentMethod: activePaymentMethod ?? null,
          activePaymentAmountCents: activePaymentAmountCents == null ? null : Number(activePaymentAmountCents),
          hasRevocablePublicLink: Boolean(sharedQuotes?.length),
        },
      }];
    }),
  };
}

/** Returns a single work order with all related data for the detail/manage view. */
export async function getWorkOrderById(workOrderId: string) {
  await requireOperationalRole();

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      ...workOrderInclude,
      executionRecords: {
        orderBy: { happenedAt: "desc" },
        include: { worker: true },
      },
      paymentRequests: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
      paymentApplications: {
        where: {
          reversedAt: null,
          payment: { status: PaymentStatus.PAID, reversedAt: null },
        },
        take: 1,
        select: { id: true },
      },
    },
  });

  return workOrder ? serializeWorkOrder(workOrder) : null;
}

export async function getCompletedWorkOrderById(workOrderId: string) {
  await requireOperationalRole();

  const workOrder = await prisma.workOrder.findFirst({
    where: { id: workOrderId, status: WorkOrderStatus.COMPLETED },
    include: workOrderInclude,
  });

  if (!workOrder) return null;

  try {
    assertOperationalClosureQuote(workOrder.quote);
  } catch (error) {
    if (error instanceof WorkOrderOperationError) return null;
    throw error;
  }

  return serializeWorkOrder(workOrder);
}

/** Loads an issued direct sale note without manufacturing a WorkOrder record. */
export async function getIssuedSaleNoteById(payableNoteId: string) {
  await requireOperationalRole();
  const note = await prisma.payableNote.findFirst({
    where: { id: payableNoteId, kind: "SALE", status: "ISSUED" },
    include: { quote: { include: completedWorkOrderInclude.quote.include } },
  });
  if (!note?.quote) return null;
  return {
    ...note,
    quote: (serializeWorkOrder({ quote: note.quote } as never) as { quote: CompletedNoteQuote }).quote,
  };
}
