"use client";

import * as React from "react";
import { DestructiveAction } from "@/components/ui";
import { Trash2 } from "lucide-react";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface QuoteDeleteFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  actionLabelClassName?: string;
}

export function QuoteDeleteForm({
  action,
  quoteId,
  quoteNumber,
  variant = "danger",
  size = "sm",
  iconOnly = false,
  actionLabelClassName,
}: QuoteDeleteFormProps) {
  const handleConfirm = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("quoteId", quoteId);
    await action(formData);
  }, [action, quoteId]);

  return (
    <DestructiveAction
      triggerLabel="Eliminar"
      triggerAriaLabel={`Eliminar cotización ${quoteNumber}`}
      triggerTitle={`Eliminar cotización ${quoteNumber}`}
      triggerIcon={<Trash2 className="h-5 w-5" aria-hidden="true" />}
      triggerVariant={variant}
      triggerClassName={iconOnly ? "" : "w-full"}
      triggerLabelClassName={actionLabelClassName}
      size={size}
      iconOnly={iconOnly}
      stopPropagation
      title="Eliminar cotización"
      description={`¿Confirmas eliminar ${quoteNumber} de forma permanente? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar cotización"
      cancelLabel="Volver"
      onConfirm={handleConfirm}
    />
  );
}