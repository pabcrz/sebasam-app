import { QuoteItemType } from "@prisma/client";
import { z } from "zod";

export const historicalSourceSchema = z.enum(["voice", "text", "excel"]);

const MAX_CENTS = 2_147_483_647;

function optionalText(max: number) {
  return z.preprocess(
    (value) =>
      value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value,
    z.string().trim().max(max).optional(),
  );
}

function optionalNumber() {
  return z.preprocess(
    (value) =>
      value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value,
    z.number().finite().nonnegative().max(MAX_CENTS).optional(),
  );
}

/**
 * Amounts are LINE TOTALS in pesos (decimal). They are converted to integer
 * cents at ingestion. Unknown values become null, never guessed.
 */
const historicalItemSchema = z
  .object({
    type: z.nativeEnum(QuoteItemType),
    description: z.string().trim().min(1, "La descripción es obligatoria").max(240),
    quantity: optionalNumber(),
    customerPrice: optionalNumber(),
    payrollBase: optionalNumber(),
    ratePercent: z.preprocess(
      (value) =>
        value === null || value === undefined || (typeof value === "string" && value.trim() === "") ? undefined : value,
      z.number().int().min(1, "El porcentaje debe ser al menos 1").max(100, "El porcentaje no puede superar 100").optional(),
    ),
    includeInPayroll: z.boolean().optional().default(false),
    isKit: z.boolean().optional().default(false),
  })
  .superRefine((item, ctx) => {
    const isPayroll =
      item.type === QuoteItemType.LABOR ||
      (item.type === QuoteItemType.OTHER && item.includeInPayroll);

    if (isPayroll) {
      // Mano de obra / otro en nómina: total de línea, sin cantidad.
      if (item.quantity !== undefined) {
        ctx.addIssue({
          code: "custom",
          message: "La mano de obra no lleva cantidad",
          path: ["quantity"],
        });
      }
    } else {
      // Material / refacción: cantidad + importe total de línea.
      if (item.quantity === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "La cantidad es obligatoria para material/refacción",
          path: ["quantity"],
        });
      }
      if (item.customerPrice === undefined) {
        ctx.addIssue({
          code: "custom",
          message: "El importe es obligatorio para material/refacción",
          path: ["customerPrice"],
        });
      }
    }
  });

export type HistoricalItemInput = z.infer<typeof historicalItemSchema>;

export const historicalWorkSchema = z.object({
  ref: z.string().trim().min(1, "La referencia es obligatoria").max(40),
  date: z.iso.date(),
  customer: z
    .object({
      name: optionalText(200),
      plate: optionalText(20),
      brand: optionalText(80),
      model: optionalText(80),
    })
    .optional()
    .default({}),
  master: optionalText(160),
  masterId: z.uuid().nullish(),
  items: z.array(historicalItemSchema).min(1, "El trabajo debe tener al menos un concepto"),
});

export type HistoricalWorkInput = z.infer<typeof historicalWorkSchema>;

export const historicalBatchSchema = z.object({
  id: z.string().trim().min(1, "El id del lote es obligatorio").max(120),
  source: historicalSourceSchema,
});

export const historicalImportSchema = z.object({
  schemaVersion: z.literal(2),
  batch: historicalBatchSchema,
  works: z.array(historicalWorkSchema).min(1, "El archivo debe contener al menos un trabajo"),
});

export type HistoricalImportInput = z.infer<typeof historicalImportSchema>;

export function formatZodIssues(issues: z.ZodIssue[]): string[] {
  return issues.map((issue) => {
    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  });
}