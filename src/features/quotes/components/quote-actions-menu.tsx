"use client";

import type { ReactNode } from "react";
import { OperationalActionsMenu } from "@/components/ui";

type QuoteActionsMenuProps = {
  quoteNumber: string;
  children: ReactNode;
  destructive?: ReactNode;
  triggerClassName?: string;
  triggerIconOnly?: boolean;
};

export function QuoteActionsMenu({
  quoteNumber,
  children,
  destructive,
  triggerClassName,
  triggerIconOnly = false,
}: QuoteActionsMenuProps) {
  return (
    <OperationalActionsMenu
      title="Acciones de cotización"
      description={`Acciones disponibles para ${quoteNumber}.`}
      triggerAriaLabel={`Más acciones de cotización ${quoteNumber}`}
      triggerTitle={`Más acciones de cotización ${quoteNumber}`}
      destructive={destructive}
      triggerClassName={triggerClassName}
      triggerIconOnly={triggerIconOnly}
    >
      {children}
    </OperationalActionsMenu>
  );
}
