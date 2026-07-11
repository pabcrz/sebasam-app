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
    <section className="mx-auto flex h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
      <h1 className="shrink-0 text-2xl font-semibold text-[var(--color-text-main)]">
        Editar cotización {quoteNumber}
      </h1>
      <QuoteBuilder
        customers={customers}
        saveAction={saveAction}
        initialData={initialData}
        searchCustomersAction={searchCustomersAction}
        onCancel={() => router.push("/admin/quotes")}
      />
    </section>
  );
}
