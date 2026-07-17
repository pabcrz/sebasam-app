"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button, ConfirmDialog } from "@/components/ui";
import { QuoteBuilder } from "./quote-builder";
import type { CustomerOption } from "./quote-builder";
import type { QuoteFormActionState } from "../actions";

type NewQuoteFormProps = {
  customers: CustomerOption[];
  createAction: (state: QuoteFormActionState, formData: FormData) => Promise<QuoteFormActionState>;
  createCustomerAction?: (input: unknown) => Promise<{
    success: boolean;
    customer?: CustomerOption;
    error?: string;
    reused?: boolean;
  }>;
  searchCustomersAction?: (input: unknown) => Promise<CustomerOption[]>;
};

export function NewQuoteForm({
  customers,
  createAction,
  createCustomerAction,
  searchCustomersAction,
}: NewQuoteFormProps) {
  const router = useRouter();
  const [showConfirmClose, setShowConfirmClose] = React.useState(false);

  return (
    <section className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-6 md:py-10">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-text-main)]">
          Crear cotización
        </h1>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirmClose(true)}
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      <QuoteBuilder
        customers={customers}
        createAction={createAction}
        createCustomerAction={createCustomerAction}
        searchCustomersAction={searchCustomersAction}
        onSuccess={() => router.push("/admin/quotes?shared=1")}
      />
      <ConfirmDialog
        open={showConfirmClose}
        onOpenChange={setShowConfirmClose}
        title="¿Descartar la cotización?"
        description="Se perderá todo el progreso que no hayas guardado."
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        variant="danger"
        onConfirm={() => router.push("/admin/quotes")}
      />
    </section>
  );
}
