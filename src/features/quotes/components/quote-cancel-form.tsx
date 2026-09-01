"use client";

import * as React from "react";
import { DestructiveAction } from "@/components/ui";
import { Ban } from "lucide-react";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface QuoteCancelFormProps {
  action: (formData: FormData) => void | Promise<void>;
  quoteId: string;
  quoteNumber: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  actionLabelClassName?: string;
}

export function QuoteCancelForm({
  action,
  quoteId,
  quoteNumber,
  variant = "outline",
  size = "sm",
  iconOnly = false,
  actionLabelClassName,
}: QuoteCancelFormProps) {
  const handleConfirm = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("quoteId", quoteId);
    await action(formData);
  }, [action, quoteId]);

  return (
    <DestructiveAction
      triggerLabel="Cancelar"
      triggerAriaLabel={`Cancelar cotización ${quoteNumber}`}
      triggerTitle={`Cancelar cotización ${quoteNumber}`}
      triggerIcon={<Ban className="h-5 w-5" aria-hidden="true" />}
      triggerVariant={variant}
      triggerClassName={iconOnly ? "" : "w-full"}
      triggerLabelClassName={actionLabelClassName}
      size={size}
      iconOnly={iconOnly}
      stopPropagation
      title="Cancelar cotización"
      description={`¿Confirmas cancelar ${quoteNumber}? Esta acción no se puede deshacer.`}
      confirmLabel="Cancelar cotización"
      cancelLabel="Volver"
      onConfirm={handleConfirm}
    />
  );
}