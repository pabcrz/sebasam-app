import type { ReceiptExtraction } from "./receipt-extraction";

const MAX_SIDE = 1600;

/** Shrinks a phone photo to a JPEG of at most 1600 px so it fits the upload limit and reads just as well. Falls back to the original when the browser cannot. */
export async function shrinkPhoto(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/webp") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "comprobante.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

export type ReceiptUploadResult = { receiptPath: string; extracted: ReceiptExtraction | null };

/** Sends the receipt to the server, which stores it and reads it. Throws an Error with a message fit for the person. */
export async function uploadReceipt(file: File): Promise<ReceiptUploadResult> {
  const body = new FormData();
  body.set("file", await shrinkPhoto(file));
  const response = await fetch("/admin/balance/comprobante", { method: "POST", body });
  const data = (await response.json().catch(() => null)) as (ReceiptUploadResult & { error?: string }) | null;
  if (!response.ok || !data?.receiptPath) throw new Error(data?.error ?? "No se pudo subir el comprobante. Intenta de nuevo.");
  return data;
}
