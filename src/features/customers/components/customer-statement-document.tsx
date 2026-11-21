import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { PublicQuoteShell } from "@/features/public-quotes/components/public-quote-shell";
import { BankDataCard } from "@/features/public-payment/components/bank-data-card";
import type { CustomerDetailedStatement, CustomerStatementSummary } from "../customer-statement-queries";
import type { StatementView } from "../customer-statement";

export type StatementSummaryRow = {
  label: string;
  value: string;
  info: string;
  tone?: "success" | "warning" | "danger";
};

/** One source for the summary shown on screen and on the printed/shared document. */
export function getStatementSummaryRows(view: StatementView, summary: CustomerStatementSummary): StatementSummaryRow[] {
  if (view === "history") {
    return [
      { label: "Saldo inicial", value: formatCents(summary.initialBalanceCents), info: "Antes del inicio del período" },
      { label: "Cargos del período", value: `+${formatCents(summary.periodChargesCents)}`, info: "Notas completadas en el rango" },
      { label: "Abonos del período", value: `-${formatCents(summary.periodPaymentsCents)}`, info: "Pagos aplicados en el rango", tone: "success" },
      { label: "Saldo final", value: formatCents(summary.finalBalanceCents), info: "Saldo total a la fecha" },
    ];
  }
  return [
    { label: "Total facturado", value: formatCents(summary.periodChargesCents), info: "Notas vivas pendientes" },
    { label: "Total abonado", value: formatCents(summary.periodPaymentsCents), info: "Abonos aplicados a la fecha", tone: "success" },
    { label: "Saldo pendiente", value: formatCents(summary.finalBalanceCents), info: "Saldo neto por cobrar", tone: "warning" },
    { label: "Saldo vencido", value: formatCents(summary.overdueBalanceCents), info: "Superó fecha límite en CDMX", tone: "danger" },
  ];
}

export const CUSTOMER_STATEMENT_DOCUMENT_ID = "customer-statement-document";

type CustomerStatementDocumentProps = {
  statement: CustomerDetailedStatement;
  /** Only the copy used for image export carries the id, so the print copy never duplicates it. */
  id?: string;
};

export function CustomerStatementDocument({ statement, id }: CustomerStatementDocumentProps) {
  const { customer, emissionDate, view, rangeLabel, summary, notes, paymentActivity, availableCreditAtCutoffCents, business } =
    statement;
  const displayName = customer.commercialName || customer.name;
  const legalName = customer.commercialName ? customer.legalName || customer.name : customer.legalName;
  const customerSubtitle =
    [
      legalName ? `Razón social: ${legalName}` : null,
      customer.rfc ? `RFC: ${customer.rfc}` : null,
      customer.phone ? `Tel: ${customer.phone}` : null,
      customer.address,
    ]
      .filter(Boolean)
      .join(" · ") || undefined;
  const totalCents = notes.reduce((total, note) => total + note.totalCents, 0);
  const paidCents = notes.reduce((total, note) => total + note.paidCents, 0);
  const remainingCents = notes.reduce((total, note) => total + note.remainingCents, 0);

  return (
    <div id={id} className="bg-white [&>div]:min-h-0">
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
          <dl
            aria-label="Resumen del período"
            className="grid grid-cols-2 gap-3 rounded-md border border-gray-300 p-3 text-sm sm:grid-cols-4 print:grid-cols-4"
          >
            {getStatementSummaryRows(view, summary).map((row) => (
              <div key={row.label}>
                <dt className="text-xs text-gray-600">{row.label}</dt>
                <dd className="font-semibold tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-400 text-left">
                  <th className="py-2 pr-2">Folio</th>
                  <th className="py-2 pr-2">Emitida</th>
                  <th className="py-2 pr-2">Vence</th>
                  <th className="py-2 pr-2">Vehículo</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 pr-2 text-right">Abonado</th>
                  <th className="py-2 pr-2 text-right">Saldo</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {notes.map((note) => (
                  <tr key={note.id} className="border-b border-gray-200 align-top">
                    <td className="py-1.5 pr-2 whitespace-nowrap font-mono font-semibold">{note.number}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{note.completedAt ? formatDate(note.completedAt) : "—"}</td>
                    <td className="py-1.5 pr-2 whitespace-nowrap">{note.paymentDueDate ? formatDate(note.paymentDueDate) : "—"}</td>
                    <td className="py-1.5 pr-2">{note.vehicleLabel}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatCents(note.totalCents)}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{formatCents(note.paidCents)}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{formatCents(note.remainingCents)}</td>
                    <td className={note.paymentState.label === "Vencida" ? "py-1.5 font-semibold text-red-700" : "py-1.5"}>
                      {note.paymentState.label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {notes.length === 0 ? <p className="py-3 text-center text-xs text-gray-600">Sin notas en este período.</p> : null}
          </div>

          <dl className="ml-auto grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 text-right text-sm">
            <dt>Total de notas</dt>
            <dd className="font-semibold tabular-nums">{formatCents(totalCents)}</dd>
            <dt>Abonado al {formatDate(emissionDate)}</dt>
            <dd className="font-semibold tabular-nums">{formatCents(paidCents)}</dd>
            <dt className="font-bold">Saldo restante</dt>
            <dd className="font-bold tabular-nums">{formatCents(remainingCents)}</dd>
          </dl>

          <section
            aria-labelledby={`${id ?? "print"}-payment-history-title`}
            data-testid="customer-statement-payment-history"
            className="space-y-2 border-t border-gray-300 pt-4"
          >
            <h2 id={`${id ?? "print"}-payment-history-title`} className="text-sm font-bold">
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
                        {activity.type === "application" ? `Abono aplicado · Nota ${activity.noteNumber}` : "Saldo a favor generado"}
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
          <div className="-mx-4">
            <BankDataCard bankAccounts={business.bankAccounts} isPrint />
          </div>
        </div>
      </PublicQuoteShell>
    </div>
  );
}
