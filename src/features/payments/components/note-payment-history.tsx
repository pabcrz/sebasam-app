"use client";

import * as React from "react";
import { Download, Share2 } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import {
  buildNotePaymentRegister,
  buildNotePaymentRegisterMessage,
  createNotePaymentRegisterFile,
  type NotePaymentHistoryItem,
} from "../lib/payment-register";
import { buildPaymentReceiptMessage, createPaymentReceiptFile } from "../lib/payment-receipt";
import { downloadPaymentFile, paymentShareStatusMessage, sharePaymentFile } from "../lib/payment-sharing";

export function NotePaymentHistory({
  title,
  folio,
  totalCents,
  customerName = "Cliente",
  payments,
}: {
  title: string;
  folio: string;
  totalCents: number;
  customerName?: string;
  payments: NotePaymentHistoryItem[];
}) {
  const register = buildNotePaymentRegister({ title, folio, totalCents, customerName, payments });
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
      customerName,
      paidCents: payment.paidCentsAtPayment,
      remainingCents: payment.remainingCentsAtPayment,
      method: payment.method,
      paymentDate: payment.date,
      isReversed: payment.isReversed,
      sequence: payments.indexOf(payment) + 1,
    };
    const result = await sharePaymentFile(createPaymentReceiptFile(receipt), `Recibo ${folio}`, buildPaymentReceiptMessage(receipt));
    setStatus(paymentShareStatusMessage(result));
  }

  return (
    <section className="mt-3 grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] p-4 shadow-[var(--shadow-xs)]" data-testid="nota-payment-history">
       <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
         <div className="min-w-0">
          <h3 className="font-semibold text-[var(--color-text-main)]">Historial de pagos</h3>
           <p className="text-xs text-[var(--color-text-muted)]">{payments.length} {payments.length === 1 ? "pago registrado" : "pagos registrados"}</p>
        </div>
          <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="max-w-full" onClick={shareStatement}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          Compartir estado de cuenta
         </Button>
          <Button type="button" variant="outline" size="sm" className="max-w-full" onClick={() => downloadPaymentFile(createNotePaymentRegisterFile(register))}>
           <Download className="h-4 w-4" aria-hidden="true" /> Descargar PNG
         </Button>
         </div>
      </div>
      {payments.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No hay pagos registrados para esta nota.</p>
      ) : (
        <ol className="grid gap-2">
           {payments.map((payment, index) => (
             <li key={payment.id} className="grid min-w-0 gap-3 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-3 text-sm shadow-[var(--shadow-xs)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
               <div className="min-w-0">
                 <p className="truncate font-medium text-[var(--color-text-main)]">{new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.date))} · {payment.method === "CASH" ? "Efectivo" : payment.method === "TRANSFER" ? "Transferencia" : payment.method}</p>
                 <p className="text-xs text-[var(--color-text-muted)]">Abono #{index + 1} · {payment.isReversed ? "Pago revertido" : payment.isCorrected ? "Pago corregido" : payment.paymentStatus === "PENDING" ? "Pendiente" : payment.paymentStatus === "FAILED" ? "Fallido" : payment.remainingCentsAtPayment <= 0 ? "Nota liquidada" : "Pago registrado"}</p>
                 <p className="text-xs text-[var(--color-text-muted)]">Saldo después de este pago: {formatCents(payment.remainingCentsAtPayment)}</p>
               </div>
                 <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-subtle)] pt-2 sm:border-t-0 sm:pt-0">
                  <span className="shrink-0 font-semibold tabular-nums">{formatCents(payment.amountCents)}</span>
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    {payment.isReversed ? <Badge variant="danger">Revertido</Badge> : null}
                   {!payment.isReversed && payment.paymentStatus === "PENDING" ? <Badge variant="warning">Pendiente</Badge> : null}
                   {!payment.isReversed && payment.paymentStatus === "FAILED" ? <Badge variant="danger">Fallido</Badge> : null}
                   {!payment.isReversed && (payment.paymentStatus === undefined || payment.paymentStatus === "PAID") ? (
                     <>
                       <Button type="button" variant="ghost" size="sm" onClick={() => shareReceipt(payment)} aria-label={`Compartir recibo ${formatCents(payment.amountCents)}`}>
                         <Share2 className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Compartir recibo</span>
                       </Button>
                       <Button type="button" variant="ghost" size="sm" onClick={() => downloadPaymentFile(createPaymentReceiptFile({ title, folio, totalCents, customerName, paymentCents: payment.amountCents, paidCents: payment.paidCentsAtPayment, remainingCents: payment.remainingCentsAtPayment, method: payment.method, paymentDate: payment.date, isReversed: payment.isReversed, sequence: index + 1 }))} aria-label={`Descargar recibo ${formatCents(payment.amountCents)}`}>
                         <Download className="h-4 w-4" aria-hidden="true" /><span className="sr-only">Descargar PNG</span>
                       </Button>
                     </>
                   ) : null}
                 </div>
               </div>
             </li>
          ))}
        </ol>
      )}
      {status ? <p role="status" className="text-xs text-[var(--color-status-success-fg)]">{status}</p> : null}
    </section>
  );
}
