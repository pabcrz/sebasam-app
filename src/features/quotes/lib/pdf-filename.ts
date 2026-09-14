export type VehiclePdfInput =
  | {
      economicNumber?: string | null | unknown;
      plate?: string | null | unknown;
      brand?: string | null | unknown;
      model?: string | null | unknown;
    }
  | string
  | null
  | undefined
  | unknown;

export type VehicleInput = VehiclePdfInput;

export interface FormatDocumentPdfFilenameParams {
  customerName?: string | null;
  driverName?: string | null;
  vehicle?: VehiclePdfInput;
  folio?: string | null;
  operationalDate?: Date | string | null;
  documentType?: string | null;
  fallbackType?: string | null;
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

/**
 * Resolves vehicle identifier for PDF naming using strict priority:
 * 1. String literal (e.g. "Taller")
 * 2. Economic number (e.g. "Eco14")
 * 3. Plate (e.g. "ABC1234")
 * 4. Brand + Model combined
 */
export function resolveVehiclePdfSegment(vehicle?: VehiclePdfInput): string {
  if (!vehicle) return "";
  if (typeof vehicle === "string") {
    return sanitizeFilenameSegment(vehicle);
  }
  if (typeof vehicle === "object") {
    const v = vehicle as {
      economicNumber?: unknown;
      plate?: unknown;
      brand?: unknown;
      model?: unknown;
    };
    const eco = typeof v.economicNumber === "string" ? v.economicNumber.replace(/-/g, "").trim() : "";
    if (eco) return sanitizeFilenameSegment(eco);

    const plate = typeof v.plate === "string" ? v.plate.replace(/-/g, "").trim() : "";
    if (plate) return sanitizeFilenameSegment(plate);

    const brand = typeof v.brand === "string" ? v.brand.trim() : "";
    const model = typeof v.model === "string" ? v.model.trim() : "";
    const brandModel = [brand, model].filter(Boolean).join("");
    if (brandModel) return sanitizeFilenameSegment(brandModel);
  }
  return "";
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
 * Format: {Customer}-{Driver}-{Unit}-{Folio}
 * Omits empty optional segments. Does not use placeholders (no SinCliente, SinUnidad, SEBASAM).
 * Does not emit redundant "Cotización" or "Nota" since folio prefix (C-/N-) identifies document type.
 */
export function formatDocumentPdfFilename({
  customerName,
  driverName,
  vehicle,
  folio,
}: FormatDocumentPdfFilenameParams): string {
  const customer =
    customerName && typeof customerName === "string"
      ? sanitizeFilenameSegment(customerName)
      : "";

  const driver =
    driverName && typeof driverName === "string"
      ? sanitizeFilenameSegment(driverName)
      : "";

  const unit = resolveVehiclePdfSegment(vehicle);

  const resolvedFolio = folio ? sanitizeFilenameSegment(folio) : "";

  return [customer, driver, unit, resolvedFolio].filter(Boolean).join("-");
}
