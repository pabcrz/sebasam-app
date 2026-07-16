import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const optionalEmail = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().email("Enter a valid customer email").optional(),
);

export function normalizeMexicanPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed || !/^[\d\s()+-]+$/.test(trimmed)) return undefined;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("52")) return digits.slice(2);

  return undefined;
}

const optionalMexicanPhone = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .transform((value, context) => {
      const phone = normalizeMexicanPhone(value);
      if (!phone) {
        context.addIssue({ code: "custom", message: "Enter a valid 10-digit Mexican phone" });
        return z.NEVER;
      }
      return phone;
    })
    .optional(),
);

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required").max(160),
  email: optionalEmail,
  phone: optionalMexicanPhone,
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
