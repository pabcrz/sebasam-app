import type { Prisma, Vehicle } from "@prisma/client";
import { normalizeVehiclePlate, vehicleInputSchema, type VehicleInput } from "./schemas";

type VehicleTransactionClient = Pick<Prisma.TransactionClient, "vehicle">;

export async function findOrCreateVehicle(tx: VehicleTransactionClient, input: VehicleInput): Promise<Vehicle> {
  const data = vehicleInputSchema.parse(input);
  const plate = normalizeVehiclePlate(data.plate);

  const existingVehicle = await tx.vehicle.findUnique({
    where: { plate },
  });

  if (existingVehicle) {
    if (existingVehicle.customerId !== data.customerId) {
      throw new Error("Vehicle plate is already registered to another customer.");
    }

    if (existingVehicle.brand !== data.brand || existingVehicle.model !== data.model) {
      return tx.vehicle.update({
        where: { id: existingVehicle.id },
        data: {
          brand: data.brand,
          model: data.model,
        },
      });
    }

    return existingVehicle;
  }

  return tx.vehicle.create({
    data: {
      customerId: data.customerId,
      plate,
      brand: data.brand,
      model: data.model,
      color: data.color ?? null,
      year: data.year ?? null,
      notes: data.notes ?? null,
    },
  });
}
