import type { Metadata } from "next";
import Link from "next/link";
import { QuoteStatus, WorkOrderStatus } from "@prisma/client";
import {
  createQuoteFromForm,
  cancelDraftQuoteFromForm,
  approveQuoteAndCreateWorkOrderFromForm,
} from "@/features/quotes/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import { getOrCreatePaymentRequestForQuote } from "@/features/payment-requests/actions";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { QuoteBuilder } from "@/features/quotes/components/quote-builder";
import { QuoteApprovalForm } from "@/features/quotes/components/quote-approval-form";
import { QuoteCancelForm } from "@/features/quotes/components/quote-cancel-form";
import { PaymentRequestLinkDialog } from "@/features/payment-requests/components/payment-request-link-dialog";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

type QuotesPageProps = {
  searchParams: Promise<{
    approved?: string;
    created?: string;
    updated?: string;
    cancelled?: string;
    error?: string;
  }>;
};

const quoteStatusLabels: Record<QuoteStatus, string> = {
  DRAFT: "Borrador",
  SENT: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const quoteStatusBadgeVariant: Record<QuoteStatus, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "danger",
};

const workOrderStatusLabels: Record<WorkOrderStatus, string> = {
  PLANNED: "Planeada",
  ASSIGNED: "Asignada",
  IN_PROGRESS: "En proceso",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
};

const workOrderStatusBadgeVariant: Record<
  WorkOrderStatus,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  PLANNED: "default",
  ASSIGNED: "info",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const [customers, quotes] = await Promise.all([listCustomers(), listQuotes()]);

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <Card>
        <CardHeader>
          <CardDescription>Gestión de cotizaciones</CardDescription>
          <CardTitle as="h1">Cotizaciones en borrador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base md:leading-7">
            Crea cotizaciones en borrador para clientes existentes con subtotales y totales calculados en el servidor.
          </p>
          {params.created ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
              Cotización en borrador creada.
            </p>
          ) : null}
          {params.approved ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
              Cotización aprobada y orden de trabajo creada.
            </p>
          ) : null}
          {params.updated ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
              Cotización en borrador actualizada.
            </p>
          ) : null}
          {params.cancelled ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-success-border)] bg-[var(--color-status-success-bg)] px-4 py-3 text-sm text-[var(--color-status-success-fg)]">
              Cotización cancelada.
            </p>
          ) : null}
          {params.error === "invalid" ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Revisa los datos de la cotización e incluye al menos un concepto completo.
            </p>
          ) : null}
          {params.error === "invalid-approval" ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Selecciona una cotización válida antes de aprobar.
            </p>
          ) : null}
          {params.error === "duplicate-work-order" ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              Esta cotización ya tiene una orden de trabajo.
            </p>
          ) : null}
          {params.error === "approval-failed" ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              No se pudo aprobar la cotización. Recarga y confirma que siga en borrador.
            </p>
          ) : null}
          {params.error === "not-draft" ? (
            <p className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]" role="alert">
              La cotización ya no está en borrador. No se puede editar ni cancelar.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <QuoteBuilder customers={customers} createAction={createQuoteFromForm} />

      <Card>
        <CardHeader>
          <CardTitle as="h2">Cotizaciones recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Orden de trabajo</TableHead>
                  <TableHead>Conceptos</TableHead>
                  <TableHead>Subtotal</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Vigente hasta</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.number}</TableCell>
                    <TableCell>{quote.customer.name}</TableCell>
                    <TableCell>
                      {quote.vehicle
                        ? formatVehicle(quote.vehicle)
                        : formatSnapshotVehicle(quote.vehicleSnapshot)}
                    </TableCell>
                    <TableCell>{quote.title}</TableCell>
                    <TableCell>
                      <Badge variant={quoteStatusBadgeVariant[quote.status]}>
                        {quoteStatusLabels[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {quote.workOrder ? (
                        <Badge variant={workOrderStatusBadgeVariant[quote.workOrder.status]}>
                          {quote.workOrder.number} — {workOrderStatusLabels[quote.workOrder.status]}
                        </Badge>
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">Ninguna</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ul className="grid gap-1">
                        {quote.items.map((item) => (
                          <li key={item.id}>
                            {item.description} — {Number(item.quantity).toFixed(2)} ×{" "}
                            {formatCents(item.unitPriceCents)} = {formatCents(item.totalCents)}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell>{formatCents(quote.subtotalCents)}</TableCell>
                    <TableCell>{formatCents(quote.taxCents)}</TableCell>
                    <TableCell className="font-medium">{formatCents(quote.totalCents)}</TableCell>
                    <TableCell>{quote.validUntil ? formatDate(quote.validUntil) : "—"}</TableCell>
                    <TableCell>
                      <div className="grid gap-2">
                        {quote.status === "DRAFT" && !quote.workOrder ? (
                          <>
                            <Button asChild variant="outline" className="w-full">
                              <Link href={`/admin/quotes/${quote.id}/edit`}>Editar</Link>
                            </Button>
                            <QuoteApprovalForm
                              action={approveQuoteAndCreateWorkOrderFromForm}
                              quoteId={quote.id}
                              quoteNumber={quote.number}
                            />
                            <QuoteCancelForm
                              action={cancelDraftQuoteFromForm}
                              quoteId={quote.id}
                              quoteNumber={quote.number}
                            />
                          </>
                        ) : quote.status === "SENT" || quote.status === "APPROVED" ? (
                          <PaymentRequestLinkDialog
                            action={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
                            quoteNumber={quote.number}
                          />
                        ) : (
                          <span className="text-sm text-[var(--color-text-muted)]">Sin acción</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-6 text-center text-[var(--color-text-muted)]">
                      No se encontraron cotizaciones.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text-main)]">{quote.number}</p>
                    <p className="truncate text-sm text-[var(--color-text-muted)]">{quote.customer.name}</p>
                  </div>
                  <Badge variant={quoteStatusBadgeVariant[quote.status]}>{quoteStatusLabels[quote.status]}</Badge>
                </div>

                <p className="mt-2 text-sm font-medium text-[var(--color-text-main)]">{quote.title}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {quote.vehicle ? formatVehicle(quote.vehicle) : formatSnapshotVehicle(quote.vehicleSnapshot)}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {quote.workOrder ? (
                    <Badge variant={workOrderStatusBadgeVariant[quote.workOrder.status]}>
                      {quote.workOrder.number} — {workOrderStatusLabels[quote.workOrder.status]}
                    </Badge>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">Sin orden de trabajo</span>
                  )}
                </div>

                <div className="mt-3 border-t border-[var(--color-border-light)] pt-3">
                  <div className="grid gap-1 text-sm">
                    <p className="text-[var(--color-text-muted)]">
                      Subtotal: {formatCents(quote.subtotalCents)}
                    </p>
                    <p className="text-[var(--color-text-muted)]">IVA: {formatCents(quote.taxCents)}</p>
                    <p className="font-semibold text-[var(--color-primary)]">
                      Total: {formatCents(quote.totalCents)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Vigente hasta: {quote.validUntil ? formatDate(quote.validUntil) : "—"}
                    </p>
                  </div>
                  <ul className="mt-2 grid gap-1 text-sm text-[var(--color-text-muted)]">
                    {quote.items.map((item) => (
                      <li key={item.id}>
                        {item.description} — {Number(item.quantity).toFixed(2)} ×{" "}
                        {formatCents(item.unitPriceCents)} = {formatCents(item.totalCents)}
                      </li>
                    ))}
                  </ul>
                </div>

                {quote.status === "DRAFT" && !quote.workOrder ? (
                  <div className="mt-4 grid gap-2">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/admin/quotes/${quote.id}/edit`}>Editar</Link>
                    </Button>
                    <QuoteApprovalForm
                      action={approveQuoteAndCreateWorkOrderFromForm}
                      quoteId={quote.id}
                      quoteNumber={quote.number}
                    />
                    <QuoteCancelForm
                      action={cancelDraftQuoteFromForm}
                      quoteId={quote.id}
                      quoteNumber={quote.number}
                    />
                  </div>
                ) : quote.status === "SENT" || quote.status === "APPROVED" ? (
                  <div className="mt-4">
                    <PaymentRequestLinkDialog
                      action={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
                      quoteNumber={quote.number}
                    />
                  </div>
                ) : null}
              </div>
            ))}
            {quotes.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                No se encontraron cotizaciones.
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
