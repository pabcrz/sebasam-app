import type { Metadata } from "next";
import { getOperationalDashboardSnapshot } from "@/features/dashboard/queries";
import { listCustomers } from "@/features/customers/queries";
import { createCustomerFromForm, createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { createQuoteFromWorkspace } from "@/features/quotes/actions";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";

export const metadata: Metadata = {
  title: "Panel",
};

export default async function AdminHomePage() {
  const [snapshot, customers] = await Promise.all([
    getOperationalDashboardSnapshot(),
    listCustomers(),
  ]);

  return (
    <DashboardView
      snapshot={snapshot}
      customers={customers}
      createCustomerAction={createCustomerFromForm}
      createQuoteAction={createQuoteFromWorkspace}
      createCustomerForQuoteAction={createOrReuseCustomerForQuote}
      searchCustomersAction={searchCustomersForQuote}
    />
  );
}
