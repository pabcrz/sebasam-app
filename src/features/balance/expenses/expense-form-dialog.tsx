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
import { defaultPartsShareFor, EXPENSE_CATEGORIES, EXPENSE_INVOICE_LABELS, EXPENSE_PAYMENT_METHODS } from "./categories";
import type { ExpenseRow } from "./queries";

type ExpenseFormDialogProps = {
  action: (formData: FormData) => void | Promise<void>;
  /** "YYYY-MM": the month the form returns to and the default date's month. */
  month: string;
  /** Today's date as "YYYY-MM-DD" (Mexico City), the default date of a new expense. */
  today: string;
  expense?: ExpenseRow;
};

function pesosText(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Sheet with the expense form; creates a new expense or edits `expense`. */
export function ExpenseFormDialog({ action, month, today, expense }: ExpenseFormDialogProps) {
  const formId = React.useId();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);
  const [category, setCategory] = React.useState<string>(expense?.category ?? "RENT");
  const [invoiceStatus, setInvoiceStatus] = React.useState<string>(expense?.invoiceStatus ?? "NOT_INVOICED");
  const [partsShare, setPartsShare] = React.useState<string>(String(expense?.partsSharePercent ?? defaultPartsShareFor("RENT")));
  const [paymentMethod, setPaymentMethod] = React.useState<string>(expense?.paymentMethod ?? "");
  const title = expense ? "Editar gasto" : "Nuevo gasto";

  function changeCategory(next: string) {
    setCategory(next);
    // A new expense proposes the category's share; an existing one keeps what was saved unless the category changes.
    setPartsShare(String(defaultPartsShareFor(next as never)));
  }

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
          <DialogDescription>Registra lo que se pagó. La factura y el reparto entre cuentas se eligen por cada gasto.</DialogDescription>
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
              <Select name="category" value={category} onValueChange={changeCategory} disabled={isPending}>
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

            <div className="grid gap-2">
              <Label htmlFor={`${formId}-share`}>Porcentaje a refacciones</Label>
              <Input id={`${formId}-share`} name="partsSharePercent" type="number" inputMode="numeric" min="0" max="100" step="1" required value={partsShare} onChange={(event) => setPartsShare(event.target.value)} disabled={isPending} />
              <p className="text-xs text-[var(--color-text-muted)]">El resto se carga a mano de obra. 0 = todo a mano de obra, 100 = todo a refacciones y materiales.</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`${formId}-supplier`}>Proveedor (opcional)</Label>
                <Input id={`${formId}-supplier`} name="supplier" maxLength={120} defaultValue={expense?.supplier ?? ""} disabled={isPending} />
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
