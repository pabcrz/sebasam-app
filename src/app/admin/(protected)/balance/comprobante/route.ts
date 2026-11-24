import { NextResponse } from "next/server";
import { extractReceipt } from "@/features/balance/expenses/receipt-extraction";
import { ReceiptError, storeReceipt } from "@/features/balance/expenses/receipts";
import { requireExpenseRole } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Saves the photo or PDF of a receipt and reads it. The form shows what was read so the person confirms it; nothing is registered here. */
export async function POST(request: Request) {
  try {
    await requireExpenseRole();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const receiptPath = await storeReceipt(bytes, file.type);
    return NextResponse.json({ receiptPath, extracted: await extractReceipt(bytes, file.type) });
  } catch (error) {
    if (error instanceof ReceiptError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
