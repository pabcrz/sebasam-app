"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { QuoteItemType, UserRole, WorkerKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

const updatePayrollItemAdjustmentSchema = z.object({
  itemId: z.string().trim().min(1, "El identificador del concepto es obligatorio."),
  customPayrollBaseCents: z
    .number()
    .int("La base debe ser un importe entero en centavos.")
    .min(0, "La base no puede ser negativa.")
    .max(100_000_000, "La base no puede exceder el límite permitido.")
    .nullable(),
  customRatePercent: z
    .number()
    .int("El porcentaje debe ser un número entero.")
    .min(1, "El porcentaje debe ser de al menos 1%.")
    .max(100, "El porcentaje no puede ser mayor a 100%.")
    .nullable()
    .optional(),
});

export interface UpdatePayrollItemBaseResult {
  success: boolean;
  error?: string;
}

const updateFixedPayHelperSchema = z.object({
  workerId: z.string().trim().min(1, "Worker identifier is required."),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Week start is invalid."),
  absenceDays: z.number().int().min(0).max(6),
  manualCommissionCents: z.number().int().min(0).max(100_000_000),
});

export async function updateFixedPayHelperAdjustments(input: unknown): Promise<UpdatePayrollItemBaseResult> {
  try {
    await requireOperationalRole();
    const parsed = updateFixedPayHelperSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid helper payroll data." };
    }

    const { workerId, weekStart, absenceDays, manualCommissionCents } = parsed.data;
    const helper = await prisma.userProfile.findFirst({
      where: {
        id: workerId,
        role: UserRole.WORKER,
        workerKind: WorkerKind.HELPER,
        fixedWeeklyPayCents: { not: null },
        fixedDailyPayCents: { not: null },
      },
      select: { id: true, fixedWeeklyPayCents: true, fixedDailyPayCents: true },
    });

    if (!helper) {
      return { success: false, error: "The helper does not have a fixed-pay configuration." };
    }

    await prisma.helperPayrollWeek.upsert({
      where: {
        workerId_weekStart: {
          workerId,
          weekStart: new Date(`${weekStart}T00:00:00.000Z`),
        },
      },
      create: {
        workerId,
        weekStart: new Date(`${weekStart}T00:00:00.000Z`),
        weeklyRateCents: helper.fixedWeeklyPayCents!,
        dailyRateCents: helper.fixedDailyPayCents!,
        absenceDays,
        manualCommissionCents,
      },
      update: { absenceDays, manualCommissionCents },
    });

    revalidatePath("/admin/nomina");
    return { success: true };
  } catch (error) {
    console.error("[updateFixedPayHelperAdjustments] error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return { success: false, error: error instanceof Error ? error.message : "Unable to update helper payroll." };
  }
}

export async function updatePayrollItemBase(
  input: unknown
): Promise<UpdatePayrollItemBaseResult> {
  try {
    await requireOperationalRole();
    const parsed = updatePayrollItemAdjustmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos de ajuste inválidos.",
      };
    }

    const { itemId, customPayrollBaseCents, customRatePercent } = parsed.data;

    const item = await prisma.quoteItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        type: true,
        totalCents: true,
        includeInPayroll: true,
        payrollConfigLockedAt: true,
      },
    });

    if (!item) {
      return {
        success: false,
        error: "El concepto no existe o no fue encontrado.",
      };
    }

    if (item.payrollConfigLockedAt) {
      return {
        success: false,
        error: "La configuración de nómina de este concepto está congelada porque ya tiene avances registrados.",
      };
    }

    const isCommissionable =
      item.type === QuoteItemType.LABOR ||
      (item.type === QuoteItemType.OTHER && Boolean(item.includeInPayroll));

    if (!isCommissionable) {
      return {
        success: false,
        error: "Solo los conceptos de mano de obra o servicios comisionables permiten ajuste de base de nómina.",
      };
    }

    if (
      customPayrollBaseCents !== null &&
      item.totalCents !== null &&
      customPayrollBaseCents > item.totalCents
    ) {
      return {
        success: false,
        error: "La base de nómina no puede ser mayor al cobro del cliente.",
      };
    }

    const dataToUpdate: {
      customPayrollBaseCents: number | null;
      customRatePercent?: number | null;
    } = {
      customPayrollBaseCents,
    };

    if (customRatePercent !== undefined) {
      dataToUpdate.customRatePercent = customRatePercent;
    }

    await prisma.quoteItem.update({
      where: { id: itemId },
      data: dataToUpdate,
    });

    revalidatePath("/admin/nomina");

    return { success: true };
  } catch (error) {
    console.error("[updatePayrollItemBase] error:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error inesperado al actualizar la base de nómina.",
    };
  }
}

export async function reopenPayrollWeekAction(input: {
  weekStart: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const { reopenPayrollWeekAction: reopenWeek } = await import("./week-control");
  const res = await reopenWeek(input);
  if (res.success) {
    revalidatePath("/admin/nomina");
    revalidatePath("/admin/work-orders");
  }
  return res;
}

export async function closePayrollWeekAction(input: {
  weekStart: string;
}): Promise<{ success: boolean; error?: string }> {
  const { closePayrollWeekAction: closeWeek } = await import("./week-control");
  const res = await closeWeek(input);
  if (res.success) {
    revalidatePath("/admin/nomina");
    revalidatePath("/admin/work-orders");
  }
  return res;
}
