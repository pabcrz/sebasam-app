import assert from "node:assert/strict";
import { findOrCreateVehicle } from "../src/features/vehicles/actions";
import { createVehicleSnapshot, normalizeVehiclePlate, vehicleInputSchema } from "../src/features/vehicles/schemas";

type StoredVehicle = {
  id: string;
  customerId: string;
  plate: string | null;
  economicNumber: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
  year: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createMockTransaction(initialVehicles: StoredVehicle[] = []) {
  const vehicles = [...initialVehicles];
  let nextId = 1;

  return {
    vehicles,
    tx: {
      vehicle: {
        async findFirst({ where }: { where: { customerId: string; plate: string | null } }) {
          return vehicles.find((vehicle) => vehicle.customerId === where.customerId && vehicle.plate === where.plate) ?? null;
        },
        async update({ where, data }: { where: { id: string }; data: Partial<StoredVehicle> }) {
          const vehicle = vehicles.find((candidate) => candidate.id === where.id);

          if (!vehicle) {
            throw new Error(`Vehicle ${where.id} not found`);
          }

          Object.assign(vehicle, data, { updatedAt: new Date() });

          return vehicle;
        },
        async create({ data }: { data: Omit<StoredVehicle, "id" | "createdAt" | "updatedAt"> }) {
          const vehicle = {
            id: `vehicle-${nextId++}`,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
          } satisfies StoredVehicle;

          vehicles.push(vehicle);

          return vehicle;
        },
      },
    } as unknown as Parameters<typeof findOrCreateVehicle>[0],
  };
}

assert.equal(normalizeVehiclePlate(" abc-123 "), "ABC-123");
assert.equal(normalizeVehiclePlate("   "), null);
assert.equal(normalizeVehiclePlate(undefined), null);

const parsedWithoutPlate = vehicleInputSchema.parse({
  customerId: "customer-1",
  plate: "",
  brand: "",
  model: "Jetta",
});

assert.equal(parsedWithoutPlate.plate, undefined);
assert.equal(parsedWithoutPlate.brand, undefined);
assert.equal(parsedWithoutPlate.model, "Jetta");
assert.deepEqual(createVehicleSnapshot(parsedWithoutPlate), {
  plate: null,
  economicNumber: null,
  brand: null,
  model: "Jetta",
  color: null,
  year: null,
});

const optionalModel = vehicleInputSchema.safeParse({ customerId: "customer-1", plate: "ABC-123", model: "" });
assert.equal(optionalModel.success, true);
if (optionalModel.success) {
  assert.equal(optionalModel.data.model, undefined);
}

async function main() {
  const withoutPlate = createMockTransaction();
  await findOrCreateVehicle(withoutPlate.tx, {
    customerId: "customer-1",
    model: "Jetta",
  });
  await findOrCreateVehicle(withoutPlate.tx, {
    customerId: "customer-1",
    model: "Jetta",
  });
  assert.equal(withoutPlate.vehicles.length, 2, "Vehicles without plates must not be deduped unsafely");

  const withPlate = createMockTransaction();
  const firstVehicle = await findOrCreateVehicle(withPlate.tx, {
    customerId: "customer-1",
    plate: " abc-123 ",
    brand: "VW",
    model: "Jetta",
  });
  const reusedVehicle = await findOrCreateVehicle(withPlate.tx, {
    customerId: "customer-1",
    plate: "ABC-123",
    brand: "Volkswagen",
    model: "Jetta",
    color: "Blanco",
  });

  assert.equal(withPlate.vehicles.length, 1, "Vehicles with the same customer and plate must be reused");
  assert.ok(firstVehicle, "First vehicle must be created when vehicle data is provided");
  assert.ok(reusedVehicle, "Existing vehicle must be reused when vehicle data is provided");
  assert.equal(reusedVehicle.id, firstVehicle.id);
  assert.equal(reusedVehicle.brand, "Volkswagen");
  assert.equal(reusedVehicle.color, "Blanco");

  console.log("Vehicle rules verified.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
