"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import {
  buildNotePaymentRegister,
  buildNotePaymentRegisterMessage,
  createNotePaymentRegisterFile,
  type NotePaymentHistoryItem,
} from "../lib/payment-register";
import { buildPaymentReceiptMessage, createPaymentReceiptFile } from "../lib/payment-receipt";
import { paymentShareStatusMessage, sharePaymentFile } from "../lib/payment-sharing";

export function NotePaymentHistory({
  title,
  folio,
  totalCents,
  payments,
}: {
  title: string;
  folio: string;
  totalCents: number;
  payments: NotePaymentHistoryItem[];
}) {
  const register = buildNotePaymentRegister({ title, folio, totalCents, payments });
  const [status, setStatus] = React.useState<string | null>(null);

  async function shareStatement() {
    const result = await sharePaymentFile(
      createNotePaymentRegisterFile(register),
      `Estado de cuenta ${folio}`,
      buildNotePaymentRegisterMessage(register),
    );
    setStatus(result === "shared" ? "Estado de cuenta compartido." : paymentShareStatusMessage(result));
  }

  async function shareReceipt(payment: NotePaymentHistoryItem) {
    const receipt = {
      title,
      folio,
      totalCents,
      paymentCents: payment.amountCents,
      paidCents: payment.paidCentsAtPayment,
      remainingCents: payment.remainingCentsAtPayment,
      method: payment.method,
      paymentDate: payment.date,
      isReversed: payment.isReversed,
    };
    const result = await sharePaymentFile(createPaymentReceiptFile(receipt), `Recibo ${folio}`, buildPaymentReceiptMessage(receipt));
    setStatus(paymentShareStatusMessage(result));
  }

  return (
    <section className="mt-3 grid gap-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3" data-testid="nota-payment-history">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-[var(--color-text-main)]">Historial de pagos</h3>
          <p className="text-xs text-[var(--color-text-muted)]">{payments.length} registrados · Pagado {formatCents(register.paidCents)} · Saldo {formatCents(register.remainingCents)}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={shareStatement}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartir estado de cuenta
        </Button>
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No hay pagos registrados para esta nota.</p>
      ) : (
        <ol className="grid gap-2">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-[var(--color-border-light)] bg-[var(--color-surface)] p-2 text-sm">
              <div>
                <p className="font-medium text-[var(--color-text-main)]">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(payment.date))} · {payment.method === "CASH" ? "Efectivo" : payment.method === "TRANSFER" ? "Transferencia" : payment.method}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {payment.appliedCents != null ? `Aplicado ${formatCents(payment.appliedCents)} · ` : null}
                  Acumulado {formatCents(payment.paidCentsAtPayment)} · Saldo {formatCents(payment.remainingCentsAtPayment)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold tabular-nums">{formatCents(payment.amountCents)}</span>
                {payment.isReversed ? <Badge variant="danger">Revertido</Badge> : null}
                {payment.paymentStatus === undefined || payment.paymentStatus === "PAID" ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => shareReceipt(payment)} aria-label={`Compartir recibo ${formatCents(payment.amountCents)}`}>
                    <Share2 className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Compartir recibo</span>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
      {status ? <p role="status" className="text-xs text-[var(--color-status-success-fg)]">{status}</p> : null}
    </section>
  );
}
