import type { ExpenseCategory, ExpenseInvoiceStatus } from "@/generated/prisma/client";

export interface ExpenseCategoryOption {
  value: ExpenseCategory;
  label: string;
  /** Proposed share (0-100) charged to the parts-and-materials account; the rest goes to labor. */
  defaultPartsSharePercent: number;
}

export const EXPENSE_CATEGORIES: readonly ExpenseCategoryOption[] = [
  { value: "RENT", label: "Renta", defaultPartsSharePercent: 0 },
  { value: "ELECTRICITY", label: "Luz", defaultPartsSharePercent: 0 },
  { value: "WATER", label: "Agua", defaultPartsSharePercent: 0 },
  { value: "PHONE_INTERNET", label: "Teléfono e internet", defaultPartsSharePercent: 0 },
  { value: "PARTS_PURCHASE", label: "Refacciones compradas", defaultPartsSharePercent: 100 },
  { value: "MATERIALS_PURCHASE", label: "Materiales comprados", defaultPartsSharePercent: 100 },
  { value: "TOOLS_EQUIPMENT", label: "Herramienta y equipo", defaultPartsSharePercent: 0 },
  // Half of the trips are for parts runs.
  { value: "FUEL_TRANSPORT", label: "Combustible y traslados", defaultPartsSharePercent: 50 },
  { value: "TAXES_FEES", label: "Impuestos y derechos", defaultPartsSharePercent: 0 },
  { value: "OTHER", label: "Otros", defaultPartsSharePercent: 0 },
];

export const EXPENSE_CATEGORY_LABELS = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.value, category.label]),
) as Record<ExpenseCategory, string>;

export const EXPENSE_INVOICE_LABELS: Record<ExpenseInvoiceStatus, string> = {
  INVOICED: "Con factura",
  NOT_INVOICED: "Sin factura",
};

export const EXPENSE_PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "CARD", label: "Tarjeta" },
] as const;

export function defaultPartsShareFor(category: ExpenseCategory) {
  return EXPENSE_CATEGORIES.find((option) => option.value === category)?.defaultPartsSharePercent ?? 0;
}
