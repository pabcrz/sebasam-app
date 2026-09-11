export type VehicleInput =
  | {
      plate?: string | null | unknown;
      brand?: string | null | unknown;
      model?: string | null | unknown;
    }
  | string
  | null
  | undefined
  | unknown;

export interface FormatDocumentPdfFilenameParams {
  customerName?: string | null;
  documentType?: string | null;
  folio?: string | null;
  fallbackType?: string | null;
  vehicle?: VehicleInput;
  operationalDate?: Date | string | null;
}

/**
 * Normalizes unicode diacritics, removes invalid file characters (/ \ : * ? " < > |),
 * and removes all whitespace.
 */
export function sanitizeFilenameSegment(segment: string): string {
  return segment
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[/\\:*?"<>|]/g, "")
    .replace(/\s+/g, "");
}

export function formatUtcDateDDMMAAAA(dateInput?: Date | string | null): string {
  if (!dateInput) {
    return "SinFecha";
  }
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) {
    return "SinFecha";
  }
  const day = date.getUTCDate().toString().padStart(2, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const year = date.getUTCFullYear().toString();
  return `${day}${month}${year}`;
}

/**
 * Generates a dynamic PDF/print filename and title without extension (.pdf).
 * Format: {Customer}-{Type}-{Folio}
 * Omits empty optional segments. Does not use placeholders (no SinCliente, SinUnidad, SEBASAM).
 */
export function formatDocumentPdfFilename({
  customerName,
  documentType,
  folio,
  fallbackType,
}: FormatDocumentPdfFilenameParams): string {
  const customer = customerName && typeof customerName === "string"
    ? sanitizeFilenameSegment(customerName)
    : "";

  const rawType = documentType ?? fallbackType ?? "Cotización";
  const type = sanitizeFilenameSegment(rawType);

  const resolvedFolio = folio ? sanitizeFilenameSegment(folio) : "";

  return [customer, type, resolvedFolio].filter(Boolean).join("-");
}

