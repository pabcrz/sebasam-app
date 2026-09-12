"use client";

import * as React from "react";
import { Archive, ShieldOff } from "lucide-react";
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

type NoteArchiveRevocationActionsProps = {
  quoteNumber: string;
  archived: boolean;
  archiveAction: (reason: string) => Promise<void>;
  revokeAction: (reason: string) => Promise<ActionResult>;
};

export function NoteArchiveRevocationActions({
  quoteNumber,
  archived,
  archiveAction,
  revokeAction,
}: NoteArchiveRevocationActionsProps) {
  const [dialog, setDialog] = React.useState<"archive" | "revoke" | null>(null);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentDialog = dialog;
    if (!currentDialog) return;
    setError(null);
    startTransition(async () => {
      try {
        if (currentDialog === "archive") {
          await archiveAction(reason);
        } else {
          const result = await revokeAction(reason);
          if (!result.success) {
            setError(result.error);
            return;
          }
        }
        setDialog(null);
        setReason("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo actualizar la Nota.");
      }
    });
  }

  const isArchive = dialog === "archive";

  return (
    <>
      {!archived ? (
        <Button type="button" variant="outline" size="sm" aria-label={`Archivar Nota ${quoteNumber}`} title={`Archivar Nota ${quoteNumber}`} onClick={() => { setError(null); setDialog("archive"); }} disabled={isPending}>
          <Archive className="h-5 w-5" aria-hidden="true" />
          <span className="sr-only sm:not-sr-only">Archivar</span>
        </Button>
      ) : null}
      <Button type="button" variant="outline" size="sm" aria-label={`Revocar enlace de Nota ${quoteNumber}`} title={`Revocar enlace de Nota ${quoteNumber}`} onClick={() => { setError(null); setDialog("revoke"); }} disabled={isPending}>
        <ShieldOff className="h-5 w-5" aria-hidden="true" />
        <span className="sr-only sm:not-sr-only">Revocar enlace</span>
      </Button>
      {error && !dialog ? <p role="alert" className="text-sm text-[var(--color-status-danger-fg)]">{error}</p> : null}
      <Dialog open={dialog !== null} onOpenChange={(open) => { if (!isPending && !open) setDialog(null); }}>
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
                <Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={isPending}>Volver</Button>
                <Button type="submit" variant={isArchive ? "danger" : "outline"} loading={isPending}>{isArchive ? "Archivar Nota" : "Revocar enlace"}</Button>
              </DialogFooter>
            </form>
          </DialogMobileBody>
        </DialogMobileContent>
      </Dialog>
    </>
  );
}
