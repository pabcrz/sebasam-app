"use server";

import { PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { parseCashAmountCents, recordCashPayment } from "./domain";

export async function recordPaymentAction(
  quoteId: string,
  amount: string,
  operationKey: string,
  method: string,
) {
  await requireAdmin();

  const paymentMethod =
    Object.values(PaymentMethod).includes(method as PaymentMethod)
      ? (method as PaymentMethod)
      : PaymentMethod.CASH;

  const result = await recordCashPayment({
    quoteId,
    amountCents: parseCashAmountCents(amount),
    operationKey,
    method: paymentMethod,
  });

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/work-orders");
  revalidatePath("/admin/notas");

  return result;
}

/** @deprecated use recordPaymentAction instead */
export async function recordCashPaymentAction(quoteId: string, amount: string, operationKey: string) {
  return recordPaymentAction(quoteId, amount, operationKey, "CASH");
}
