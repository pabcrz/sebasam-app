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

type ActionResult = { success: true } | { success: false; error: string };

type NoteArchiveRevocationActionProps =
  | { quoteNumber: string; mode: "archive"; action: (reason: string) => Promise<void> }
  | { quoteNumber: string; mode: "revoke"; action: (reason: string) => Promise<ActionResult> };

export function NoteArchiveRevocationAction({
  quoteNumber,
  mode,
  action,
}: NoteArchiveRevocationActionProps) {
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const isArchive = mode === "archive";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (isArchive) {
          await action(reason);
        } else {
          const result = await action(reason);
          if (!result.success) {
            setError(result.error);
            return;
          }
        }
        setOpen(false);
        setReason("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo actualizar la Nota.");
      }
    });
  }

  return (
    <>
      {isArchive ? (
        <Button type="button" variant="outline" size="sm" aria-label={`Archivar Nota ${quoteNumber}`} title={`Archivar Nota ${quoteNumber}`} onClick={() => { setError(null); setOpen(true); }} disabled={isPending}>
          <Icon name="archive" className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Archivar</span>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" aria-label={`Revocar enlace de Nota ${quoteNumber}`} title={`Revocar enlace de Nota ${quoteNumber}`} onClick={() => { setError(null); setOpen(true); }} disabled={isPending}>
          <Icon name="shield-off" className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Revocar enlace</span>
        </Button>
      )}
      {error && !open ? <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">{error}</p> : null}
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!isPending) setOpen(nextOpen); }}>
        <DialogMobileContent className="max-w-lg">
          <DialogMobileHeader>
            <DialogTitle>{isArchive ? "Archivar Nota" : "Revocar enlace público"}</DialogTitle>
            <DialogDescription>
              {isArchive
                ? `Archivar ${quoteNumber} conserva su identidad, pagos y enlace público canónico.`
                : `Revocar el enlace de ${quoteNumber} lo invalida y conserva el motivo para auditoría.`}
            </DialogDescription>
            <DialogMobileClose disabled={isPending} />
          </DialogMobileHeader>
          <DialogMobileBody>
            <form onSubmit={submit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="note-archive-revocation-reason">Motivo</Label>
                <Textarea id="note-archive-revocation-reason" value={reason} onChange={(event) => setReason(event.target.value)} minLength={3} maxLength={500} required disabled={isPending} />
              </div>
              {error ? <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Volver</Button>
                <Button type="submit" variant={isArchive ? "danger" : "outline"} loading={isPending}>{isArchive ? "Archivar Nota" : "Revocar enlace"}</Button>
              </DialogFooter>
            </form>
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}
