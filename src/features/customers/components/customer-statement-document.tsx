import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { BankDataCard } from "@/features/public-payment/components/bank-data-card";
import type { CustomerDetailedStatement } from "../customer-statement-queries";

export const STATEMENT_DOCUMENT_ID = "customer-statement-document";

type CustomerStatementDocumentProps = {
  statement: CustomerDetailedStatement;
  displayName: string;
  customerSubtitle?: string;
};

/**
 * Document projection of the statement: the same template feeds print/PDF and
 * the shared image. Off-screen (not display:none) so it can be rasterized.
 */
export function CustomerStatementDocument({ statement, displayName, customerSubtitle }: CustomerStatementDocumentProps) {
  const { emissionDate, view, rangeLabel, summary, notes, paymentActivity, availableCreditAtCutoffCents, business } = statement;
  const totalCents = notes.reduce((total, note) => total + note.totalCents, 0);
  const paidCents = notes.reduce((total, note) => total + note.paidCentsAtCutoff, 0);
  const remainingCents = notes.reduce((total, note) => total + Math.max(0, note.totalCents - note.paidCentsAtCutoff), 0);

  const summaryItems =
    view === "history"
      ? [
          ["Saldo inicial", formatCents(summary.initialBalanceCents)],
          ["Cargos del período", `+${formatCents(summary.periodChargesCents)}`],
          ["Abonos del período", `-${formatCents(summary.periodPaymentsCents)}`],
          ["Saldo final", formatCents(summary.finalBalanceCents)],
        ]
      : [
          ["Total facturado", formatCents(summary.periodChargesCents)],
          ["Total abonado", formatCents(summary.periodPaymentsCents)],
          ["Saldo pendiente", formatCents(summary.finalBalanceCents)],
          ["Saldo vencido", formatCents(summary.overdueBalanceCents)],
        ];

  return (
    <section
      id={STATEMENT_DOCUMENT_ID}
      data-testid="customer-statement-print"
      aria-hidden="true"
      className="pointer-events-none absolute -left-[10000px] top-0 w-[820px] bg-white text-slate-900 print:pointer-events-auto print:static print:w-full [&>div]:!min-h-0 print:[&>div]:!min-h-[255mm]"
    >
      <PublicQuoteShell
        business={{
          businessName: business.name,
          fullName: business.fullName,
          phone: business.contactPhone,
          whatsapp: business.contactWhatsapp,
        }}
        location={{ address: business.address }}
        documentType="Estado de cuenta"
        documentNumber={rangeLabel}
        date={emissionDate}
        customerName={displayName}
        customerSubtitle={customerSubtitle}
      >
        <div className="space-y-5">
          <dl data-testid="customer-statement-summary" className="grid grid-cols-4 gap-3 text-xs">
            {summaryItems.map(([label, value]) => (
              <div key={label} className="rounded border border-gray-300 p-2">
                <dt className="text-gray-600">{label}</dt>
                <dd className="text-sm font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-400 text-left">
                <th className="py-2 pr-2">Folio</th>
                <th className="py-2 pr-2">Emitida</th>
                <th className="py-2 pr-2">Vence</th>
                <th className="py-2 pr-2">Concepto</th>
                <th className="py-2 pr-2 text-right">Total</th>
                <th className="py-2 pr-2 text-right">Abonado</th>
                <th className="py-2 pr-2 text-right">Saldo</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note.id} className="border-b border-gray-200 align-top">
                  <td className="py-2 pr-2 font-mono">{note.number}</td>
                  <td className="py-2 pr-2">{note.completedAt ? formatDate(note.completedAt) : "—"}</td>
                  <td className="py-2 pr-2">{note.paymentDueDate ? formatDate(note.paymentDueDate) : "—"}</td>
                  <td className="py-2 pr-2">
                    {note.concepts}
                    <span className="block text-gray-600">{note.vehicleLabel}</span>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatCents(note.totalCents)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">{formatCents(note.paidCentsAtCutoff)}</td>
                  <td className="py-2 pr-2 text-right tabular-nums">
                    {formatCents(Math.max(0, note.totalCents - note.paidCentsAtCutoff))}
                  </td>
                  <td className="py-2">{note.paymentState.label}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 text-right text-sm">
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
            className="space-y-2 border-t border-gray-300 pt-4"
          >
            <h2 id="customer-statement-payment-history-title" className="text-sm font-bold">
              Historial de abonos y saldo a favor
            </h2>
            {paymentActivity.length > 0 ? (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-300 text-left">
                    <th className="py-1.5 pr-3">Fecha</th>
                    <th className="py-1.5 pr-3">Movimiento</th>
                    <th className="py-1.5 text-right">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentActivity.map((activity, index) => (
                    <tr key={`${activity.type}-${activity.date.toISOString()}-${index}`} data-testid="customer-statement-payment-event">
                      <td className="py-1.5 pr-3">{formatDate(activity.date)}</td>
                      <td className="py-1.5 pr-3">
                        {activity.type === "application"
                          ? `Abono aplicado · Nota ${activity.noteNumber}`
                          : "Saldo a favor generado"}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        {formatCents(activity.type === "application" ? activity.amountCents : activity.availableCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-gray-600">No hay abonos ni saldo a favor disponible a la fecha de emisión.</p>
            )}
            <p className="text-right text-sm font-semibold">
              Saldo a favor disponible al {formatDate(emissionDate)}: {formatCents(availableCreditAtCutoffCents)}
            </p>
          </section>
          <div className="-mx-4"><BankDataCard bankAccounts={business.bankAccounts} isPrint /></div>
        </div>
      </PublicQuoteShell>
    </section>
  );
}
