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

type StatementNoteFilter = "all" | "pending" | "overdue" | "paid";

const statementNoteFilters: Array<{ key: StatementNoteFilter; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "pending", label: "Pendientes" },
  { key: "overdue", label: "Vencidas" },
  { key: "paid", label: "Pagadas" },
];
const statementNoteGridColumns =
  "lg:grid-cols-[minmax(7rem,0.9fr)_minmax(11rem,1.3fr)_minmax(13rem,2fr)_minmax(16rem,1.8fr)_auto]";

function getStatementNoteFilter(note: CustomerDetailedStatement["notes"][number]): Exclude<StatementNoteFilter, "all"> {
  if (note.remainingCents <= 0) return "paid";
  if (note.paymentState.label === "Vencida") return "overdue";
  return "pending";
}

function getStatementNoteCounts(notes: CustomerDetailedStatement["notes"]) {
  return notes.reduce(
    (counts, note) => {
      counts[getStatementNoteFilter(note)] += 1;
      return counts;
    },
    { all: notes.length, pending: 0, overdue: 0, paid: 0 },
  );
}

function filterStatementNotes(
  notes: CustomerDetailedStatement["notes"],
  filter: StatementNoteFilter,
) {
  return filter === "all" ? notes : notes.filter((note) => getStatementNoteFilter(note) === filter);
}

export function CustomerStatementView({ statement }: CustomerStatementViewProps) {
  const [selectedQuote, setSelectedQuote] = React.useState<QuotePreviewSummary | null>(null);
  const [noteFilter, setNoteFilter] = React.useState<StatementNoteFilter>("all");

  const {
    customer,
    emissionDate,
    view,
    period,
    anchor,
    rangeLabel,
    availableCreditCents,
    availableCreditAtCutoffCents,
    summary,
    notes,
    paymentActivity,
    business,
  } = statement;
  const printTotalCents = notes.reduce((total, note) => total + note.totalCents, 0);
  const printPaidCents = notes.reduce((total, note) => total + note.paidCentsAtCutoff, 0);
  const printRemainingCents = notes.reduce(
    (total, note) => total + Math.max(0, note.totalCents - note.paidCentsAtCutoff),
    0,
  );

  const displayName = customer.commercialName || customer.name;
  const legalSubtitle = customer.commercialName
    ? customer.legalName || customer.name
    : customer.legalName || undefined;
  const statementHref = customerStatementHref(customer.id, { view, period, anchor });
  const noteCounts = getStatementNoteCounts(notes);
  const visibleNotes = filterStatementNotes(notes, noteFilter);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto w-full print:w-full">
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 md:px-6 md:py-8 print:hidden">
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

      <div role="group" aria-label="Filtrar notas por estado" className="flex flex-wrap gap-2">
        {statementNoteFilters.map((filter) => (
          <Button
            key={filter.key}
            type="button"
            variant={noteFilter === filter.key ? "primary" : "outline"}
            size="sm"
            aria-pressed={noteFilter === filter.key}
            onClick={() => setNoteFilter(filter.key)}
          >
            {filter.label} ({noteCounts[filter.key]})
          </Button>
        ))}
      </div>

      {/* Notes Table */}
      <Card className="overflow-hidden print:overflow-visible print:border-none print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--color-border-light)] py-3 print:py-2">
          <CardTitle as="h2" className="text-base font-semibold">
            {view === "pending" ? "Notas con saldo pendiente de pago" : `Detalle de notas (${rangeLabel})`}
          </CardTitle>
          <span className="text-xs text-[var(--color-text-muted)]">
            {visibleNotes.length} nota{visibleNotes.length === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {visibleNotes.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-text-muted)]">
              {notes.length > 0
                ? "No hay notas en esta clasificación."
                : view === "pending"
                  ? "Este cliente no tiene notas con saldo pendiente. La cuenta está al corriente."
                  : "No se encontraron notas completadas en el período seleccionado."}
            </div>
          ) : (
            <div role="table" aria-label="Notas del estado de cuenta" className="w-full text-left text-sm">
              <div role="rowgroup" className="hidden border-b border-[var(--color-border-light)] bg-[var(--color-bg-soft)] text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] lg:block">
                <div role="row" className={`grid ${statementNoteGridColumns} gap-3 px-3 py-2.5`}>
                  <div role="columnheader">Nota</div>
                  <div role="columnheader">Fechas</div>
                  <div role="columnheader">Conceptos</div>
                  <div role="columnheader">Importe − Abonado = Saldo</div>
                  <div role="columnheader">Acciones</div>
                </div>
              </div>
              <div role="rowgroup" className="divide-y divide-[var(--color-border-light)]">
                {visibleNotes.map((note) => (
                  <div
                    key={note.id}
                    role="row"
                    onClick={() => setSelectedQuote(note.previewQuote)}
                    className={`grid cursor-pointer grid-cols-1 gap-3 border-b border-[var(--color-border-light)] p-3 transition-colors hover:bg-[var(--color-bg-soft)] sm:grid-cols-2 ${statementNoteGridColumns} lg:items-center`}
                    data-testid={`statement-note-${note.number}`}
                  >
                    <div
                      role="cell"
                      data-testid="statement-note-primary"
                      className="flex min-w-0 items-center justify-between gap-2"
                    >
                      <span className="font-mono font-bold text-[var(--color-text-main)]">{note.number}</span>
                      <Badge variant={note.paymentState.variant} className="shrink-0 text-[10px]">
                        {note.paymentState.label}
                      </Badge>
                    </div>
                    <div
                      role="cell"
                      data-testid="statement-note-dates"
                      className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-[var(--color-text-muted)]"
                    >
                      <span className="sr-only">Emitida:</span>
                      <span>{note.completedAt ? formatDate(note.completedAt) : "—"}</span>
                      <span aria-hidden="true">→</span>
                      <span className="sr-only">Vence:</span>
                      <span>{note.paymentDueDate ? formatDate(note.paymentDueDate) : "—"}</span>
                    </div>
                    <div role="cell" className="min-w-0 font-medium text-[var(--color-text-main)] lg:py-1">
                      <span className="sr-only">Conceptos: </span>
                      <span className="break-words">{note.concepts}</span>
                      <span className="mt-1 block text-xs font-normal text-[var(--color-text-muted)]">
                        {note.vehicleLabel}
                      </span>
                    </div>
                    <div
                      role="cell"
                      data-testid="statement-note-amounts"
                      className="grid min-w-0 gap-1 sm:col-span-2 lg:col-span-1"
                    >
                      <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs tabular-nums">
                        <span><span className="text-[var(--color-text-muted)]">Importe</span> {formatCents(note.totalCents)}</span>
                        <span aria-hidden="true">−</span>
                        <span><span className="text-[var(--color-text-muted)]">Abonado</span> {formatCents(note.paidCents)}</span>
                        <span aria-hidden="true">=</span>
                      </div>
                      <div className="text-right font-semibold tabular-nums text-[var(--color-total-emphasis)]">
                        <span className="text-xs font-medium text-[var(--color-text-muted)]">Saldo </span>
                        {formatCents(note.remainingCents)}
                      </div>
                    </div>
                    <div role="cell" aria-label={`Acciones para nota ${note.number}`} className="flex items-center justify-end gap-1.5 sm:col-span-2 lg:col-span-1">
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

      <section
        data-testid="customer-statement-print"
        className="mx-auto hidden w-full max-w-5xl space-y-5 px-[15mm] py-[12mm] print:block print:max-w-none print:break-inside-avoid"
      >
        <header className="flex items-start justify-between gap-6 border-b border-gray-400 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest">{business.name} · Estado de cuenta</p>
            <h1 className="mt-1 text-xl font-bold">{displayName}</h1>
            {legalSubtitle ? <p className="text-sm">Razón social: {legalSubtitle}</p> : null}
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">Fecha de emisión</p>
            <p>{formatDate(emissionDate)}</p>
          </div>
        </header>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-400 text-left">
              <th className="py-2 pr-3">Concepto</th>
              <th className="py-2 pr-3">Estado</th>
              <th className="py-2 pr-3 text-right">Abono</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note) => (
              <tr key={note.id} className="border-b border-gray-200">
                <td className="py-2 pr-3">{note.concepts}</td>
                <td className="py-2 pr-3">
                  {note.paidCentsAtCutoff >= note.totalCents ? "Pagada" : "Pendiente"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatCents(note.paidCentsAtCutoff)}</td>
                <td className="py-2 text-right tabular-nums">{formatCents(note.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto grid w-fit grid-cols-[auto_auto] gap-x-8 gap-y-1 text-right text-sm">
          <dt>Total de notas</dt>
          <dd className="font-semibold tabular-nums">{formatCents(printTotalCents)}</dd>
          <dt>Abonado al {formatDate(emissionDate)}</dt>
          <dd className="font-semibold tabular-nums">{formatCents(printPaidCents)}</dd>
          <dt className="font-bold">Saldo restante</dt>
          <dd className="font-bold tabular-nums">{formatCents(printRemainingCents)}</dd>
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
      </section>
    </div>
  );
}
