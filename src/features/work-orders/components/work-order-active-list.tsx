"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList, Copy } from "lucide-react";
import type { listActiveWorkOrders } from "@/features/work-orders/queries";
import type { listActiveWorkers } from "@/features/workers/queries";
import type { listQuotes } from "@/features/quotes/queries";
import { Badge, Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { ShareQuoteLinkDialog } from "@/features/quotes/components/share-quote-link-dialog";
import type { SharedQuote } from "@prisma/client";
import type { CustomerOption } from "@/features/quotes/components/quote-builder";
import type { QuoteFormActionState } from "@/features/quotes/actions";

type WorkOrderItem = Awaited<ReturnType<typeof listActiveWorkOrders>>[number];
type WorkerOption = Awaited<ReturnType<typeof listActiveWorkers>>[number];
type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

interface WorkOrderActiveListProps {
  workOrders: WorkOrderItem[];
  workers: WorkerOption[];
  customers: CustomerOption[];
  /** Full quote data map (quoteId → listQuotes item) for builder dialogs */
  quoteMap: Map<string, QuoteListItem>;
  saveQuoteAction: (quoteId: string) => (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  searchCustomersAction: (input: unknown) => Promise<CustomerOption[]>;
  duplicateQuoteAction: (formData: FormData) => void | Promise<void>;
  shareQuoteAction: (formData: FormData) => void | Promise<void>;
}

function formatVehicle(wo: WorkOrderItem) {
  const v = wo.quote.vehicle;
  if (!v) return "Sin vehículo";
  return [v.brand, v.model, v.year, v.plate ? `· ${v.plate}` : null].filter(Boolean).join(" ");
}

function AssigneeBadge({ wo }: { wo: WorkOrderItem }) {
  if (wo.isSpecial) {
    return (
      <Badge variant="warning" className="w-fit">
        {wo.specialAssigneeName ?? "Orden especial"}
      </Badge>
    );
  }
  const master = wo.assignments.find((a) => a.worker.workerKind === "MASTER");
  if (master) {
    return <span className="text-sm font-medium">{master.worker.displayName}</span>;
  }
  return <span className="text-sm text-[var(--color-text-muted)]">Sin asignar</span>;
}

export function WorkOrderActiveList({
  workOrders,
  customers,
  quoteMap,
  saveQuoteAction,
  searchCustomersAction,
  duplicateQuoteAction,
  shareQuoteAction,
}: WorkOrderActiveListProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {workOrders.map((wo) => {
        const fullQuote = quoteMap.get(wo.quote.id);

        return (
          <div
            key={wo.id}
            className="rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-sm"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">{wo.number}</span>
                  <Badge variant="info" className="w-fit">En proceso</Badge>
                </div>
                <p className="mt-1 font-semibold text-[var(--color-text-main)]">{wo.quote.customer.name}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{formatVehicle(wo)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                  {formatCents(Number(wo.quote.totalCents))}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">{wo.quote.title}</p>
              </div>
            </div>

            {/* Assignee */}
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className="text-[var(--color-text-muted)]">Maestro:</span>
              <AssigneeBadge wo={wo} />
              {wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length > 0 ? (
                <span className="text-xs text-[var(--color-text-muted)]">
                  + {wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length} ayudante(s)
                </span>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              {/* Gestionar */}
              <Button type="button" variant="outline" size="sm" asChild>
                <Link href={`/admin/work-orders/${wo.id}`}>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  Gestionar
                </Link>
              </Button>

              {/* Editar cotización */}
              {fullQuote ? (
                <QuoteBuilderDialog
                  customers={customers}
                  saveAction={saveQuoteAction(wo.quote.id)}
                  searchCustomersAction={searchCustomersAction}
                  quote={fullQuote}
                  quoteNumber={wo.quote.number}
                  triggerSize="sm"
                  triggerVariant="outline"
                />
              ) : null}

              {/* Duplicar (crea nueva cotización) */}
              <form action={duplicateQuoteAction}>
                <input type="hidden" name="quoteId" value={wo.quote.id} />
                <Button type="submit" variant="outline" size="sm" title="Duplicar como nueva cotización">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Duplicar
                </Button>
              </form>

              {/* Compartir */}
              {fullQuote?.activeSharedQuote ? (
                <ShareQuoteLinkDialog
                  sharedQuote={fullQuote.activeSharedQuote as SharedQuote}
                  quoteNumber={wo.quote.number}
                />
              ) : (
                <ShareQuoteButton
                  action={shareQuoteAction}
                  quoteId={wo.quote.id}
                  quoteNumber={wo.quote.number}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
