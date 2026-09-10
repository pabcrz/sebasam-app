"use client";

import * as React from "react";
import { Printer } from "lucide-react";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import type { listActiveWorkOrders } from "@/features/work-orders/queries";

import type { listQuotes } from "@/features/quotes/queries";
import { Badge, Button, OperationalActionRow, OperationalCard } from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { QuoteDuplicateForm } from "@/features/quotes/components/quote-duplicate-form";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshots";
import { WorkOrderOperationsDialog } from "@/features/work-orders/components/work-order-operations-dialog";
import type { WorkOrderActions, WorkerOption } from "@/features/work-orders/components/work-order-operations-dialog";
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
  workOrderActions: WorkOrderActions;
}

function formatVehicle(wo: WorkOrderItem) {
  const v = wo.quote.vehicle;
  if (!v) return "Sin vehículo";
  return [v.brand, v.model, v.year, v.plate ? `· ${v.plate}` : null].filter(Boolean).join(" ");
}

function AssigneeText({ wo }: { wo: WorkOrderItem }) {
  if (wo.isSpecial) {
    return <span>Taller</span>;
  }
  const master = wo.assignments.find((a) => a.worker.workerKind === "MASTER");
  if (master) {
    return <span>{master.worker.displayName}</span>;
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
  workOrderActions,
}: WorkOrderActiveListProps) {
  const [previewOpenId, setPreviewOpenId] = React.useState<string | null>(null);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {workOrders.map((wo, index) => {
        const fullQuote = quoteMap.get(wo.quote.id);
        const saveAction = saveQuoteActions[index];

        return (
          <OperationalCard
            key={wo.id}
            onOpen={() => setPreviewOpenId(wo.quote.id)}
            openLabel={`Ver detalle de cotización ${wo.quote.number}`}
            actions={
              <OperationalActionRow>
                <PrintActionButton
                  url={`/admin/quotes/${wo.quote.id}/print?returnTo=/admin/work-orders`}
                  variant="outline"
                  size="sm"
                  data-mobile-target="44"
                  className="h-10 min-h-11 min-w-11 w-10 px-0 sm:h-9 sm:w-auto sm:px-3"
                  title={`Imprimir orden ${wo.number}`}
                  aria-label={`Imprimir orden ${wo.number}`}
                >
                  <Printer className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only sm:not-sr-only">Imprimir orden</span>
                </PrintActionButton>
                <WorkOrderOperationsDialog
                  quoteNumber={wo.quote.number}
                  quoteStatus={wo.quote.status}
                  workOrder={wo}
                  workers={workers}
                  triggerIconOnlyMobile
                  actions={{
                    ...workOrderActions,
                    assign: workOrderActions.assign
                      ? (input) => workOrderActions.assign!({ ...(input as Record<string, unknown>), workOrderId: wo.id })
                      : undefined,
                  }}
                />

                {fullQuote && saveAction ? (
                  <QuoteBuilderDialog
                    customers={customers}
                    saveAction={saveAction}
                    searchCustomersAction={searchCustomersAction}
                    quote={fullQuote}
                    quoteNumber={wo.quote.number}
                    triggerSize="sm"
                    triggerVariant="outline"
                    triggerIconOnlyMobile
                  />
                ) : null}

                <QuoteDuplicateForm action={duplicateQuoteAction} quoteId={wo.quote.id} actionLabelClassName="sr-only sm:not-sr-only" />

                {fullQuote?.activeSharedQuote ? (
                  <ShareQuoteButton sharedQuote={fullQuote.activeSharedQuote} status={fullQuote.status} quoteNumber={wo.quote.number} actionLabelClassName="sr-only sm:not-sr-only" />
                ) : null}
              </OperationalActionRow>
            }
            body={
              <>
                {/* Header */}
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-[var(--color-text-muted)]">{wo.number}</span>
                      <Badge variant="info" className="w-fit">En proceso</Badge>
                    </div>
                    <p className="mt-1 font-semibold text-[var(--color-text-main)]">
                      {resolveCustomerDisplayIdentity(wo.quote).displayName}
                    </p>
                    {resolveCustomerDisplayIdentity(wo.quote).operatorName ? (
                      <p className="text-xs font-medium text-[var(--color-text-muted)]">
                        {resolveCustomerDisplayIdentity(wo.quote).operatorRole}: {resolveCustomerDisplayIdentity(wo.quote).operatorName}
                      </p>
                    ) : null}
                    <p className="text-sm text-[var(--color-text-muted)]">{formatVehicle(wo)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-extrabold tabular-nums text-[var(--color-total-emphasis)]">
                      {formatCents(wo.quote.totalCents)}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{wo.quote.title}</p>
                  </div>
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-2 text-sm">
                  <AssigneeText wo={wo} />
                  {wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length > 0 ? (
                    <span className="text-xs text-[var(--color-text-muted)]">
                      + {wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length} ayudante(s)
                    </span>
                  ) : null}
                </div>
                {/* The portaled preview must not bubble its dismissal events back to the clickable card. */}
                {fullQuote ? (
                  <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <QuotePreviewDialog
                      quote={fullQuote}
                      open={previewOpenId === wo.quote.id}
                      onOpenChange={(open) => setPreviewOpenId(open ? wo.quote.id : null)}
                      showTrigger={false}
                    />
                  </div>
                ) : null}
              </>
            }
          />
        );
      })}
    </div>
  );
}
