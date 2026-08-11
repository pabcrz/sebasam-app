"use client";

import * as React from "react";
import { Copy } from "lucide-react";
import type { listActiveWorkOrders } from "@/features/work-orders/queries";

import type { listQuotes } from "@/features/quotes/queries";
import { Badge, Button } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { ShareQuoteLinkDialog } from "@/features/quotes/components/share-quote-link-dialog";
import { WorkOrderOperationsDialog } from "@/features/work-orders/components/work-order-operations-dialog";
import type { WorkOrderActions, WorkerOption } from "@/features/work-orders/components/work-order-operations-dialog";
import type { SharedQuote } from "@prisma/client";
import type { CustomerOption } from "@/features/quotes/components/quote-builder";
import type { QuoteFormActionState } from "@/features/quotes/actions";

type WorkOrderItem = Awaited<ReturnType<typeof listActiveWorkOrders>>[number];
type QuoteListItem = Awaited<ReturnType<typeof listQuotes>>[number];

interface WorkOrderActiveListProps {
  workOrders: WorkOrderItem[];
  workers: WorkerOption[];
  customers: CustomerOption[];
  /** Full quote data map (quoteId → listQuotes item) for builder/preview dialogs */
  quoteMap: Map<string, QuoteListItem>;
  /** Pre-bound save actions, one per work order in the same order as workOrders */
  saveQuoteActions: Array<(state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>>;
  searchCustomersAction: (input: unknown) => Promise<CustomerOption[]>;
  duplicateQuoteAction: (formData: FormData) => void | Promise<void>;
  shareQuoteAction: (formData: FormData) => void | Promise<void>;
  workOrderActions: WorkOrderActions;
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
  workers,
  customers,
  quoteMap,
  saveQuoteActions,
  searchCustomersAction,
  duplicateQuoteAction,
  shareQuoteAction,
  workOrderActions,
}: WorkOrderActiveListProps) {
  const [previewOpenId, setPreviewOpenId] = React.useState<string | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {workOrders.map((wo, index) => {
        const fullQuote = quoteMap.get(wo.quote.id);
        const saveAction = saveQuoteActions[index];

        return (
          <div key={wo.id} className="grid">
            {/* Clickable card body */}
            <button
              type="button"
              onClick={() => setPreviewOpenId(wo.quote.id)}
              className="rounded-t-[var(--radius-md)] border border-b-0 border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 text-left shadow-sm hover:bg-[var(--color-bg-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2"
              aria-label={`Ver detalle de cotización ${wo.quote.number}`}
            >
              {/* Header */}
              <div className="mb-2 flex items-start justify-between gap-2">
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
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[var(--color-text-muted)]">Maestro:</span>
                <AssigneeBadge wo={wo} />
                {wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length > 0 ? (
                  <span className="text-xs text-[var(--color-text-muted)]">
                    + {wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length} ayudante(s)
                  </span>
                ) : null}
              </div>
            </button>

            {/* Action bar — separate from the clickable area */}
            <div
              className="flex flex-wrap gap-2 rounded-b-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] px-4 py-3"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Gestionar → opens WorkOrderOperationsDialog directly */}
              <WorkOrderOperationsDialog
                quoteNumber={wo.quote.number}
                quoteStatus="APPROVED"
                workOrder={wo}
                workers={workers}
                actions={workOrderActions}
              />

              {/* Editar cotización */}
              {fullQuote && saveAction ? (
                <QuoteBuilderDialog
                  customers={customers}
                  saveAction={saveAction}
                  searchCustomersAction={searchCustomersAction}
                  quote={fullQuote}
                  quoteNumber={wo.quote.number}
                  triggerSize="sm"
                  triggerVariant="outline"
                />
              ) : null}

              {/* Duplicar */}
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

            {/* Preview dialog (triggered by clicking the card body) */}
            {fullQuote ? (
              <QuotePreviewDialog
                quote={fullQuote}
                open={previewOpenId === wo.quote.id}
                onOpenChange={(open) => setPreviewOpenId(open ? wo.quote.id : null)}
                showTrigger={false}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
