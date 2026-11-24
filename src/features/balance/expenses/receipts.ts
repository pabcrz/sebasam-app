import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BUCKET = "expense-receipts";
/** Vercel functions accept at most ~4.5 MB of body; the form shrinks photos before sending. */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;
export const RECEIPT_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export class ReceiptError extends Error {}

/** Stores the receipt in the private bucket (created on first use) and returns its path. */
export async function storeReceipt(bytes: Uint8Array, mimeType: string) {
  const extension = RECEIPT_TYPES[mimeType];
  if (!extension) throw new ReceiptError("Formato no admitido. Usa JPG, PNG, WebP o PDF.");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_RECEIPT_BYTES) throw new ReceiptError("El archivo está vacío o pesa más de 4 MB.");

  const storage = createSupabaseAdminClient().storage;
  const path = `${randomUUID()}.${extension}`;
  let upload = await storage.from(BUCKET).upload(path, bytes, { contentType: mimeType });
  if (upload.error && /not found|bucket/i.test(upload.error.message)) {
    await storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_RECEIPT_BYTES, allowedMimeTypes: Object.keys(RECEIPT_TYPES) });
    upload = await storage.from(BUCKET).upload(path, bytes, { contentType: mimeType });
  }
  if (upload.error) throw new ReceiptError("No se pudo guardar el comprobante.");
  return path;
}

/** A link that opens the private receipt for one minute. */
export async function receiptUrl(path: string) {
  const { data, error } = await createSupabaseAdminClient().storage.from(BUCKET).createSignedUrl(path, 60);
  return error ? null : data.signedUrl;
}
