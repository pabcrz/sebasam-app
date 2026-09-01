"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const errorMessages: Record<string, string> = {
  invalid: "Revisa los datos de la cotización e incluye al menos un concepto completo.",
  "invalid-approval": "Selecciona una cotización válida antes de aprobar.",
  "duplicate-work-order": "Esta cotización ya tiene una orden de trabajo.",
  "approval-failed": "No se pudo aprobar la cotización. Recarga y confirma que siga en borrador.",
  "invalid-share": "Selecciona una cotización válida antes de compartir.",
  "share-failed": "No se pudo compartir la cotización. Recarga y confirma que tenga al menos un concepto completo.",
  "not-draft": "Esta cotización ya no está en borrador.",
  "not-draft-sent": "Esta cotización no se puede cancelar porque no está en borrador ni enviada.",
  "has-work-order": "Esta cotización ya tiene una orden de trabajo.",
  "update-failed": "No se pudo actualizar la cotización. Recarga e intenta de nuevo.",
  "duplicate-failed": "No se pudo duplicar la cotización. Recarga e intenta de nuevo.",
  "not-editable": "Esta cotización no se puede editar en este momento.",
  "cancellation-failed": "No se pudo cancelar la cotización. Recarga e intenta de nuevo.",
  "invalid-cancellation": "Selecciona una cotización válida antes de cancelar.",
  "cannot-delete": "No se puede eliminar la cotización porque tiene actividad vinculada (orden de trabajo o pagos) o no está en un estado eliminable.",
  "deletion-failed": "No se pudo eliminar la cotización. Recarga e intenta de nuevo.",
  "invalid-deletion": "Selecciona una cotización válida antes de eliminar.",
};

export function QuotePageToasts() {
  const searchParams = useSearchParams();
  const processedSearchRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const search = searchParams.toString();
    if (processedSearchRef.current === search) return;
    processedSearchRef.current = search;

    const params = new URLSearchParams(search);
    let changed = false;

    if (params.get("created")) {
      toast.success("Cotización en borrador creada.", { id: "quote-created" });
      params.delete("created");
      changed = true;
    }

    if (params.get("approved")) {
      toast.success("Cotización aceptada.", { id: "quote-approved" });
      params.delete("approved");
      changed = true;
    }

    if (params.get("updated")) {
      toast.success("Cotización actualizada.", { id: "quote-updated" });
      params.delete("updated");
      changed = true;
    }

    if (params.get("cancelled")) {
      toast.success("Cotización cancelada.", { id: "quote-cancelled" });
      params.delete("cancelled");
      changed = true;
    }

    if (params.get("shared")) {
      toast.success("Cotización compartida.", { id: "quote-shared" });
      params.delete("shared");
      changed = true;
    }

    if (params.get("duplicated")) {
      toast.success("Cotización duplicada.", { id: "quote-duplicated" });
      params.delete("duplicated");
      changed = true;
    }

    if (params.get("deleted")) {
      toast.success("Cotización eliminada.", { id: "quote-deleted" });
      params.delete("deleted");
      changed = true;
    }

    const error = params.get("error");
    if (error) {
      toast.error(errorMessages[error] ?? "Ocurrió un error inesperado.", { id: `quote-error-${error}` });
      params.delete("error");
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      window.history.replaceState(window.history.state, "", url);
    }
  }, [searchParams]);

  return null;
}
