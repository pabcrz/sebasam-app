"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { QuotePreviewDialog, type QuotePreviewSummary } from "@/features/quotes/components/quote-preview-dialog";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import { ApplyCreditDialog } from "@/features/payments/components/apply-credit-dialog";
import type { CustomerDetailedStatement } from "../customer-statement-queries";
import {
  customerStatementHref,
  shiftStatementAnchor,
  type StatementPeriodUnit,
} from "../customer-statement";

type CustomerStatementViewProps = {
  statement: CustomerDetailedStatement;
};

export function CustomerStatementView({ statement }: CustomerStatementViewProps) {
  const [selectedQuote, setSelectedQuote] = React.useState<QuotePreviewSummary | null>(null);

  const {
    customer,
    emissionDate,
    view,
    period,
    anchor,
    rangeLabel,
    availableCreditCents,
    summary,
    notes,
    bankAccounts,
    business,
  } = statement;

  const displayName = customer.commercialName || customer.name;
  const legalSubtitle = customer.commercialName
    ? customer.legalName || customer.name
    : customer.legalName || undefined;
  const statementHref = customerStatementHref(customer.id, { view, period, anchor });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:px-6 md:py-8 print:p-0 print:m-0 print:max-w-none print:w-full print:gap-4">
      {/* Screen navigation & header */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button asChild variant="ghost" size="sm" className="w-fit min-h-[44px] px-3.5">
          <Link href={`/admin/customers/${customer.id}`}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Regresar al cliente
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            aria-label="Imprimir estado de cuenta"
            className="flex min-h-[44px] items-center gap-1.5 px-3.5"
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            <span>Imprimir / PDF</span>
          </Button>
        </div>
      </div>

      {/* Printable / Document Header */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-6 shadow-sm print:border-none print:shadow-none print:p-0 print:break-inside-avoid">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-light)] pb-4 print:pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest uppercase text-[var(--color-primary)]">
                {business.name}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">· Estado de cuenta</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-text-main)] print:text-xl">
              {displayName}
            </h1>
            {legalSubtitle ? (
              <p className="text-sm text-[var(--color-text-muted)] print:text-xs">Razón social: {legalSubtitle}</p>
            ) : null}
            {customer.rfc ? (
              <p className="font-mono text-xs text-[var(--color-text-muted)]">RFC: {customer.rfc}</p>
            ) : null}
          </div>

          <div className="text-right text-sm print:text-xs">
            <p className="font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Fecha de emisión</p>
            <p className="font-medium text-[var(--color-text-main)]">{formatDate(emissionDate)}</p>
            <p className="mt-2 font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Período</p>
            <p className="font-medium text-[var(--color-text-main)]">{rangeLabel}</p>
          </div>
        </div>

        {/* Contact info strip */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
          <div>
            {customer.phone ? <span>Tel: {customer.phone}</span> : null}
            {customer.phone && customer.email ? <span> · </span> : null}
            {customer.email ? <span>{customer.email}</span> : null}
            {customer.address ? <p className="mt-0.5">{customer.address}</p> : null}
          </div>
          <div className="text-right">
            <p>{business.fullName}</p>
            <p>{business.address}</p>
          </div>
        </div>
      </div>

      {/* Screen-only Controls: View Switcher and Period Selector */}
      <div className="grid gap-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-light)] pb-3">
          {/* Main View Mode */}
          <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] p-1">
            <Button
              asChild
              variant={view === "pending" ? "primary" : "ghost"}
              size="sm"
              className="min-h-[44px] px-3 text-xs font-medium shrink"
            >
              <Link href={customerStatementHref(customer.id, { view: "pending" })}>Notas con saldo pendiente</Link>
            </Button>
            <Button
              asChild
              variant={view === "history" ? "primary" : "ghost"}
              size="sm"
              className="min-h-[44px] px-3 text-xs font-medium shrink"
            >
              <Link href={customerStatementHref(customer.id, { view: "history", period: "month", anchor })}>
                Historial por período
              </Link>
            </Button>
          </div>

          {/* Granularity Selector when in History Mode */}
          <div className="min-h-[44px] flex items-center">
            {view === "history" ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-soft)] p-1">
                  {(["week", "month", "year", "all"] as const).map((p) => {
                    const labels: Record<StatementPeriodUnit, string> = {
                      week: "Semana",
                      month: "Mes",
                      year: "Año",
                      all: "Todo",
                    };
                    return (
                      <Button
                        key={p}
                        asChild
                        variant={period === p ? "primary" : "ghost"}
                        size="sm"
                        className="min-h-[44px] px-3 text-xs font-medium"
                      >
                        <Link href={customerStatementHref(customer.id, { view: "history", period: p, anchor })}>
                          {labels[p]}
                        </Link>
                      </Button>
                    );
                  })}
                </div>

                {period !== "all" ? (
                  <div className="flex items-center gap-1">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] p-0 flex items-center justify-center"
                      aria-label="Período anterior"
                      title="Período anterior"
                    >
                      <Link
                        href={customerStatementHref(customer.id, {
                          view: "history",
                          period,
                          anchor: shiftStatementAnchor(period, anchor, -1),
                        })}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Link>
                    </Button>
                    <span className="px-2 text-xs font-medium text-[var(--color-text-main)] min-w-28 text-center">
                      {rangeLabel}
                    </span>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="min-h-[44px] min-w-[44px] p-0 flex items-center justify-center"
                      aria-label="Período siguiente"
                      title="Período siguiente"
                    >
                      <Link
                        href={customerStatementHref(customer.id, {
                          view: "history",
                          period,
                          anchor: shiftStatementAnchor(period, anchor, 1),
                        })}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:break-inside-avoid">
        {view === "history" ? (
          <>
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Saldo inicial</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-text-main)]">
                {formatCents(summary.initialBalanceCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Antes del inicio del período</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Cargos del período</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-text-main)]">
                +{formatCents(summary.periodChargesCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Notas completadas en el rango</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Abonos del período</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-status-success-fg)]">
                -{formatCents(summary.periodPaymentsCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Pagos aplicados en el rango</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 shadow-sm border-l-4 border-l-[var(--color-primary)]">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-primary)]">Saldo final</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                {formatCents(summary.finalBalanceCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Saldo total a la fecha</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Total facturado</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-text-main)]">
                {formatCents(summary.periodChargesCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Notas vivas pendientes</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Total abonado</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-[var(--color-status-success-fg)]">
                {formatCents(summary.periodPaymentsCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Abonos aplicados a la fecha</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 shadow-sm border-l-4 border-l-[var(--color-status-warning)]">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-status-warning-fg)]">Saldo pendiente</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                {formatCents(summary.finalBalanceCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Saldo neto por cobrar</p>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 shadow-sm border-l-4 border-l-[var(--color-status-danger)]">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-status-danger-fg)]">Saldo vencido</p>
              <p className="mt-1 text-lg font-extrabold tabular-nums text-[var(--color-status-danger-fg)]">
                {formatCents(summary.overdueBalanceCents)}
              </p>
              <p className="text-[10px] text-[var(--color-text-muted)]">Superó fecha límite en CDMX</p>
            </div>
          </>
        )}
      </div>

      {/* Available Credit Banner */}
      {availableCreditCents > 0 ? (
        <div
          data-testid="customer-available-credit-banner"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] p-3 text-xs text-[var(--color-status-success-fg)] shadow-sm print:hidden"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider">Saldo a favor disponible:</span>
            <span className="text-base font-bold tabular-nums">
              {formatCents(availableCreditCents)}
            </span>
          </div>
          <span className="text-[11px] opacity-90">
            Puedes aplicar este saldo directamente a las notas con saldo pendiente.
          </span>
        </div>
      ) : null}

      {/* Notes Table */}
      <Card className="overflow-hidden print:overflow-visible print:border-none print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border-light)] py-3 print:py-2">
          <CardTitle as="h2" className="text-base font-semibold">
            {view === "pending" ? "Notas con saldo pendiente de pago" : `Detalle de notas (${rangeLabel})`}
          </CardTitle>
          <span className="text-xs text-[var(--color-text-muted)]">
            {notes.length} nota{notes.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {notes.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
              {view === "pending"
                ? "Este cliente no tiene notas con saldo pendiente. La cuenta está al corriente."
                : "No se encontraron notas completadas en el período seleccionado."}
            </div>
          ) : (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs print:table-fixed print:w-full print:text-[10px]">
                {/* Fixed printable columns summing to exactly 100%: 8+9+9+22+15+9+9+9+10 = 100% */}
                <colgroup className="hidden print:table-column-group">
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[22%]" />
                  <col className="w-[15%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[9%]" />
                  <col className="w-[10%]" />
                </colgroup>
                <thead className="border-b border-[var(--color-border-light)] bg-[var(--color-bg-soft)] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold print:table-header-group">
                  <tr>
                    <th className="py-2.5 px-3 print:py-1.5 print:px-2">Folio</th>
                    <th className="py-2.5 px-3 print:py-1.5 print:px-2">Fecha</th>
                    <th className="py-2.5 px-3 print:py-1.5 print:px-2">Vencimiento</th>
                    <th className="py-2.5 px-3 print:py-1.5 print:px-2">Trabajos / Conceptos</th>
                    <th className="py-2.5 px-3 print:py-1.5 print:px-2">Vehículo</th>
                    <th className="py-2.5 px-3 text-right print:py-1.5 print:px-2">Importe</th>
                    <th className="py-2.5 px-3 text-right print:py-1.5 print:px-2">Abonado</th>
                    <th className="py-2.5 px-3 text-right print:py-1.5 print:px-2">Saldo</th>
                    <th className="py-2.5 px-3 text-center print:py-1.5 print:px-2">Estado</th>
                    <th className="py-2.5 px-3 text-right print:hidden">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-light)]">
                  {notes.map((note) => (
                    <tr
                      key={note.id}
                      onClick={() => setSelectedQuote(note.previewQuote)}
                      className="cursor-pointer transition-colors hover:bg-[var(--color-bg-soft)] print:cursor-default print:break-inside-avoid"
                      data-testid={`statement-note-${note.number}`}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-[var(--color-text-main)] print:py-1.5 print:px-2 print:break-all print:text-[9px]">
                        {note.number}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-text-muted)] print:py-1.5 print:px-2 print:whitespace-normal">
                        {note.completedAt ? formatDate(note.completedAt) : "—"}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[var(--color-text-muted)] print:py-1.5 print:px-2 print:whitespace-normal">
                        {note.paymentDueDate ? formatDate(note.paymentDueDate) : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-[var(--color-text-main)] max-w-xs truncate print:py-1.5 print:px-2 print:max-w-none print:whitespace-normal print:break-words">
                        {note.concepts}
                      </td>
                      <td className="py-2.5 px-3 text-[var(--color-text-muted)] whitespace-nowrap print:py-1.5 print:px-2 print:whitespace-normal print:break-words">
                        {note.vehicleLabel}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--color-text-main)] print:py-1.5 print:px-2">
                        {formatCents(note.totalCents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[var(--color-status-success-fg)] print:py-1.5 print:px-2">
                        {formatCents(note.paidCents)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-[var(--color-total-emphasis)] print:py-1.5 print:px-2">
                        {formatCents(note.remainingCents)}
                      </td>
                      <td className="py-2.5 px-3 text-center print:py-1.5 print:px-2">
                        <Badge variant={note.paymentState.variant} className="text-[10px] py-0 px-2 print:text-[9px] print:border print:px-1.5">
                          {note.paymentState.label}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          {view === "pending" && note.remainingCents > 0 && availableCreditCents > 0 ? (
                            <ApplyCreditDialog
                              customerId={customer.id}
                              workOrderId={note.workOrderId}
                              noteNumber={note.number}
                              remainingCents={note.remainingCents}
                              availableCreditCents={availableCreditCents}
                            />
                          ) : null}
                          <PrintActionButton
                            url={`/admin/notas/${note.workOrderId}/print?returnTo=${encodeURIComponent(statementHref)}`}
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] min-w-[44px] p-0 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center justify-center"
                            aria-label={`Imprimir nota ${note.number}`}
                            title={`Imprimir nota ${note.number}`}
                          >
                            <Printer className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Imprimir nota</span>
                          </PrintActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank transfer info (Printed and screen reference) */}
      {bankAccounts.length > 0 ? (
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4 text-xs print:break-inside-avoid">
          <p className="font-bold uppercase tracking-wider text-[var(--color-text-main)] mb-2">
            Cuentas bancarias autorizadas para transferencias o depósitos:
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                className="rounded border border-[var(--color-border-light)] bg-[var(--color-surface)] p-2.5"
              >
                <p className="font-bold text-[var(--color-text-main)]">{acc.bankName}</p>
                <p className="text-[var(--color-text-muted)]">Beneficiario: {acc.accountHolder}</p>
                <p className="font-mono text-[var(--color-text-main)] font-semibold mt-1">CLABE: {acc.clabe}</p>
                {acc.accountNumber ? (
                  <p className="font-mono text-[var(--color-text-muted)]">Cuenta: {acc.accountNumber}</p>
                ) : null}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] text-[var(--color-text-muted)]">
            Favor de enviar su comprobante de pago vía WhatsApp al {business.contactWhatsapp} indicando el folio de la nota.
          </p>
        </div>
      ) : null}

      {/* Interactive Note Preview Modal */}
      {selectedQuote ? (
        <QuotePreviewDialog
          quote={selectedQuote}
          open={Boolean(selectedQuote)}
          onOpenChange={(open) => {
            if (!open) setSelectedQuote(null);
          }}
          showTrigger={false}
        />
      ) : null}
    </div>
  );
}
