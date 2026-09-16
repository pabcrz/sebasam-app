"use server";

import { revalidatePath } from "next/cache";
import { AssignmentStatus, QuoteItemType, WorkerKind, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { formatCents } from "@/features/quotes/lib/format";
import { computeCommissionCents, detectLaborCategory, getDefaultLaborRate } from "@/features/payroll/domain";
import { normalizeWeekStart } from "@/features/payroll/period";
import { assertPayrollWeekOpen } from "@/features/payroll/week-control";

export interface RecordLaborAdvanceInput {
  workOrderId: string;
  quoteItemId: string;
  advanceBaseCents: number;
  weekStart?: string; // "YYYY-MM-DD"
  notes?: string;
}

export interface RecordLaborAdvanceResult {
  success: boolean;
  error?: string;
  advanceId?: string;
}

export async function recordLaborAdvanceAction(
  input: RecordLaborAdvanceInput
): Promise<RecordLaborAdvanceResult> {
  try {
    const user = await requireOperationalRole();

    if (!input.workOrderId || !input.quoteItemId) {
      return { success: false, error: "Datos de orden o concepto inválidos." };
    }

    if (
      !Number.isInteger(input.advanceBaseCents) ||
      input.advanceBaseCents <= 0
    ) {
      return { success: false, error: "El monto del avance debe ser un número entero mayor a cero." };
    }

    const { weekStartDate, weekStartAnchor } = normalizeWeekStart(input.weekStart);

    const advance = await prisma.$transaction(async (tx) => {
      await assertPayrollWeekOpen(weekStartAnchor, undefined, tx);

      // Pessimistic row lock to serialize concurrent balance checks on this concept
      await tx.$queryRaw`SELECT id FROM "QuoteItem" WHERE id = ${input.quoteItemId} FOR UPDATE;`;
      const workOrder = await tx.workOrder.findUnique({
        where: { id: input.workOrderId },
        include: {
          assignments: {
            where: { status: AssignmentStatus.ASSIGNED },
            include: { worker: true },
          },
          quote: {
            select: { id: true },
          },
        },
      });

      if (!workOrder) {
        throw new Error("La orden de trabajo no existe.");
      }

      if (workOrder.isSpecial) {
        throw new Error("No se pueden registrar avances en órdenes especiales de taller.");
      }

      const validStatuses: WorkOrderStatus[] = [
        WorkOrderStatus.ASSIGNED,
        WorkOrderStatus.IN_PROGRESS,
      ];
      if (!validStatuses.includes(workOrder.status)) {
        throw new Error("Solo se pueden registrar avances en órdenes activas (asignadas o en progreso).");
      }

      const masterAssignment = workOrder.assignments.find(
        (a) => a.worker.workerKind === WorkerKind.MASTER
      );

      if (!masterAssignment) {
        throw new Error("La orden de trabajo debe tener un maestro asignado para registrar avances de mano de obra.");
      }

      const quoteItem = await tx.quoteItem.findUnique({
        where: { id: input.quoteItemId },
      });

      if (!quoteItem || quoteItem.quoteId !== workOrder.quote.id) {
        throw new Error("El concepto no pertenece a la cotización de esta orden de trabajo.");
      }

      const isCommissionable =
        quoteItem.type === QuoteItemType.LABOR ||
        (quoteItem.type === QuoteItemType.OTHER && Boolean(quoteItem.includeInPayroll));

      if (!isCommissionable) {
        throw new Error("Solo los conceptos de mano de obra comisionables admiten avances.");
      }

      const existingWeekAdvance = await tx.workOrderLaborAdvance.findUnique({
        where: {
          quoteItemId_weekStart: {
            quoteItemId: input.quoteItemId,
            weekStart: weekStartDate,
          },
        },
      });

      if (existingWeekAdvance) {
        throw new Error("Ya existe un avance registrado para este concepto en esta semana.");
      }

      const totalConceptBaseCents =
        quoteItem.customPayrollBaseCents != null
          ? quoteItem.customPayrollBaseCents
          : (quoteItem.totalCents ?? 0);

      const allAdvances = await tx.workOrderLaborAdvance.findMany({
        where: { quoteItemId: input.quoteItemId },
        select: { advanceBaseCents: true },
      });

      const previousAdvancesBaseCents = allAdvances.reduce(
        (sum, a) => sum + a.advanceBaseCents,
        0
      );
      const remainingBaseCents = totalConceptBaseCents - previousAdvancesBaseCents;

      if (input.advanceBaseCents > remainingBaseCents) {
        throw new Error(
          `El monto del avance excede la base pendiente disponible (${formatCents(remainingBaseCents)}).`
        );
      }

      const advancePercentage = Math.round(
        (input.advanceBaseCents / (remainingBaseCents || 1)) * 100
      );

      let commissionRatePercent: number;
      if (quoteItem.type === QuoteItemType.OTHER) {
        commissionRatePercent = quoteItem.customRatePercent ?? 40;
      } else {
        const category = detectLaborCategory(quoteItem.description);
        commissionRatePercent = quoteItem.customRatePercent ?? getDefaultLaborRate(category);
      }

      const commissionCents = computeCommissionCents(
        input.advanceBaseCents,
        commissionRatePercent
      );

      if (!quoteItem.payrollConfigLockedAt) {
        await tx.quoteItem.update({
          where: { id: input.quoteItemId },
          data: { payrollConfigLockedAt: new Date() },
        });
      }

      return tx.workOrderLaborAdvance.create({
        data: {
          workOrderId: input.workOrderId,
          quoteItemId: input.quoteItemId,
          workerId: masterAssignment.workerId,
          weekStart: weekStartDate,
          advanceBaseCents: input.advanceBaseCents,
          advancePercentage,
          commissionRatePercent,
          commissionCents,
          notes: input.notes?.trim() || null,
          createdById: user.profile.id,
        },
      });
    });

    revalidatePath("/admin/nomina");
    revalidatePath(`/admin/work-orders/${input.workOrderId}`);
    revalidatePath("/admin/work-orders");

    return { success: true, advanceId: advance.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al registrar el avance.",
    };
  }
}

export async function deleteLaborAdvanceAction(input: {
  advanceId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    await requireOperationalRole();

    if (!input.advanceId) {
      return { success: false, error: "ID de avance inválido." };
    }

    const advance = await prisma.workOrderLaborAdvance.findUnique({
      where: { id: input.advanceId },
      select: {
        id: true,
        weekStart: true,
        quoteItemId: true,
        workOrderId: true,
      },
    });

    if (!advance) {
      return { success: false, error: "El avance no existe o ya fue eliminado." };
    }

    const { weekStartAnchor } = normalizeWeekStart(advance.weekStart);

    await prisma.$transaction(async (tx) => {
      await assertPayrollWeekOpen(weekStartAnchor, undefined, tx);

      // Pessimistic lock on QuoteItem row
      await tx.$queryRaw`SELECT id FROM "QuoteItem" WHERE id = ${advance.quoteItemId} FOR UPDATE;`;

      await tx.workOrderLaborAdvance.delete({
        where: { id: input.advanceId },
      });

      const remainingAdvances = await tx.workOrderLaborAdvance.count({
        where: { quoteItemId: advance.quoteItemId },
      });

      if (remainingAdvances === 0) {
        await tx.quoteItem.update({
          where: { id: advance.quoteItemId },
          data: { payrollConfigLockedAt: null },
        });
      }
    });

    revalidatePath("/admin/nomina");
    revalidatePath(`/admin/work-orders/${advance.workOrderId}`);
    revalidatePath("/admin/work-orders");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al eliminar el avance.",
    };
  }
}

export interface ConceptAdvanceStatus {
  quoteItemId: string;
  description: string;
  totalBaseCents: number;
  previousAdvancesBaseCents: number;
  remainingBaseCents: number;
  commissionRatePercent: number;
  isLocked: boolean;
  currentWeekAdvance?: {
    id: string;
    advanceBaseCents: number;
    advancePercentage: number;
    commissionCents: number;
    notes: string | null;
  } | null;
}

export interface WorkOrderLaborAdvancesSummary {
  workOrderId: string;
  isSpecial: boolean;
  masterWorker: { id: string; displayName: string } | null;
  concepts: ConceptAdvanceStatus[];
  allAdvances: Array<{
    id: string;
    quoteItemId: string;
    conceptDescription: string;
    weekStart: string;
    advanceBaseCents: number;
    advancePercentage: number;
    commissionRatePercent: number;
    commissionCents: number;
    notes: string | null;
    createdAt: Date;
  }>;
}

export async function getWorkOrderLaborAdvancesSummary(
  workOrderId: string,
  weekStartInput?: string
): Promise<WorkOrderLaborAdvancesSummary | null> {
  await requireOperationalRole();
  const { weekStartDate } = normalizeWeekStart(weekStartInput);

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      assignments: {
        where: { status: AssignmentStatus.ASSIGNED },
        include: { worker: true },
      },
      quote: {
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          sections: {
            include: {
              items: {
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
      laborAdvances: {
        include: {
          quoteItem: { select: { description: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!workOrder) return null;

  const masterAssignment = workOrder.assignments.find(
    (a) => a.worker.workerKind === WorkerKind.MASTER
  );

  const itemMap = new Map<string, (typeof workOrder.quote.items)[number]>();
  for (const item of workOrder.quote.items) {
    itemMap.set(item.id, item);
  }
  if (workOrder.quote.sections) {
    for (const section of workOrder.quote.sections) {
      for (const item of section.items) {
        itemMap.set(item.id, item);
      }
    }
  }

  const commissionableItems = Array.from(itemMap.values()).filter(
    (item) =>
      item.type === QuoteItemType.LABOR ||
      (item.type === QuoteItemType.OTHER && Boolean(item.includeInPayroll))
  );

  const concepts: ConceptAdvanceStatus[] = commissionableItems.map((item) => {
    const totalBaseCents =
      item.customPayrollBaseCents != null
        ? item.customPayrollBaseCents
        : (item.totalCents ?? 0);

    const itemAdvances = workOrder.laborAdvances.filter(
      (a) => a.quoteItemId === item.id
    );

    const previousAdvancesBaseCents = itemAdvances.reduce(
      (sum, a) => sum + a.advanceBaseCents,
      0
    );
    const remainingBaseCents = Math.max(0, totalBaseCents - previousAdvancesBaseCents);

    let commissionRatePercent: number;
    if (item.type === QuoteItemType.OTHER) {
      commissionRatePercent = item.customRatePercent ?? 40;
    } else {
      const category = detectLaborCategory(item.description);
      commissionRatePercent = item.customRatePercent ?? getDefaultLaborRate(category);
    }

    const currentWeekAdv = itemAdvances.find(
      (a) => a.weekStart.getTime() === weekStartDate.getTime()
    );

    return {
      quoteItemId: item.id,
      description: item.description,
      totalBaseCents,
      previousAdvancesBaseCents,
      remainingBaseCents,
      commissionRatePercent,
      isLocked: Boolean(item.payrollConfigLockedAt),
      currentWeekAdvance: currentWeekAdv
        ? {
            id: currentWeekAdv.id,
            advanceBaseCents: currentWeekAdv.advanceBaseCents,
            advancePercentage: currentWeekAdv.advancePercentage,
            commissionCents: currentWeekAdv.commissionCents,
            notes: currentWeekAdv.notes,
          }
        : null,
    };
  });

  return {
    workOrderId: workOrder.id,
    isSpecial: workOrder.isSpecial,
    masterWorker: masterAssignment
      ? { id: masterAssignment.worker.id, displayName: masterAssignment.worker.displayName }
      : null,
    concepts,
    allAdvances: workOrder.laborAdvances.map((adv) => ({
      id: adv.id,
      quoteItemId: adv.quoteItemId,
      conceptDescription: adv.quoteItem.description,
      weekStart: adv.weekStart.toISOString().slice(0, 10),
      advanceBaseCents: adv.advanceBaseCents,
      advancePercentage: adv.advancePercentage,
      commissionRatePercent: adv.commissionRatePercent,
      commissionCents: adv.commissionCents,
      notes: adv.notes,
      createdAt: adv.createdAt,
    })),
  };
}
