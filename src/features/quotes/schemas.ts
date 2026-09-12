import { QuoteItemType } from "@prisma/client";
import { z } from "zod";
import { isMeaningfulText } from "@/lib/meaningful-text";
import { normalizeOperationalDate } from "./lib/operational-date";
import { optionalTrimmedString as optionalFilterString } from "@/lib/filters";

const optionalTrimmedString = z.preprocess(
  (value) => (value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value),
  z.string().trim().optional(),
);

const MAX_INT_CENTS = 2_147_483_647;
const MAX_QUANTITY = 100;
const MAX_UNIT_PRICE_CENTS = 5_000_000;

function optionalTrimmedStringWithMax(max: number) {
  return z.preprocess(
    (value) => (value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value),
    z.string().trim().max(max).optional(),
  );
}

const discountCentsFromDollarInput = z.preprocess((value) => {
  if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) {
    return 0;
  }
  if (typeof value === "string") {
    return Math.round(Number(value.trim()) * 100);
  }
  return value;
}, z.number().int().nonnegative("El descuento debe ser mayor o igual a cero").max(MAX_INT_CENTS, "El descuento es demasiado grande"));

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

const optionalCentsFromDollarInput = z.preprocess(
  (value) => (value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value),
  centsFromDollarInput.optional(),
);

const quantitySchema = z.coerce
  .number()
  .int("Quantity must be an integer")
  .positive("Quantity must be greater than zero")
  .max(MAX_QUANTITY)
  .refine((value) => Number.isFinite(value), "Quantity must be a valid number");

const quoteItemBaseSchema = z.object({
  type: z.nativeEnum(QuoteItemType),
  description: z.string().trim().min(1, "Item description is required").max(240).refine(isMeaningfulText, "La descripción debe incluir texto significativo."),
  quantity: quantitySchema,
  unitPriceCents: z.coerce.number().int().nonnegative("Unit price must be zero or greater").max(MAX_UNIT_PRICE_CENTS, "Unit price is too large"),
  includeInPayroll: z.coerce.boolean().default(false),
  customRatePercent: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? undefined : Number(val)),
    z.number().int().min(1, "El porcentaje de comisión debe ser al menos 1%").max(100, "El porcentaje de comisión no puede superar 100%").optional(),
  ),
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
  isAuthorized: z.boolean().default(false),
});

export const quoteSectionInputSchema = quoteSectionBaseSchema.extend({
  items: z.array(quoteItemInputSchema),
});

export const quoteVehicleInputSchema = z.object({
  plate: optionalTrimmedStringWithMax(10),
  economicNumber: optionalTrimmedStringWithMax(40),
  brand: optionalTrimmedStringWithMax(80),
  model: optionalTrimmedStringWithMax(80),
  color: optionalTrimmedString,
  year: z.preprocess(
    (value) => (value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value),
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
  customerContactId: optionalTrimmedString,
  customerFiscalProfileId: optionalTrimmedString,
  vehicle: quoteVehicleInputSchema,
  title: z.string().trim().min(1, "Quote title is required").max(160).refine(isMeaningfulText, "El título debe incluir texto significativo."),
  description: optionalTrimmedString,
  administrative: z.boolean().default(false),
  taxEnabled: z.boolean().default(true),
  discountCents: z.number().int().nonnegative().default(0),
  operationalDate: z.preprocess(
    (value) => (value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value),
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
  discountCents: discountCentsFromDollarInput,
  sections: z.array(quoteFormSectionSchema).min(1, "At least one quote section is required").max(10),
}).superRefine(validateQuoteTotals);

const quoteDraftInputBaseSchema = quoteInputBaseSchema.extend({
  customerId: optionalTrimmedString,
});

function validateDraftIdentity(
  quote: { customerId?: string; vehicle: z.infer<typeof quoteVehicleInputSchema> },
  ctx: z.RefinementCtx,
) {
  const hasIdentifiableUnit = Boolean(
    quote.vehicle.plate || quote.vehicle.economicNumber || (quote.vehicle.brand && quote.vehicle.model),
  );

  if (!quote.customerId && !hasIdentifiableUnit) {
    ctx.addIssue({
      code: "custom",
      message: "Selecciona un cliente o identifica la unidad con placas o marca y modelo.",
      path: ["vehicle"],
    });
  }
}

export const quoteDraftInputSchema = quoteDraftInputBaseSchema.extend({
  sections: z.array(quoteSectionBaseSchema.extend({
    items: z.array(quoteItemBaseSchema.omit({ unitPriceCents: true }).extend({ unitPriceCents: z.number().int().nonnegative().max(MAX_UNIT_PRICE_CENTS).optional() })),
  })).min(1, "At least one quote section is required").max(10),
}).superRefine(validateDraftIdentity);

export const quoteDraftFormItemSchema = quoteItemBaseSchema.omit({ unitPriceCents: true }).extend({
  unitPriceCents: optionalCentsFromDollarInput,
}).superRefine((item, ctx) => {
  if (item.unitPriceCents !== undefined) validateItemTotal({ ...item, unitPriceCents: item.unitPriceCents }, ctx);
});

export const quoteDraftFormInputSchema = quoteDraftInputBaseSchema.extend({
  administrative: z.coerce.boolean().default(false),
  discountCents: discountCentsFromDollarInput,
  sections: z.array(quoteSectionBaseSchema.extend({ items: z.array(quoteDraftFormItemSchema) })).min(1, "At least one quote section is required").max(10),
}).superRefine(validateDraftIdentity);

export const quoteFilterSchema = z.object({
  status: optionalFilterString(),
  customerId: optionalFilterString(),
  number: optionalFilterString(),
  plate: optionalFilterString(),
  economicNumber: optionalFilterString(),
  dateFrom: quoteFilterDateSchema,
  dateTo: quoteFilterDateSchema,
  hasWorkOrder: z.string().optional().transform((val) => val === "true" ? true : val === "false" ? false : undefined),
  showCancelled: z.coerce.boolean().default(false),
  showArchived: z.coerce.boolean().default(false),
});

export const quoteLifecycleReasonSchema = z.string().trim().min(3).max(500);

export const quoteListPageSchema = z.coerce.number().int().min(1).default(1);

export type QuoteCustomerSnapshot = {
  customerId?: string | null;
  name: string;
  commercialName?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type QuoteContactSnapshot = {
  id?: string | null;
  name: string;
  phone: string;
  role: string;
};

export type QuoteFilterInput = z.infer<typeof quoteFilterSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type QuoteDraftInput = z.infer<typeof quoteDraftInputSchema>;
export type QuoteVehicleInput = z.infer<typeof quoteVehicleInputSchema>;
