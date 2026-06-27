import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

function optionalTrimmedStringWithMax(max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );
}

export const vehicleInputSchema = z.object({
  customerId: z.string().min(1),
  plate: optionalTrimmedStringWithMax(40),
  brand: optionalTrimmedStringWithMax(80),
  model: optionalTrimmedStringWithMax(80),
  color: optionalTrimmedString,
  year: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce
      .number()
      .int("El año del vehículo debe ser un número entero")
      .min(1950, "El año del vehículo debe ser 1950 o posterior")
      .max(new Date().getFullYear() + 1, "El año del vehículo no puede ser mayor al próximo año")
      .optional(),
  ),
  notes: optionalTrimmedString,
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export type VehicleSnapshot = {
  plate: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
};

export function normalizeVehiclePlate(plate: string | null | undefined) {
  const normalizedPlate = plate?.trim().toUpperCase();

  return normalizedPlate || null;
}

export function createVehicleSnapshot(input: VehicleInput): VehicleSnapshot {
  return {
    plate: normalizeVehiclePlate(input.plate),
    brand: input.brand?.trim() ?? null,
    model: input.model?.trim() ?? null,
    color: input.color ?? null,
    year: input.year ?? null,
  };
}
