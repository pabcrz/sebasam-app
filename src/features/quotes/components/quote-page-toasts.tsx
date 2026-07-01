"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";

const errorMessages: Record<string, string> = {
  invalid: "Revisa los datos de la cotización e incluye al menos un concepto completo.",
  "invalid-approval": "Selecciona una cotización válida antes de aprobar.",
  "duplicate-work-order": "Esta cotización ya tiene una orden de trabajo.",
  "approval-failed": "No se pudo aprobar la cotización. Recarga y confirma que siga en borrador.",
  "invalid-share": "Selecciona una cotización válida antes de compartir.",
  "share-failed": "No se pudo compartir la cotización. Recarga y confirma que tenga al menos un concepto completo.",
};

export function QuotePageToasts() {
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
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

    const error = params.get("error");
    if (error) {
      toast.error(errorMessages[error] ?? "Ocurrió un error inesperado.", { id: `quote-error-${error}` });
      params.delete("error");
      changed = true;
    }

    if (changed) {
      const query = params.toString();
      router.replace(`/admin/quotes${query ? `?${query}` : ""}`, { scroll: false });
    }
  }, [searchParams, router]);

  return null;
}
