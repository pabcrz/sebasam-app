import { QuoteItemType } from "@prisma/client";
import { z } from "zod";
import { normalizeOperationalDate } from "./lib/operational-date";
import { optionalTrimmedString as optionalFilterString } from "@/lib/filters";

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
  .int("Quantity must be an integer")
  .positive("Quantity must be greater than zero")
  .max(MAX_QUANTITY)
  .refine((value) => Number.isFinite(value), "Quantity must be a valid number");

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

const quoteSectionBaseSchema = z.object({
  name: z.string().trim().max(160),
});

export const quoteSectionInputSchema = quoteSectionBaseSchema.extend({
  items: z.array(quoteItemInputSchema),
});

export const quoteVehicleInputSchema = z.object({
  plate: optionalTrimmedStringWithMax(10),
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
  discountCents: z.number().int().nonnegative().default(0),
  operationalDate: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().optional().superRefine((value, context) => {
      if (!value) return;
      try {
        normalizeOperationalDate(value);
      } catch {
        context.addIssue({ code: "custom", message: "Operational date must be today or earlier." });
      }
    }),
  ),
  sections: z.array(quoteSectionInputSchema).min(1, "At least one quote section is required").max(10),
});

const quoteFilterDateSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (!match) return undefined;
    const [year, month, day] = match.slice(1).map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? date
      : undefined;
  },
  z.date().optional(),
);

function validateQuoteTotals(
  quote: z.infer<typeof quoteInputBaseSchema>,
  ctx: z.RefinementCtx,
) {
  const subtotalCents = quote.sections.reduce(
    (total, section) => total + section.items.reduce((secTotal, item) => secTotal + Math.round(item.quantity * item.unitPriceCents), 0),
    0,
  );
  
  if (quote.discountCents > subtotalCents) {
    ctx.addIssue({
      code: "custom",
      message: "Discount cannot be greater than the subtotal",
      path: ["discountCents"],
    });
    return;
  }

  const taxableCents = Math.max(0, subtotalCents - quote.discountCents);
  const taxCents = quote.taxEnabled ? Math.round(taxableCents * 0.16) : 0;
  const totalCents = taxableCents + taxCents;

  if (subtotalCents > MAX_INT_CENTS || taxCents > MAX_INT_CENTS || totalCents > MAX_INT_CENTS) {
    ctx.addIssue({
      code: "custom",
      message: "Quote total is too large",
      path: ["sections"],
    });
  }
}

export const quoteInputSchema = quoteInputBaseSchema.superRefine(validateQuoteTotals);

export const quoteFormItemSchema = quoteItemBaseSchema.extend({
  unitPriceCents: centsFromDollarInput,
}).superRefine(validateItemTotal);

export const quoteFormSectionSchema = quoteSectionBaseSchema.extend({
  items: z.array(quoteFormItemSchema),
});

export const quoteFormInputSchema = quoteInputBaseSchema.extend({
  administrative: z.coerce.boolean().default(false),
  discountCents: centsFromDollarInput.default(0),
  sections: z.array(quoteFormSectionSchema).min(1, "At least one quote section is required").max(10),
}).superRefine(validateQuoteTotals);

export const quoteFilterSchema = z.object({
  status: optionalFilterString(),
  customerId: optionalFilterString(),
  number: optionalFilterString(),
  plate: optionalFilterString(),
  dateFrom: quoteFilterDateSchema,
  dateTo: quoteFilterDateSchema,
  showCancelled: z.coerce.boolean().default(false),
  showArchived: z.coerce.boolean().default(false),
});

export const quoteLifecycleReasonSchema = z.string().trim().min(3).max(500);

export const quoteListPageSchema = z.coerce.number().int().min(1).default(1);

export type QuoteFilterInput = z.infer<typeof quoteFilterSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteVehicleInput = z.infer<typeof quoteVehicleInputSchema>;
