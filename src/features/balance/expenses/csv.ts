import { EXPENSE_CATEGORY_LABELS, EXPENSE_INVOICE_LABELS, EXPENSE_PAYMENT_METHODS } from "./categories";
import type { ExpenseRow } from "./queries";

const methodLabels = Object.fromEntries(EXPENSE_PAYMENT_METHODS.map((method) => [method.value, method.label]));

/** Quotes the cell, and defuses a leading = + - @ so a spreadsheet never runs a typed supplier or note as a formula. */
function cell(value: string | null) {
  const text = value ?? "";
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) || safe !== text ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** The month's expenses as CSV for a spreadsheet: one row per expense, amounts in pesos, with a BOM so Excel reads the accents. No tax math. */
export function expensesToCsv(expenses: ExpenseRow[]) {
  const header = ["Fecha", "Categoría", "Proveedor", "Comprobante", "Método de pago", "Monto (MXN)", "Nota"];
  const rows = expenses.map((expense) => [
    expense.spentAt.toISOString().slice(0, 10),
    EXPENSE_CATEGORY_LABELS[expense.category as keyof typeof EXPENSE_CATEGORY_LABELS] ?? expense.category,
    expense.supplier,
    EXPENSE_INVOICE_LABELS[expense.invoiceStatus],
    expense.paymentMethod ? methodLabels[expense.paymentMethod] ?? expense.paymentMethod : null,
    (expense.amountCents / 100).toFixed(2),
    expense.notes,
  ]);
  // Oldest first reads as a ledger; the screen lists newest first.
  return `﻿${[header, ...rows.reverse()].map((row) => row.map((value) => cell(value)).join(",")).join("\r\n")}\r\n`;
}
