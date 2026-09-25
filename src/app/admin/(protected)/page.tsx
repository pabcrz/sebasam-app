import type { Metadata } from "next";
import { getOperationalDashboardSnapshot } from "@/features/dashboard/queries";
import { listCustomers } from "@/features/customers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { createQuoteFromWorkspace } from "@/features/quotes/actions";
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

  return (
    <DashboardView
      snapshot={snapshot}
      customers={customers}
      role={profile.role}
      createQuoteAction={createQuoteFromWorkspace}
      createCustomerForQuoteAction={createOrReuseCustomerForQuote}
      searchCustomersAction={searchCustomersForQuote}
    />
  );
}
