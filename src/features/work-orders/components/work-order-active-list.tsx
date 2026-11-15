"use client";

import { Icon } from "@/components/ui/icon";
import { PrintActionButton } from "@/features/quotes/components/print-action-button";
import type { listActiveWorkOrders } from "@/features/work-orders/queries";

import type { listQuotes } from "@/features/quotes/queries";
import { Badge, CardPanelProvider, EntityCard, OperationalActionsMenu, useCardPanel } from "@/components/ui";
import { formatUnitIdentity } from "@/lib/unit-identity";
import { formatCents } from "@/features/quotes/lib/format";
import { QuoteBuilderDialog } from "@/features/quotes/components/quote-builder-dialog";
import { QuotePreviewDialog } from "@/features/quotes/components/quote-preview-dialog";
import { ShareQuoteButton } from "@/features/quotes/components/share-quote-button";
import { QuoteDuplicateForm } from "@/features/quotes/components/quote-duplicate-form";
import { resolveCustomerDisplayIdentity } from "@/features/quotes/lib/quote-snapshot-display";
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
  shareAction: (quoteId: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  workOrderActions: WorkOrderActions;
}

/** Icon-only footer tool on the 32px control with a 44px touch area. */
const toolClassName = "h-[var(--control-sm)] w-[var(--control-sm)] shrink-0 justify-center gap-0 px-0";

function unitIdentityOf(wo: WorkOrderItem) {
  const vehicle = wo.quote.vehicle;
  return formatUnitIdentity({
    economicNumber: vehicle?.economicNumber,
    plates: vehicle?.plate,
    model: [vehicle?.brand, vehicle?.model].filter(Boolean).join(" "),
  });
}

function AssigneeText({ wo }: { wo: WorkOrderItem }) {
  if (wo.isSpecial) {
    return <span>Taller</span>;
  }
  const master = wo.assignments.find((a) => a.worker.workerKind === "MASTER");
  if (master) {
    return <span>{master.worker.displayName}</span>;
  }
  return <span className="text-[var(--color-text-muted)]">Sin asignar</span>;
}

type ActiveWorkOrderCardProps = Omit<WorkOrderActiveListProps, "workOrders" | "quoteMap" | "saveQuoteActions"> & {
  wo: WorkOrderItem;
  fullQuote: QuoteListItem | undefined;
  saveAction: WorkOrderActiveListProps["saveQuoteActions"][number] | undefined;
};

function ActiveWorkOrderCard({
  wo,
  fullQuote,
  saveAction,
  workers,
  customers,
  searchCustomersAction,
  duplicateQuoteAction,
  shareAction,
  workOrderActions,
}: ActiveWorkOrderCardProps) {
  const panel = useCardPanel(wo.id);
  const identity = resolveCustomerDisplayIdentity(wo.quote);
  const helperCount = wo.assignments.filter((a) => a.worker.workerKind === "HELPER").length;
  const manageActions: WorkOrderActions = {
    ...workOrderActions,
    assign: workOrderActions.assign
      ? (input) => workOrderActions.assign!({ ...(input as Record<string, unknown>), workOrderId: wo.id })
      : undefined,
  };
  const manageDialogProps = {
    quoteNumber: wo.quote.number,
    quoteStatus: wo.quote.status,
    workOrder: wo,
    workers,
    customerName: identity.displayName,
    actions: manageActions,
    triggerIconOnlyMobile: false,
  };

  return (
    <>
      {fullQuote ? (
        <QuotePreviewDialog
          quote={fullQuote}
          open={panel.isOpen("preview")}
          onOpenChange={(open) => (open ? panel.open("preview") : panel.close("preview"))}
          showTrigger={false}
          folio={wo.number}
          customerName={identity.displayName}
          statusBadge={<Badge variant="info">En proceso</Badge>}
          footerAction={
            <WorkOrderOperationsDialog {...manageDialogProps} triggerVariant="primary" triggerClassName="shrink-0" />
          }
        />
      ) : null}
      <EntityCard
        className="h-full"
        openLabel={`Ver detalle de cotización ${wo.quote.number}`}
        onOpen={() => panel.open("preview")}
        selected={panel.selected}
        title={identity.displayName}
        folio={wo.number}
        status={<Badge variant="info">En proceso</Badge>}
        amount={formatCents(wo.quote.totalCents)}
        amountCaption={wo.quote.title || "Sin título"}
        unit={unitIdentityOf(wo)}
        driver={identity.operatorName ?? null}
        driverIcon="driver"
        keyData={
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] px-3 py-2">
            <span>Asignado a</span>
            <span className="min-w-0 font-medium text-[var(--color-text-main)]">
              <AssigneeText wo={wo} />
            </span>
            {helperCount > 0 ? <span>+ {helperCount} ayudante(s)</span> : null}
          </p>
        }
        editAction={fullQuote && saveAction ? (
          <QuoteBuilderDialog
            customers={customers}
            saveAction={saveAction}
            searchCustomersAction={searchCustomersAction}
            quote={fullQuote}
            quoteNumber={wo.quote.number}
            triggerAriaLabel={`Editar cotización ${wo.quote.number}`}
            triggerSize="sm"
            triggerVariant="ghost"
            triggerClassName={toolClassName}
            triggerIconOnly
          />
        ) : undefined}
        printAction={
          <PrintActionButton
            url={`/admin/quotes/${wo.quote.id}/print?returnTo=/admin/work-orders`}
            variant="ghost"
            size="sm"
            className={toolClassName}
            title={`Imprimir orden ${wo.number}`}
            aria-label={`Imprimir orden ${wo.number}`}
          >
            <Icon name="print" className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Imprimir orden</span>
          </PrintActionButton>
        }
        shareAction={
          <ShareQuoteButton
            action={shareAction.bind(null, wo.quote.id)}
            quoteNumber={wo.quote.number}
            variant="ghost"
            className={toolClassName}
            actionLabelClassName="sr-only"
            iconOnly
          />
        }
        overflowAction={
          <OperationalActionsMenu
            title="Acciones de trabajo"
            description={`Opciones para la orden ${wo.number}.`}
            triggerAriaLabel={`Más acciones de orden ${wo.number}`}
            triggerTitle={`Más acciones de orden ${wo.number}`}
            triggerClassName={toolClassName}
            triggerIconOnly
          >
            <QuoteDuplicateForm action={duplicateQuoteAction} quoteId={wo.quote.id} />
          </OperationalActionsMenu>
        }
        stateAction={
          <WorkOrderOperationsDialog
            {...manageDialogProps}
            triggerVariant="tonal"
            triggerClassName="w-auto"
            open={panel.isOpen("manage")}
            onOpenChange={(open) => (open ? panel.open("manage") : panel.close("manage"))}
          />
        }
      />
    </>
  );
}

export function WorkOrderActiveList({
  workOrders,
  workers,
  customers,
  quoteMap,
  saveQuoteActions,
  searchCustomersAction,
  duplicateQuoteAction,
  shareAction,
  workOrderActions,
}: WorkOrderActiveListProps) {
  return (
    <CardPanelProvider>
      <div className="side-panel-list grid auto-rows-fr gap-3 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
        {workOrders.map((wo, index) => (
          <ActiveWorkOrderCard
            key={wo.id}
            wo={wo}
            fullQuote={quoteMap.get(wo.quote.id)}
            saveAction={saveQuoteActions[index]}
            workers={workers}
            customers={customers}
            searchCustomersAction={searchCustomersAction}
            duplicateQuoteAction={duplicateQuoteAction}
            shareAction={shareAction}
            workOrderActions={workOrderActions}
          />
        ))}
      </div>
    </CardPanelProvider>
  );
}
