"use client";

import * as React from "react";
import {
  Button,
  DialogClose,
  DialogDescription,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
  Icon,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  Textarea,
} from "@/components/ui";
import { EXPENSE_CATEGORIES, EXPENSE_INVOICE_LABELS, EXPENSE_PAYMENT_METHODS } from "./categories";
import type { ExpenseRow, SupplierOption } from "./queries";

type ExpenseFormDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  /** "YYYY-MM": the month the form returns to and the default date's month. */
  month: string;
  /** Today's date as "YYYY-MM-DD" (Mexico City), the default date of a new expense. */
  today: string;
  expense?: ExpenseRow;
  /** Catalog used to autocomplete the supplier. */
  suppliers?: SupplierOption[];
};

function pesosText(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Sheet with the expense form; creates a new expense or edits `expense`. */
export function ExpenseFormDialog({ action, month, today, expense, suppliers = [] }: ExpenseFormDialogProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [category, setCategory] = React.useState<string>(expense?.category ?? "RENT");
  const [invoiceStatus, setInvoiceStatus] = React.useState<string>(expense?.invoiceStatus ?? "NOT_INVOICED");
  const [paymentMethod, setPaymentMethod] = React.useState<string>(expense?.paymentMethod ?? "");
  const supplierListId = `${formId}-suppliers`;
  // Picking a known supplier on a new expense proposes its usual category and invoice status; the user can still change both.
  const proposeFromSupplier = (name: string) => {
    const known = suppliers.find((supplier) => supplier.name === name);
    if (expense || !known) return;
    if (known.category) setCategory(known.category);
    setInvoiceStatus(known.usuallyInvoiced ? "INVOICED" : "NOT_INVOICED");
  };
  const title = expense ? "Editar gasto" : "Nuevo gasto";

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!isPending) setOpen(next); }}>
      <DialogTrigger asChild>
        {expense ? (
          <Button type="button" variant="ghost" size="sm" aria-label={`Editar gasto de ${pesosText(expense.amountCents)}`}>
            <Icon name="edit" className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" variant="primary" size="lg">
            <Icon name="plus" className="h-4 w-4" aria-hidden="true" />
            Nuevo gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogMobileContent variant="sheet">
        <DialogMobileHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Registra lo que se pagó y si hay factura.</DialogDescription>
        </DialogMobileHeader>
        <DialogMobileBody>
          <form id={formId} action={action} onSubmit={() => setIsPending(true)} className="grid gap-4" data-testid="expense-form">
            <input type="hidden" name="month" value={month} />
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-date`}>Fecha de pago</Label>
                <Input id={`${formId}-date`} name="spentAt" type="date" required defaultValue={expense ? expense.spentAt.toISOString().slice(0, 10) : today} disabled={isPending} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-amount`}>Monto (MXN)</Label>
                <Input id={`${formId}-amount`} name="amount" type="number" inputMode="decimal" min="0.01" step="0.01" required defaultValue={expense ? pesosText(expense.amountCents) : ""} disabled={isPending} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${formId}-category`}>Categoría</Label>
              <Select name="category" value={category} onValueChange={setCategory} disabled={isPending}>
                <SelectTrigger id={`${formId}-category`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <fieldset className="grid gap-2" disabled={isPending}>
              <legend className="text-sm font-medium text-[var(--color-text-main)]">Comprobante</legend>
              <div className="grid grid-cols-2 gap-2">
                {(["INVOICED", "NOT_INVOICED"] as const).map((value) => (
                  <label key={value} className={`flex min-h-[var(--tap-min-height)] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border px-3 text-sm font-medium ${invoiceStatus === value ? "border-[var(--color-primary)] bg-[var(--color-tonal-bg)] text-[var(--color-tonal-fg)]" : "border-[var(--color-border-light)] text-[var(--color-text-muted)]"}`}>
                    <input type="radio" name="invoiceStatus" value={value} checked={invoiceStatus === value} onChange={() => setInvoiceStatus(value)} className="sr-only" />
                    {EXPENSE_INVOICE_LABELS[value]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-supplier`}>Proveedor (opcional)</Label>
                <Input id={`${formId}-supplier`} name="supplier" list={supplierListId} maxLength={120} defaultValue={expense?.supplier ?? ""} onChange={(event) => proposeFromSupplier(event.target.value)} disabled={isPending} />
                <datalist id={supplierListId}>{suppliers.map((supplier) => <option key={supplier.name} value={supplier.name} />)}</datalist>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-method`}>Método de pago (opcional)</Label>
                <Select value={paymentMethod || "none"} onValueChange={(value) => setPaymentMethod(value === "none" ? "" : value)} disabled={isPending}>
                  <SelectTrigger id={`${formId}-method`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {EXPENSE_PAYMENT_METHODS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <input type="hidden" name="paymentMethod" value={paymentMethod} />
              </div>
            </div>

            {expense ? null : (
              <label className="flex min-h-[var(--tap-min-height)] items-center gap-3 text-sm text-[var(--color-text-main)]">
                <input type="checkbox" name="repeat" className="h-4 w-4" disabled={isPending} />
                Repetir cada mes (renta, luz, teléfono…)
              </label>
            )}

            <div className="grid gap-2">
              <Label htmlFor={`${formId}-notes`}>Nota (opcional)</Label>
              <Textarea id={`${formId}-notes`} name="notes" maxLength={500} rows={2} defaultValue={expense?.notes ?? ""} disabled={isPending} />
            </div>
          </form>
        </DialogMobileBody>
        <DialogMobileFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isPending}>Cancelar</Button>
          </DialogClose>
          <Button type="submit" form={formId} variant="primary" size="lg" loading={isPending} disabled={isPending}>
            {expense ? "Guardar" : "Registrar gasto"}
          </Button>
        </DialogMobileFooter>
      </DialogMobileContent>
    </Sheet>
  );
}
