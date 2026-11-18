import type { Prisma, Vehicle } from "@/generated/prisma/client";
import { normalizeVehiclePlate, vehicleInputSchema, type VehicleInput } from "./schemas";

type VehicleTransactionClient = Pick<Prisma.TransactionClient, "vehicle">;

export async function findOrCreateVehicle(tx: VehicleTransactionClient, input: VehicleInput): Promise<Vehicle | null> {
  const data = vehicleInputSchema.parse(input);
  const plate = normalizeVehiclePlate(data.plate);
  const economicNumber = data.economicNumber?.trim() || null;
  const hasAnyVehicleData =
    plate !== null ||
    economicNumber !== null ||
    data.brand !== undefined ||
    data.model !== undefined ||
    data.color !== undefined ||
    data.year !== undefined ||
    data.notes !== undefined;

  if (!hasAnyVehicleData) {
    return null;
  }

  const existingVehicle = plate
    ? await tx.vehicle.findFirst({
        where: {
          customerId: data.customerId,
          plate,
        },
      })
    : economicNumber
      ? await tx.vehicle.findFirst({
          where: {
            customerId: data.customerId,
            economicNumber,
          },
        })
      : null;

  if (existingVehicle) {
    const updateData: Prisma.VehicleUpdateInput = {};

    if (economicNumber !== null && existingVehicle.economicNumber !== economicNumber) {
      updateData.economicNumber = economicNumber;
    }

    if (data.model !== undefined) {
      updateData.model = data.model;
    }

    if (data.brand !== undefined) {
      updateData.brand = data.brand;
    }

    if (data.color !== undefined) {
      updateData.color = data.color;
    }

    if (data.year !== undefined) {
      updateData.year = data.year;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes;
    }

    if (
      Object.keys(updateData).length > 0 &&
      (
        (data.economicNumber !== undefined && existingVehicle.economicNumber !== data.economicNumber) ||
        (data.model !== undefined && existingVehicle.model !== data.model) ||
        (data.brand !== undefined && existingVehicle.brand !== data.brand) ||
        (data.color !== undefined && existingVehicle.color !== data.color) ||
        (data.year !== undefined && existingVehicle.year !== data.year) ||
        (data.notes !== undefined && existingVehicle.notes !== data.notes)
      )
    ) {
      return tx.vehicle.update({
        where: { id: existingVehicle.id },
        data: updateData,
      });
    }

    return existingVehicle;
  }

  return tx.vehicle.create({
    data: {
      customerId: data.customerId,
      plate,
      economicNumber,
      brand: data.brand ?? null,
      model: data.model ?? null,
      color: data.color ?? null,
      year: data.year ?? null,
      notes: data.notes ?? null,
    },
  });
}
