"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { QuoteItemType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";

export const updatePayrollItemAdjustmentSchema = z.object({
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

export const updatePayrollItemBaseSchema = updatePayrollItemAdjustmentSchema;
export type UpdatePayrollItemAdjustmentInput = z.infer<typeof updatePayrollItemAdjustmentSchema>;
export type UpdatePayrollItemBaseInput = UpdatePayrollItemAdjustmentInput;

export interface UpdatePayrollItemBaseResult {
  success: boolean;
  error?: string;
}

export async function updatePayrollItemBase(
  input: unknown
): Promise<UpdatePayrollItemBaseResult> {
  await requireOperationalRole();

  try {
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
      },
    });

    if (!item) {
      return {
        success: false,
        error: "El concepto no existe o no fue encontrado.",
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

export const updatePayrollItemAdjustment = updatePayrollItemBase;
