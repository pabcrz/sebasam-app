export function formatCents(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(cents / 100);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
  }).format(date);
}

export function formatOperationalDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(date);
}

type VehicleSnapshotView = {
  plate?: unknown;
  brand?: unknown;
  model?: unknown;
};

export function formatSnapshotVehicle(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return "Sin vehículo";
  }

  const vehicle = snapshot as VehicleSnapshotView;
  const plate = typeof vehicle.plate === "string" && vehicle.plate.trim() !== "" ? vehicle.plate : "Sin placas";
  const brand = typeof vehicle.brand === "string" ? vehicle.brand : "";
  const model = typeof vehicle.model === "string" ? vehicle.model : "";
  const description = [brand, model].filter(Boolean).join(" ");

  return description ? `${description} - ${plate}` : plate;
}

export function formatVehicle(vehicle: { plate: string | null; brand: string | null; model: string | null }) {
  const plate = vehicle.plate?.trim() || "Sin placas";
  const description = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");

  return description ? `${description} - ${plate}` : plate;
}
