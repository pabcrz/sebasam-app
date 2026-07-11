"use client";

import { useRouter } from "next/navigation";
import { QuoteBuilder } from "./quote-builder";
import type { CustomerOption, QuoteBuilderInitialData } from "./quote-builder";

type EditDraftQuoteFormProps = {
  customers: CustomerOption[];
  saveAction: (formData: FormData) => void | Promise<void>;
  initialData: QuoteBuilderInitialData;
  quoteNumber: string;
  searchCustomersAction: (input: unknown) => Promise<CustomerOption[]>;
};

export function EditDraftQuoteForm({
  customers,
  saveAction,
  initialData,
  quoteNumber,
  searchCustomersAction,
}: EditDraftQuoteFormProps) {
  const router = useRouter();

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-10">
      <QuoteBuilder
        customers={customers}
        saveAction={saveAction}
        initialData={initialData}
        searchCustomersAction={searchCustomersAction}
        onCancel={() => router.push("/admin/quotes")}
      />
      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Editando cotización {quoteNumber}
      </p>
    </section>
  );
}
