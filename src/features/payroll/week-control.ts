import { PayrollPeriodStatus, type Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationalRole } from "@/lib/auth/session";
import { normalizeWeekStart, PayrollWeekError } from "./period";

export { PayrollWeekError };

export async function lockPayrollWeekControl(
  weekStartDate: Date,
  isCurrentWeek: boolean,
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<{ id: string; status: PayrollPeriodStatus }> {
  // 1. Ensure the control row exists without altering existing status
  await client.payrollWeekControl.upsert({
    where: { weekStart: weekStartDate },
    create: {
      weekStart: weekStartDate,
      status: isCurrentWeek ? PayrollPeriodStatus.OPEN : PayrollPeriodStatus.CLOSED,
    },
    update: {},
  });

  // 2. Lock row with SELECT ... FOR UPDATE
  const rows = await client.$queryRaw<Array<{ id: string; status: PayrollPeriodStatus }>>`
    SELECT "id", "status"
    FROM "PayrollWeekControl"
    WHERE "weekStart" = ${weekStartDate}
    FOR UPDATE;
  `;

  if (!rows || rows.length === 0) {
    throw new Error("No se pudo obtener el bloqueo de control semanal.");
  }

  return rows[0];
}

export async function getPayrollWeekStatus(
  weekStartInput?: string | Date,
  now = new Date(),
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<PayrollPeriodStatus> {
  const { weekStartDate, isCurrentWeek } = normalizeWeekStart(weekStartInput, now);

  const control = await client.payrollWeekControl.findUnique({
    where: { weekStart: weekStartDate },
    select: { status: true },
  });

  if (control) {
    return control.status;
  }

  // Current week is open by default. Historical/future weeks without control are closed by default.
  return isCurrentWeek ? PayrollPeriodStatus.OPEN : PayrollPeriodStatus.CLOSED;
}

export async function assertPayrollWeekOpen(
  weekStartInput?: string | Date,
  now = new Date(),
  client: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  const { weekStartDate, isCurrentWeek } = normalizeWeekStart(weekStartInput, now);

  const control = await lockPayrollWeekControl(weekStartDate, isCurrentWeek, client);
  if (control.status !== PayrollPeriodStatus.OPEN) {
    throw new PayrollWeekError(
      "La semana de nómina seleccionada está cerrada. Para modificar o registrar avances en una semana cerrada se requiere reapertura previa."
    );
  }
}

export async function reopenPayrollWeekAction(input: {
  weekStart: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOperationalRole();

    const trimmedReason = input.reason?.trim();
    if (!trimmedReason || trimmedReason.length < 5) {
      return {
        success: false,
        error: "Debes especificar un motivo de reapertura válido (mínimo 5 caracteres).",
      };
    }

    const { weekStartDate, isCurrentWeek } = normalizeWeekStart(input.weekStart);

    await prisma.$transaction(async (tx) => {
      const control = await lockPayrollWeekControl(weekStartDate, isCurrentWeek, tx);

      if (
        control.status === PayrollPeriodStatus.PAID ||
        control.status === PayrollPeriodStatus.ARCHIVED
      ) {
        throw new Error(
          `No se puede reabrir una semana de nómina con estado ${
            control.status === PayrollPeriodStatus.PAID ? "PAGADA" : "ARCHIVADA"
          }.`
        );
      }

      if (control.status === PayrollPeriodStatus.OPEN) {
        return;
      }

      await tx.payrollWeekControl.update({
        where: { weekStart: weekStartDate },
        data: {
          status: PayrollPeriodStatus.OPEN,
          reopenedAt: new Date(),
          reopenedById: user.profile.id,
          reopenReason: trimmedReason,
        },
      });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al reabrir la semana de nómina.",
    };
  }
}

export async function closePayrollWeekAction(input: {
  weekStart: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireOperationalRole();
    const { weekStartDate, isCurrentWeek } = normalizeWeekStart(input.weekStart);

    await prisma.$transaction(async (tx) => {
      const control = await lockPayrollWeekControl(weekStartDate, isCurrentWeek, tx);

      if (
        control.status === PayrollPeriodStatus.PAID ||
        control.status === PayrollPeriodStatus.ARCHIVED
      ) {
        throw new Error(
          `No se puede cerrar una semana de nómina con estado ${
            control.status === PayrollPeriodStatus.PAID ? "PAGADA" : "ARCHIVADA"
          }.`
        );
      }

      if (control.status === PayrollPeriodStatus.CLOSED) {
        return;
      }

      await tx.payrollWeekControl.update({
        where: { weekStart: weekStartDate },
        data: {
          status: PayrollPeriodStatus.CLOSED,
          closedAt: new Date(),
          closedById: user.profile.id,
        },
      });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cerrar la semana de nómina.",
    };
  }
}
