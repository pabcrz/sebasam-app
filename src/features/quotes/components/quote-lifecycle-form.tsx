"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileHeader,
  DialogTitle,
  Label,
  Textarea,
} from "@/components/ui";

type QuoteLifecycleFormProps = {
  action: (reason: string) => Promise<void>;
  mode: "archive" | "restore";
  quoteNumber: string;
  iconOnly?: boolean;
  actionLabelClassName?: string;
};

export function QuoteLifecycleForm({ action, mode, quoteNumber, iconOnly = false, actionLabelClassName }: QuoteLifecycleFormProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const archive = mode === "archive";
  const label = archive ? "Archivar" : "Restaurar";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await action(reason);
        setOpen(false);
        setReason("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : `No se pudo ${label.toLowerCase()} la cotización.`);
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={archive ? "outline" : "primary"}
        size={iconOnly ? "icon" : "sm"}
        ref={triggerRef}
        aria-label={`${label} cotización ${quoteNumber}`}
        title={`${label} cotización ${quoteNumber}`}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
      >
        {archive ? <Icon name="archive" className="h-5 w-5" aria-hidden="true" /> : <Icon name="undo" className="h-5 w-5" aria-hidden="true" />}
        {!iconOnly ? <span className={actionLabelClassName}>{label}</span> : null}
      </Button>
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!isPending) setOpen(nextOpen); }}>
        <DialogMobileContent
          className="max-w-lg"
          onEscapeKeyDown={(event) => { if (isPending) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (isPending) event.preventDefault(); }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogMobileHeader>
            <DialogTitle>{label} cotización</DialogTitle>
            <DialogDescription>
              {archive
                ? `Archivar ${quoteNumber} revoca sus enlaces y cancela solicitudes de pago activas.`
                : `Restaurar ${quoteNumber} la devuelve a borrador sin reactivar enlaces ni solicitudes anteriores.`}
            </DialogDescription>
            <DialogMobileClose aria-label={`Cerrar ${label.toLowerCase()} cotización`} disabled={isPending} />
          </DialogMobileHeader>
          <DialogMobileBody>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor={`quote-${mode}-reason`}>Motivo</Label>
                <Textarea id={`quote-${mode}-reason`} value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={isPending} />
              </div>
              {error ? <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Volver</Button>
                <Button type="submit" variant={archive ? "danger" : "primary"} loading={isPending}>{label} cotización</Button>
              </DialogFooter>
            </form>
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}
