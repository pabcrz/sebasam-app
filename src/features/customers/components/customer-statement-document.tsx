import * as React from "react";
import Image from "next/image";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { BankDataCard } from "@/features/public-payment/components/bank-data-card";
import type { CustomerDetailedStatement } from "../customer-statement-queries";

type CustomerStatementDocumentProps = {
  statement: CustomerDetailedStatement;
  /** Set only on the copy that is exported as an image; the print copy has none. */
  id?: string;
};

type Cell = { label: string; value: string; strong?: boolean };

/**
 * The statement as a document: the same markup is printed (PDF) and exported as an
 * image. It never reads theme variables, so dark mode cannot leak into either output.
 */
export function CustomerStatementDocument({ statement, id }: CustomerStatementDocumentProps) {
  const { customer, business, notes, summary, view, rangeLabel, emissionDate, paymentActivity, availableCreditAtCutoffCents } = statement;
  const displayName = customer.commercialName || customer.name;
  const legalName = customer.commercialName ? customer.legalName || customer.name : customer.legalName;
  const businessContact = [
    business.contactPhone ? `Tel. ${business.contactPhone}` : null,
    business.contactWhatsapp ? `WhatsApp ${business.contactWhatsapp}` : null,
  ].filter(Boolean).join(" · ");
  const customerContact = [customer.phone ? `Tel. ${customer.phone}` : null, customer.email].filter(Boolean).join(" · ");

  const totalCents = notes.reduce((sum, note) => sum + note.totalCents, 0);
  const paidCents = notes.reduce((sum, note) => sum + note.paidCentsAtCutoff, 0);
  const remainingCents = notes.reduce((sum, note) => sum + Math.max(0, note.totalCents - note.paidCentsAtCutoff), 0);

  const summaryCells: Cell[] =
    view === "history"
      ? [
          { label: "Saldo inicial", value: formatCents(summary.initialBalanceCents) },
          { label: "Cargos del período", value: `+${formatCents(summary.periodChargesCents)}` },
          { label: "Abonos del período", value: `-${formatCents(summary.periodPaymentsCents)}` },
          { label: "Saldo final", value: formatCents(summary.finalBalanceCents), strong: true },
        ]
      : [
          { label: "Total facturado", value: formatCents(summary.periodChargesCents) },
          { label: "Total abonado", value: formatCents(summary.periodPaymentsCents) },
          { label: "Saldo pendiente", value: formatCents(summary.finalBalanceCents), strong: true },
          { label: "Saldo vencido", value: formatCents(summary.overdueBalanceCents) },
        ];

  return (
    <article id={id} data-testid="customer-statement-document" className="w-full bg-white p-6 text-[12px] leading-snug text-black print:p-0">
      <header className="flex items-start justify-between gap-6 border-b border-gray-300 pb-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[#004AAD]">
            <Image src="/logo-white-short.png" alt={`Logo de ${business.name}`} width={30} height={30} className="h-[30px] w-[30px] object-contain" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-extrabold leading-none tracking-tight">{business.name}</p>
            {business.fullName ? <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-600">{business.fullName}</p> : null}
            {business.address ? <p className="mt-1 text-[11px] text-gray-600">{business.address}</p> : null}
            {businessContact ? <p className="text-[11px] text-gray-600">{businessContact}</p> : null}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-bold uppercase tracking-wider">Estado de cuenta</p>
          <p className="mt-0.5 text-[11px] text-gray-600">{rangeLabel}</p>
          <p className="text-[11px] text-gray-600">Emitido el {formatDate(emissionDate)}</p>
        </div>
      </header>

      <section aria-label="Cliente" className="mt-3 grid gap-0.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Cliente</p>
        <p className="text-sm font-extrabold">{displayName}</p>
        {legalName ? <p className="text-gray-600">Razón social: {legalName}</p> : null}
        {customer.rfc ? <p className="font-mono text-gray-600">RFC: {customer.rfc}</p> : null}
        {customerContact ? <p className="text-gray-600">{customerContact}</p> : null}
        {customer.address ? <p className="text-gray-600">{customer.address}</p> : null}
      </section>

      <dl data-testid="customer-statement-summary" className="mt-4 grid grid-cols-4 gap-2">
        {summaryCells.map((cell) => (
          <div key={cell.label} className="rounded-md border border-gray-300 px-2.5 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-gray-500">{cell.label}</dt>
            <dd className={`mt-0.5 tabular-nums ${cell.strong ? "text-sm font-extrabold" : "text-sm font-semibold"}`}>{cell.value}</dd>
          </div>
        ))}
      </dl>

      <table className="mt-4 w-full border-collapse text-[11px]">
        <thead>
          <tr className="border-b border-gray-400 text-left text-[10px] uppercase tracking-wide text-gray-600">
            <th className="py-1.5 pr-2 font-semibold">Folio</th>
            <th className="py-1.5 pr-2 font-semibold">Emitida / Vence</th>
            <th className="py-1.5 pr-2 font-semibold">Concepto y vehículo</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Total</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Abonado</th>
            <th className="py-1.5 pr-2 text-right font-semibold">Saldo</th>
            <th className="py-1.5 font-semibold">Estado</th>
          </tr>
        </thead>
        <tbody>
          {notes.map((note) => (
            <tr key={note.id} className="break-inside-avoid border-b border-gray-200 align-top">
              <td className="py-1.5 pr-2 font-mono font-semibold">{note.number}</td>
              <td className="whitespace-nowrap py-1.5 pr-2">
                <span className="block">{note.completedAt ? formatDate(note.completedAt) : "—"}</span>
                <span className="block text-gray-600">{note.paymentDueDate ? formatDate(note.paymentDueDate) : "Sin vencimiento"}</span>
              </td>
              <td className="py-1.5 pr-2">
                <span className="block">{note.concepts}</span>
                {note.vehicleLabel ? <span className="block text-gray-600">{note.vehicleLabel}</span> : null}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatCents(note.totalCents)}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{formatCents(note.paidCentsAtCutoff)}</td>
              <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{formatCents(Math.max(0, note.totalCents - note.paidCentsAtCutoff))}</td>
              <td className={`py-1.5 font-semibold ${note.paymentState.label === "Vencida" ? "text-red-700" : ""}`}>{note.paymentState.label}</td>
            </tr>
          ))}
          {notes.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-4 text-center text-gray-600">
                {view === "pending" ? "La cuenta está al corriente: no hay notas con saldo pendiente." : "No hay notas completadas en el período."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <dl className="ml-auto mt-3 grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 text-right text-[12px]">
        <dt>Total de notas</dt>
        <dd className="font-semibold tabular-nums">{formatCents(totalCents)}</dd>
        <dt>Abonado al {formatDate(emissionDate)}</dt>
        <dd className="font-semibold tabular-nums">{formatCents(paidCents)}</dd>
        <dt className="font-bold">Saldo restante</dt>
        <dd className="font-bold tabular-nums">{formatCents(remainingCents)}</dd>
      </dl>

      <section
        aria-labelledby="customer-statement-payment-history-title"
        data-testid="customer-statement-payment-history"
        className="mt-4 break-inside-avoid space-y-2 border-t border-gray-300 pt-3"
      >
        <h2 id="customer-statement-payment-history-title" className="text-xs font-bold">
          Historial de abonos y saldo a favor
        </h2>
        {paymentActivity.length > 0 ? (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-gray-300 text-left">
                <th className="py-1 pr-3">Fecha</th>
                <th className="py-1 pr-3">Movimiento</th>
                <th className="py-1 text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              {paymentActivity.map((activity, index) => (
                <tr key={`${activity.type}-${activity.date.toISOString()}-${index}`} data-testid="customer-statement-payment-event">
                  <td className="py-1 pr-3">{formatDate(activity.date)}</td>
                  <td className="py-1 pr-3">
                    {activity.type === "application" ? `Abono aplicado · Nota ${activity.noteNumber}` : "Saldo a favor generado"}
                  </td>
                  <td className="py-1 text-right tabular-nums">
                    {formatCents(activity.type === "application" ? activity.amountCents : activity.availableCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-600">No hay abonos ni saldo a favor disponible a la fecha de emisión.</p>
        )}
        <p className="text-right font-semibold">
          Saldo a favor disponible al {formatDate(emissionDate)}: {formatCents(availableCreditAtCutoffCents)}
        </p>
      </section>

      <div className="-mx-4 mt-3 text-black">
        <BankDataCard bankAccounts={business.bankAccounts} isPrint />
      </div>
    </article>
  );
}
