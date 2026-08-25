"use server";

import { PaymentMethod, WorkOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseCashAmountCents, recordCashPayment } from "./domain";

export async function recordPaymentAction(
  workOrderId: string,
  amount: string,
  operationKey: string,
  method: string,
) {
  await requireAdmin();

  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    select: { quoteId: true, status: true },
  });

  if (!workOrder || workOrder.status !== WorkOrderStatus.COMPLETED) {
    throw new Error("Solo se pueden registrar pagos desde notas de trabajos completados.");
  }

  const paymentMethod =
    Object.values(PaymentMethod).includes(method as PaymentMethod)
      ? (method as PaymentMethod)
      : PaymentMethod.CASH;

  const result = await recordCashPayment({
    quoteId: workOrder.quoteId,
    amountCents: parseCashAmountCents(amount),
    operationKey,
    method: paymentMethod,
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");

  return result;
}
