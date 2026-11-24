import { NextResponse } from "next/server";
import { receiptUrl } from "@/features/balance/expenses/receipts";
import { prisma } from "@/lib/prisma";
import { isAdminRole, requireProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Opens an expense's receipt through a one-minute link. Only the owner and the patron can see it. */
export async function GET(_request: Request, { params }: { params: Promise<{ expenseId: string }> }) {
  let role;
  try {
    role = (await requireProfile()).profile.role;
  } catch {
    return new Response("No autorizado", { status: 403 });
  }
  if (!isAdminRole(role)) return new Response("No autorizado", { status: 403 });

  const { expenseId } = await params;
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, deletedAt: null }, select: { receiptPath: true } });
  const url = expense?.receiptPath ? await receiptUrl(expense.receiptPath) : null;
  return url ? NextResponse.redirect(url) : new Response("Sin comprobante", { status: 404 });
}
