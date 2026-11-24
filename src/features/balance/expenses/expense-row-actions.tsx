"use client";

import * as React from "react";
import { Button } from "@/components/ui";
import { ExpenseFormDialog } from "./expense-form-dialog";
import type { ExpenseRow, SupplierOption } from "./queries";

type ExpenseRowActionsProps = {
  expense: ExpenseRow;
  month: string;
  today: string;
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  suppliers?: SupplierOption[];
};

/** Edit sheet plus a two-step delete, so one stray tap never removes a payment record. */
export function ExpenseRowActions({ expense, month, today, updateAction, deleteAction, suppliers }: ExpenseRowActionsProps) {
  const [confirming, setConfirming] = React.useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1">
      {confirming ? (
        <form action={deleteAction} className="flex items-center gap-1">
          <input type="hidden" name="month" value={month} />
          <Button type="submit" variant="danger" size="sm">Sí, eliminar</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(false)}>No</Button>
        </form>
      ) : (
        <>
          <ExpenseFormDialog action={updateAction} month={month} today={today} expense={expense} suppliers={suppliers} />
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label="Eliminar gasto">
            Eliminar
          </Button>
        </>
      )}
    </div>
  );
}
