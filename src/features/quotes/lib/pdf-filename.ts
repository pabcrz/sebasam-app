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
  vehicle?: VehicleInput;
  operationalDate?: Date | string | null;
  fallbackType?: string;
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

function resolveCustomerSegment(customerName?: string | null): string {
  if (!customerName || typeof customerName !== "string") {
    return "SinCliente";
  }
  const sanitized = sanitizeFilenameSegment(customerName);
  return sanitized.length > 0 ? sanitized : "SinCliente";
}

function resolveVehicleSegment(vehicle?: VehicleInput): string {
  if (!vehicle) {
    return "SinUnidad";
  }

  if (typeof vehicle === "string") {
    const sanitized = sanitizeFilenameSegment(vehicle);
    return sanitized.length > 0 ? sanitized : "SinUnidad";
  }

  if (typeof vehicle === "object" && vehicle !== null) {
    const record = vehicle as Record<string, unknown>;

    if (typeof record.plate === "string") {
      const trimmedPlate = record.plate.trim();
      if (trimmedPlate.length > 0 && trimmedPlate.toLowerCase() !== "sin placas") {
        const sanitizedPlate = sanitizeFilenameSegment(trimmedPlate);
        if (sanitizedPlate.length > 0) {
          return sanitizedPlate;
        }
      }
    }

    const brand = typeof record.brand === "string" ? record.brand.trim() : "";
    const model = typeof record.model === "string" ? record.model.trim() : "";
    const brandModel = [brand, model].filter(Boolean).join(" ");
    if (
      brandModel.length > 0 &&
      brandModel.toLowerCase() !== "sin vehiculo" &&
      brandModel.toLowerCase() !== "sin vehículo"
    ) {
      const sanitizedBrandModel = sanitizeFilenameSegment(brandModel);
      if (sanitizedBrandModel.length > 0) {
        return sanitizedBrandModel;
      }
    }
  }

  return "SinUnidad";
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
 * Generates a dynamic PDF/print filename without extension (.pdf).
 * Nomenclature format: [Cliente]-[UnidadOPlaca]-[DDMMAAAA]
 */
export function formatDocumentPdfFilename({
  customerName,
  vehicle,
  operationalDate,
}: FormatDocumentPdfFilenameParams): string {
  const customerSegment = resolveCustomerSegment(customerName);
  const vehicleSegment = resolveVehicleSegment(vehicle);
  const dateSegment = formatUtcDateDDMMAAAA(operationalDate);

  return `${customerSegment}-${vehicleSegment}-${dateSegment}`;
}
