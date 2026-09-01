"use client";

import * as React from "react";
import { Archive, RotateCcw } from "lucide-react";
import {
  Button,
  DestructiveAction,
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

  if (archive) {
    return (
      <DestructiveAction
        triggerLabel={label}
        triggerAriaLabel={`${label} cotización ${quoteNumber}`}
        triggerTitle={`${label} cotización ${quoteNumber}`}
        triggerIcon={<Archive className="h-5 w-5" aria-hidden="true" />}
        triggerVariant="outline"
        triggerLabelClassName={actionLabelClassName}
        size="sm"
        iconOnly={iconOnly}
        stopPropagation
        title={`${label} cotización`}
        description={`Archivar ${quoteNumber} revoca sus enlaces y cancela solicitudes de pago activas.`}
        confirmLabel={`${label} cotización`}
        cancelLabel="Volver"
        onConfirm={async () => {
          const trimmedReason = reason.trim();
          if (trimmedReason.length < 3) {
            throw new Error("Indica el motivo de la archivación (mínimo 3 caracteres).");
          }
          await action(trimmedReason);
          setReason("");
        }}
      >
        <Label htmlFor="quote-archive-reason">Motivo</Label>
        <Textarea
          id="quote-archive-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          minLength={3}
          maxLength={500}
          required
        />
      </DestructiveAction>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="primary"
        size={iconOnly ? "icon" : "sm"}
        ref={triggerRef}
        aria-label={`${label} cotización ${quoteNumber}`}
        title={`${label} cotización ${quoteNumber}`}
        onClick={(event) => { event.stopPropagation(); setOpen(true); }}
      >
        <RotateCcw className="h-5 w-5" aria-hidden="true" />
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
              Restaurar {quoteNumber} la devuelve a borrador sin reactivar enlaces ni solicitudes anteriores.
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
                <Button type="submit" variant="primary" loading={isPending}>{label} cotización</Button>
              </DialogFooter>
            </form>
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}