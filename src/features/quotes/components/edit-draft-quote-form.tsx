"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QuoteBuilder } from "./quote-builder";
import type { CustomerOption, QuoteBuilderInitialData } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";

type EditDraftQuoteFormProps = {
  customers: CustomerOption[];
  saveAction: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
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
  const [showConfirmClose, setShowConfirmClose] = React.useState(false);

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
          Editar cotización {quoteNumber}
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirmClose(true)}
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
        onSuccess={() => router.push("/admin/quotes?updated=1")}
      />
      <ConfirmDialog
        open={showConfirmClose}
        onOpenChange={setShowConfirmClose}
        title="¿Descartar los cambios?"
        description="Si sales sin guardar, perderás las modificaciones hechas a esta cotización."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        variant="danger"
        onConfirm={() => router.push("/admin/quotes")}
      />
    </section>
  );
}
