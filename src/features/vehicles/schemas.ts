import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

export const vehicleInputSchema = z.object({
  customerId: z.string().min(1),
  plate: z.string().trim().min(1, "Vehicle plate is required").max(40),
  brand: z.string().trim().min(1, "Vehicle brand is required").max(80),
  model: z.string().trim().min(1, "Vehicle model is required").max(80),
  color: optionalTrimmedString,
  year: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce
      .number()
      .int("Vehicle year must be a whole number")
      .min(1900, "Vehicle year must be 1900 or later")
      .max(new Date().getFullYear() + 1, "Vehicle year cannot be more than one year in the future")
      .optional(),
  ),
  notes: optionalTrimmedString,
});

export type VehicleInput = z.infer<typeof vehicleInputSchema>;

export type VehicleSnapshot = {
  plate: string;
  brand: string;
  model: string;
  color: string | null;
  year: number | null;
};

export function normalizeVehiclePlate(plate: string) {
  return plate.trim().toUpperCase();
}

export function createVehicleSnapshot(input: VehicleInput): VehicleSnapshot {
  return {
    plate: normalizeVehiclePlate(input.plate),
    brand: input.brand.trim(),
    model: input.model.trim(),
    color: input.color ?? null,
    year: input.year ?? null,
  };
}
