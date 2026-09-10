"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import { cancelSettlementAgreement, upsertSettlementAgreement } from "./domain";

export async function saveSettlementAgreementAction(quoteId: string, settlementBaseCents: number, reason: string) {
  const session = await requireAdmin();
  const agreement = await upsertSettlementAgreement({ quoteId, settlementBaseCents, reason, actorId: session.profile.id });
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/notas");
  return agreement;
}

export async function cancelSettlementAgreementAction(quoteId: string, reason: string) {
  const session = await requireAdmin();
  const agreement = await cancelSettlementAgreement({ quoteId, reason, actorId: session.profile.id });
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/notas");
  return agreement;
}
