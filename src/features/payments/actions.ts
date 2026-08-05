"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { parseCashAmountCents, recordCashPayment } from "./domain";

export async function recordCashPaymentAction(quoteId: string, amount: string, operationKey: string) {
  await requireAdmin();

  const result = await recordCashPayment({
    quoteId,
    amountCents: parseCashAmountCents(amount),
    operationKey,
  });

  revalidatePath("/admin/quotes");

  return result;
}
