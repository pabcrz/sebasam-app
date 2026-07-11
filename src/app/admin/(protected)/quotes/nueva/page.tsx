import type { Metadata } from "next";
import { requireOperationalRole } from "@/lib/auth/session";
import { listCustomers } from "@/features/customers/queries";
import { createOrReuseCustomerForQuote, searchCustomersForQuote } from "@/features/customers/actions";
import { createQuoteFromForm } from "@/features/quotes/actions";
import { NewQuoteForm } from "@/features/quotes/components/new-quote-form";

export const metadata: Metadata = {
  title: "Nueva cotización",
};

export default async function NewQuotePage() {
  await requireOperationalRole();
  const customers = await listCustomers();

  return (
    <NewQuoteForm
      customers={customers}
      createAction={createQuoteFromForm}
      createCustomerAction={createOrReuseCustomerForQuote}
      searchCustomersAction={searchCustomersForQuote}
    />
  );
}
