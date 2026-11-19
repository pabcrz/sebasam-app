import type { Metadata } from "next";
import { getOperationalDashboardSnapshot } from "@/features/dashboard/queries";
import { listCustomers } from "@/features/customers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import {
  archiveQuote,
  authorizeQuoteAction,
  approveQuoteAndCreateWorkOrderFromForm,
  cancelQuoteFromForm,
  correctQuoteDecisionAction,
  createQuoteFromWorkspace,
  deleteQuoteFromForm,
  duplicateQuoteFromForm,
  getOrCreateSharedQuoteAction,
  publishSharedQuote,
  restoreArchivedQuote,
  updateDraftQuoteFromWorkspace,
} from "@/features/quotes/actions";
import { listQuotesByIds } from "@/features/quotes/queries";
import { QuoteListCard } from "@/features/quotes/components/quote-mobile-card";
import { quoteStatusBadgeVariant, quoteStatusLabels } from "@/features/quotes/lib/status";
import { filterPaymentRequestDialogBankAccounts } from "@/features/quotes/lib/payment-request-dialog-context";
import { getOrCreatePaymentRequestForQuote } from "@/features/payment-requests/actions";
import { getPaymentSettings } from "@/features/payment-settings/domain";
import {
  completeWorkOrderAction,
  convertQuoteToNoteOperationAction,
  createAndAssignWorkOrderAction,
  rollbackWorkOrderAction,
} from "@/features/work-orders/actions";
import { listActiveWorkers } from "@/features/work-orders/queries";
import { CardPanelProvider } from "@/components/ui";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { requireProfileForPage } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Panel",
};

export default async function AdminHomePage() {
  const [{ profile }, snapshot, customers] = await Promise.all([
    requireProfileForPage(),
    getOperationalDashboardSnapshot(),
    listCustomers(),
  ]);

  // The featured "Siguiente trabajo" reuses the quote list card so every action works from the home.
  let nextWorkCard = null;
  if (snapshot.nextWork) {
    const [[quote], paymentSettings, workers] = await Promise.all([
      listQuotesByIds([snapshot.nextWork.quoteId]),
      getPaymentSettings(),
      listActiveWorkers(),
    ]);
    if (quote) {
      nextWorkCard = (
        <CardPanelProvider>
          <QuoteListCard
            quote={quote}
            quoteStatusLabels={quoteStatusLabels}
            quoteStatusBadgeVariant={quoteStatusBadgeVariant}
            approveAction={approveQuoteAndCreateWorkOrderFromForm}
            cancelAction={cancelQuoteFromForm}
            shareAction={(quote.status === "DRAFT" ? publishSharedQuote : getOrCreateSharedQuoteAction).bind(null, quote.id)}
            authorizeAction={authorizeQuoteAction.bind(null, quote.id)}
            correctDecisionAction={correctQuoteDecisionAction}
            paymentRequestAction={getOrCreatePaymentRequestForQuote.bind(null, quote.id)}
            paymentRequestBankAccounts={filterPaymentRequestDialogBankAccounts(paymentSettings.bankAccounts)}
            duplicateAction={duplicateQuoteFromForm}
            deleteAction={deleteQuoteFromForm}
            archiveAction={archiveQuote.bind(null, quote.id)}
            restoreAction={restoreArchivedQuote.bind(null, quote.id)}
            customers={customers}
            saveAction={updateDraftQuoteFromWorkspace.bind(null, quote.id)}
            searchCustomersAction={searchCustomersForQuote}
            workers={workers}
            workOrderActions={{
              convert: convertQuoteToNoteOperationAction,
              assign: createAndAssignWorkOrderAction.bind(null, quote.id),
              complete: completeWorkOrderAction,
              rollback: rollbackWorkOrderAction,
            }}
          />
        </CardPanelProvider>
      );
    }
  }

  return (
    <DashboardView
      snapshot={snapshot}
      customers={customers}
      role={profile.role}
      nextWorkCard={nextWorkCard}
      createQuoteAction={createQuoteFromWorkspace}
      createCustomerForQuoteAction={createOrReuseCustomerForQuote}
      searchCustomersAction={searchCustomersForQuote}
    />
  );
}
