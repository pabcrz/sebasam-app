import { QuoteItemType } from "@prisma/client";
import { z } from "zod";

const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().optional(),
);

const MAX_INT_CENTS = 2_147_483_647;
const MAX_QUANTITY = 100;
const MAX_UNIT_PRICE_CENTS = 5_000_000;

function optionalTrimmedStringWithMax(max: number) {
  return z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(max).optional(),
  );
}

const centsFromDollarInput = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  return Math.round(Number(normalized) * 100);
}, z.number().int().nonnegative("Unit price must be zero or greater").max(MAX_UNIT_PRICE_CENTS, "Unit price is too large"));

const quantitySchema = z.coerce
  .number()
  .positive("Quantity must be greater than zero")
  .max(MAX_QUANTITY)
  .refine((value) => Number.isFinite(value), "Quantity must be a valid number")
  .refine((value) => Number(value.toFixed(2)) === value, "Quantity supports up to 2 decimals");

const quoteItemBaseSchema = z.object({
  type: z.nativeEnum(QuoteItemType),
  description: z.string().trim().min(1, "Item description is required").max(240),
  quantity: quantitySchema,
  unitPriceCents: z.coerce.number().int().nonnegative("Unit price must be zero or greater").max(MAX_UNIT_PRICE_CENTS, "Unit price is too large"),
});

function validateItemTotal(
  item: z.infer<typeof quoteItemBaseSchema>,
  ctx: z.RefinementCtx,
) {
  const totalCents = Math.round(item.quantity * item.unitPriceCents);

  if (totalCents > MAX_INT_CENTS) {
    ctx.addIssue({
      code: "custom",
      message: "Item total is too large",
      path: ["unitPriceCents"],
    });
  }
}

export const quoteItemInputSchema = quoteItemBaseSchema.superRefine(validateItemTotal);

export const quoteVehicleInputSchema = z.object({
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
});

const quoteInputBaseSchema = z.object({
  customerId: z.string().min(1),
  vehicle: quoteVehicleInputSchema,
  title: z.string().trim().min(1, "Quote title is required").max(160),
  description: optionalTrimmedString,
  administrative: z.boolean().default(false),
  taxEnabled: z.boolean().default(true),
  items: z.array(quoteItemInputSchema).min(1, "At least one quote item is required").max(10),
});

function validateQuoteTotals(
  quote: z.infer<typeof quoteInputBaseSchema>,
  ctx: z.RefinementCtx,
) {
  const subtotalCents = quote.items.reduce(
    (total, item) => total + Math.round(item.quantity * item.unitPriceCents),
    0,
  );
  const taxCents = quote.taxEnabled ? Math.round(subtotalCents * 0.16) : 0;
  const totalCents = subtotalCents + taxCents;

  if (subtotalCents > MAX_INT_CENTS || taxCents > MAX_INT_CENTS || totalCents > MAX_INT_CENTS) {
    ctx.addIssue({
      code: "custom",
      message: "Quote total is too large",
      path: ["items"],
    });
  }
}

export const quoteInputSchema = quoteInputBaseSchema.superRefine(validateQuoteTotals);

export const quoteFormItemSchema = quoteItemBaseSchema.extend({
  unitPriceCents: centsFromDollarInput,
}).superRefine(validateItemTotal);

export const quoteFormInputSchema = quoteInputBaseSchema.extend({
  administrative: z.coerce.boolean().default(false),
  items: z.array(quoteFormItemSchema).min(1, "At least one quote item is required").max(10),
}).superRefine(validateQuoteTotals);

export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteVehicleInput = z.infer<typeof quoteVehicleInputSchema>;
