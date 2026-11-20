"use client";

import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { Button, Input } from "@/components/ui";

type HoldAction = (input: unknown) => Promise<{ success: boolean; error?: string }>;

interface WorkOrderHoldControlProps {
  workOrderId: string;
  orderNumber: string;
  onHold: boolean;
  reason: string | null;
  action: HoldAction;
}

/** Marks an active job as "en espera" (optional short reason) or clears the mark; the job status never changes. */
export function WorkOrderHoldControl({ workOrderId, orderNumber, onHold, reason, action }: WorkOrderHoldControlProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(nextOnHold: boolean) {
    startTransition(async () => {
      const result = await action({ workOrderId, onHold: nextOnHold, reason: nextOnHold ? text : undefined });
      if (!result.success) {
        toast.error(result.error ?? "No se pudo actualizar el trabajo.");
        return;
      }
      toast.success(nextOnHold ? "Trabajo en espera." : "Trabajo reanudado.");
      setEditing(false);
      setText("");
    });
  }

  if (onHold) {
    return (
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--color-text-muted)]">
        <span className="min-w-0 break-words">{reason ? `Motivo: ${reason}` : "En espera, sin motivo."}</span>
        <Button type="button" variant="ghost" size="sm" loading={pending} aria-label={`Quitar espera de la orden ${orderNumber}`} onClick={() => submit(false)}>
          Quitar espera
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <Button type="button" variant="ghost" size="sm" aria-label={`Poner en espera la orden ${orderNumber}`} onClick={() => setEditing(true)}>
        Poner en espera
      </Button>
    );
  }

  return (
    <form className="flex min-w-0 flex-wrap items-center gap-2" onSubmit={(event) => { event.preventDefault(); submit(true); }}>
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        maxLength={120}
        placeholder="Motivo (opcional): refacción, cliente…"
        aria-label={`Motivo de espera de la orden ${orderNumber}`}
        className="min-w-0 flex-1"
      />
      <Button type="submit" variant="tonal" size="sm" loading={pending}>Confirmar</Button>
      <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => setEditing(false)}>Cancelar</Button>
    </form>
  );
}
