import { QuoteItemType } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const centsFromDollarInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  return Math.round(Number(normalized) * 100);
}, z.number().int().nonnegative("Unit price must be zero or greater"));

const quantitySchema = z.coerce
  .number()
  .positive("Quantity must be greater than zero")
  .max(999999.99)
  .refine((value) => Number.isFinite(value), "Quantity must be a valid number")
  .refine((value) => Number(value.toFixed(2)) === value, "Quantity supports up to 2 decimals");

export const quoteItemInputSchema = z.object({
  type: z.nativeEnum(QuoteItemType),
  description: z.string().trim().min(1, "Item description is required").max(240),
  quantity: quantitySchema,
  unitPriceCents: z.coerce.number().int().nonnegative("Unit price must be zero or greater"),
});

export const quoteInputSchema = z.object({
  customerId: z.string().min(1),
  title: z.string().trim().min(1, "Quote title is required").max(160),
  description: optionalTrimmedString,
  administrative: z.boolean().default(false),
  items: z.array(quoteItemInputSchema).min(1, "At least one quote item is required").max(10),
});

export const quoteFormItemSchema = quoteItemInputSchema.extend({
  unitPriceCents: centsFromDollarInput,
});

export const quoteFormInputSchema = quoteInputSchema.extend({
  administrative: z.coerce.boolean().default(false),
  items: z.array(quoteFormItemSchema).min(1, "At least one quote item is required").max(10),
});

export type QuoteInput = z.infer<typeof quoteInputSchema>;
