"use client";

import * as React from "react";
import { DestructiveAction } from "@/components/ui";
import { Trash2 } from "lucide-react";
import type { ButtonVariant, ButtonSize } from "@/components/ui";

export interface CustomerDeleteFormProps {
  action: (formData: FormData) => void | Promise<void>;
  customerId: string;
  customerName: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
}

export function CustomerDeleteForm({
  action,
  customerId,
  customerName,
  variant = "danger",
  size = "default",
  iconOnly = false,
}: CustomerDeleteFormProps) {
  const handleConfirm = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("customerId", customerId);
    await action(formData);
  }, [action, customerId]);

  return (
    <DestructiveAction
      triggerLabel="Eliminar cliente"
      triggerAriaLabel={`Eliminar cliente ${customerName}`}
      triggerIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      triggerVariant={variant}
      triggerClassName={iconOnly ? "" : "w-full sm:w-fit"}
      size={size}
      iconOnly={iconOnly}
      title="Eliminar cliente"
      description={`¿Confirmas eliminar permanentemente a "${customerName}"? Solo es posible si no tiene cotizaciones ni pagos registrados.`}
      confirmLabel="Eliminar cliente"
      cancelLabel="Cancelar"
      onConfirm={handleConfirm}
    />
  );
}