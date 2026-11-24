import { z } from "zod";

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Fecha inválida");

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => (value === "" ? null : value)).nullable().optional().default(null);

export const expenseInputSchema = z.object({
  spentAt: calendarDate,
  amountCents: z.number().int("Monto inválido").min(1, "El monto debe ser mayor que cero").max(1_000_000_00),
  category: z.enum([
    "RENT", "ELECTRICITY", "WATER", "PHONE_INTERNET", "PARTS_PURCHASE",
    "MATERIALS_PURCHASE", "TOOLS_EQUIPMENT", "FUEL_TRANSPORT", "TAXES_FEES", "OTHER",
  ]),
  invoiceStatus: z.enum(["INVOICED", "NOT_INVOICED"]),
  partsSharePercent: z.number().int().min(0).max(100),
  supplier: optionalText(120),
  paymentMethod: z.enum(["CASH", "TRANSFER", "CARD"]).nullable().optional().default(null),
  notes: optionalText(500),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

/** "1234.50" -> 123450. NaN when the text is not a positive amount with up to two decimals. */
export function pesosTextToCents(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return Number.NaN;
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
