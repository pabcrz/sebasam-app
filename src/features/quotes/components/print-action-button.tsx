"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Button, type ButtonProps } from "@/components/ui";
import { printDocumentUrl } from "@/features/quotes/lib/print-document";

export interface PrintActionButtonProps extends Omit<ButtonProps, "onClick"> {
  url: string;
  onBeforePrint?: () => void | Promise<void>;
  onAfterPrint?: () => void;
  onError?: (error: unknown) => void;
}

export const PrintActionButton = React.forwardRef<HTMLButtonElement, PrintActionButtonProps>(
  (
    {
      url,
      children,
      className,
      disabled,
      loading: controlledLoading,
      onBeforePrint,
      onAfterPrint,
      onError,
      ...buttonProps
    },
    ref,
  ) => {
    const [internalLoading, setInternalLoading] = React.useState(false);
    const isLoading = controlledLoading ?? internalLoading;

    const handlePrint = async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (isLoading || disabled) return;

      setInternalLoading(true);
      try {
        if (onBeforePrint) {
          await onBeforePrint();
        }
        await printDocumentUrl(url);
        onAfterPrint?.();
      } catch (error) {
        console.error("Error al imprimir documento:", error);
        toast.error("No se pudo abrir la vista de impresión");
        onError?.(error);
      } finally {
        setInternalLoading(false);
      }
    };

    return (
      <Button
        ref={ref}
        type="button"
        loading={isLoading}
        disabled={disabled || isLoading}
        data-print-url={url}
        onClick={handlePrint}
        className={clsx(className, isLoading && "[&>svg]:hidden")}
        {...buttonProps}
      >
        {children}
      </Button>
    );
  },
);

PrintActionButton.displayName = "PrintActionButton";
