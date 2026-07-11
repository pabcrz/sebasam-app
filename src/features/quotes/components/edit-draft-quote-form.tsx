"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
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
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
          Editar cotización {quoteNumber}
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/admin/quotes")}
          aria-label="Cerrar edición"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
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
