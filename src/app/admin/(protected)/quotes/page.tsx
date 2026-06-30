import type { Metadata } from "next";
import { QuoteStatus, WorkOrderStatus } from "@prisma/client";
import {
  createQuoteFromForm,
  approveQuoteAndCreateWorkOrderFromForm,
} from "@/features/quotes/actions";
import { listQuotes } from "@/features/quotes/queries";
import { listCustomers } from "@/features/customers/queries";
import { getOrCreatePaymentRequestForQuote } from "@/features/payment-requests/actions";
import {
  Badge,
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
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuoteApprovalForm } from "@/features/quotes/components/quote-approval-form";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { QuotePageToasts } from "@/features/quotes/components/quote-page-toasts";
import { PaymentRequestLinkDialog } from "@/features/payment-requests/components/payment-request-link-dialog";
import { formatCents, formatDate, formatSnapshotVehicle, formatVehicle } from "@/features/quotes/lib/format";

export const metadata: Metadata = {
  title: "Cotizaciones",
};

type QuotesPageProps = {
  searchParams: Promise<{
    approved?: string;
    created?: string;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function QuotesPage({ searchParams: _searchParams }: QuotesPageProps) {
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
          <QuotePageToasts />
        </CardContent>
      </Card>

      <QuoteBuilderDialog customers={customers} createAction={createQuoteFromForm} />

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle as="h2">Cotizaciones recientes</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
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
                  <TableHead>Subtotal</TableHead>
                  <TableHead>IVA</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Vigente hasta</TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap">Vista previa</TableHead>
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
                    <TableCell>{formatCents(quote.subtotalCents)}</TableCell>
                    <TableCell>{formatCents(quote.taxCents)}</TableCell>
                    <TableCell className="font-medium">{formatCents(quote.totalCents)}</TableCell>
                    <TableCell>{quote.validUntil ? formatDate(quote.validUntil) : "—"}</TableCell>
                    <TableCell>
                      <QuotePreviewDialog quote={quote} />
                    </TableCell>
                    <TableCell>
                      {quote.status === "DRAFT" && !quote.workOrder ? (
                        <QuoteApprovalForm
                          action={approveQuoteAndCreateWorkOrderFromForm}
                          quoteId={quote.id}
                          quoteNumber={quote.number}
                        />
                      ) : quote.status === "SENT" || quote.status === "APPROVED" ? (
                        <PaymentRequestLinkDialog
                          action={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
                          quoteNumber={quote.number}
                        />
                      ) : (
                        <span className="text-sm text-[var(--color-text-muted)]">Sin acción</span>
                      )}
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
                  <div className="mt-4">
                    <QuoteApprovalForm
                      action={approveQuoteAndCreateWorkOrderFromForm}
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
