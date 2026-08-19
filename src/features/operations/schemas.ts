import { z } from "zod";
import { normalizeVehiclePlate } from "@/features/vehicles/schemas";

const optionalText = (max: number) => z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(max).optional(),
);

const optionalCustomerId = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().min(1).nullable().optional(),
);

export const operationalConceptSchema = z.object({
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().positive().finite(),
});

export const operationalWorkInputSchema = z.object({
  masterId: z.string().uuid(),
  customerId: optionalCustomerId,
  plate: optionalText(40),
  brand: optionalText(80),
  model: optionalText(80),
  report: optionalText(10000),
  notes: optionalText(10000),
  concepts: z.array(operationalConceptSchema).min(1),
}).transform((input) => ({
  ...input,
  customerId: input.customerId || null,
  plate: normalizeVehiclePlate(input.plate),
  brand: input.brand || null,
  model: input.model || null,
  report: input.report || null,
  notes: input.notes || null,
})).superRefine((input, ctx) => {
  if (!input.plate && (!input.brand || !input.model)) {
    ctx.addIssue({ code: "custom", path: ["plate"], message: "Indica la placa o marca y modelo." });
  }
});

export type OperationalWorkInput = z.infer<typeof operationalWorkInputSchema>;

export const operationalWorkUpdateSchema = z.intersection(
  operationalWorkInputSchema,
  z.object({ operationalWorkId: z.string().min(1) }),
);
