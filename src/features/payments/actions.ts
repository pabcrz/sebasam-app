"use server";

import { PaymentMethod, WorkOrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { recordPayableNotePayment } from "@/features/payable-notes/domain";
import {
  applyCustomerCredit,
  correctPayment,
  parseCashAmountCents,
  recordCashPayment,
  reversePaymentCapture,
} from "./domain";

export async function recordPaymentAction(
  workOrderId: string,
  amount: string,
  operationKey: string,
  method: string,
) {
  const session = await requireAdmin();
  const actorId = session?.profile?.id;

  const amountCents = parseCashAmountCents(amount);

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

  if (paymentMethod !== PaymentMethod.CASH && paymentMethod !== PaymentMethod.TRANSFER) {
    throw new Error("Las notas solo admiten pagos en efectivo o transferencia.");
  }

  const result = await recordCashPayment({
    quoteId: workOrder.quoteId,
    amountCents,
    operationKey,
    method: paymentMethod,
    ...(actorId ? { actorId } : {}),
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");
  revalidatePath("/admin/customers");

  return result;
}

export async function recordPayableNotePaymentAction(
  payableNoteId: string,
  amount: string,
  operationKey: string,
  method: string,
) {
  const session = await requireAdmin();
  const amountCents = parseCashAmountCents(amount);
  const paymentMethod = Object.values(PaymentMethod).includes(method as PaymentMethod)
    ? (method as PaymentMethod)
    : PaymentMethod.CASH;
  const result = await recordPayableNotePayment({
    payableNoteId,
    amountCents,
    operationKey,
    method: paymentMethod,
    actorId: session?.profile?.id,
  });
  revalidatePath("/admin/notas");
  revalidatePath("/admin/customers");
  return {
    payment: result.payment,
    paidCents: result.note.paidCents,
    remainingCents: result.note.remainingCents,
  };
}

export async function applyCustomerCreditAction(
  customerId: string,
  workOrderId: string,
  amount: string,
  operationKey: string,
) {
  const session = await requireAdmin();
  const actorId = session?.profile?.id;

  const amountCents = parseCashAmountCents(amount);

  const result = await applyCustomerCredit({
    customerId,
    workOrderId,
    amountCents,
    operationKey,
    ...(actorId ? { actorId } : {}),
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");
  revalidatePath("/admin/customers");

  return result;
}

export async function reversePaymentCaptureAction(
  paymentId: string,
  reason: string,
  operationKey?: string,
) {
  const session = await requireAdmin();
  const actorId = session?.profile?.id ?? "system";

  const result = await reversePaymentCapture({
    paymentId,
    reason,
    actorId,
    operationKey,
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");
  revalidatePath("/admin/customers");

  return result;
}

export async function correctPaymentAction(
  originalPaymentId: string,
  amount: string,
  method: string,
  reason: string,
  operationKey: string,
) {
  const session = await requireAdmin();
  const actorId = session?.profile?.id;
  if (!actorId) {
    throw new Error("No se pudo identificar al administrador.");
  }

  const amountCents = parseCashAmountCents(amount);

  const paymentMethod =
    Object.values(PaymentMethod).includes(method as PaymentMethod)
      ? (method as PaymentMethod)
      : PaymentMethod.CASH;

  const result = await correctPayment({
    originalPaymentId,
    amountCents,
    method: paymentMethod,
    reason,
    operationKey,
    actorId,
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");
  revalidatePath("/admin/customers");

  return result;
}
