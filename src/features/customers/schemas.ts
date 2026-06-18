import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email("Enter a valid customer email").optional(),
);

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(160),
  email: optionalEmail,
  phone: optionalTrimmedString,
  address: optionalTrimmedString,
  notes: optionalTrimmedString,
});

export const customerStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const customerUpdateSchema = customerInputSchema.extend({
  status: customerStatusSchema,
});

export const customerSearchSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
