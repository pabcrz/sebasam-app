"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";

export type ReturnDestination = "/admin/quotes" | "/admin/notas" | "/admin/work-orders";

export function resolveReturnTo(raw: string | null): ReturnDestination {
  if (raw === "/admin/quotes" || raw === "/admin/notas" || raw === "/admin/work-orders") return raw;
  return "/admin/quotes";
}

export function PrintControls({ backLabel = "Volver" }: { backLabel?: string }) {
  const searchParams = useSearchParams();
  const returnTo = resolveReturnTo(searchParams.get("returnTo"));

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 print:hidden">
      <Button asChild type="button" variant="ghost" size="icon" className="min-h-11 min-w-11" title={backLabel} aria-label={backLabel}>
        <Link href={returnTo}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{backLabel}</span>
        </Link>
      </Button>
      <Button type="button" variant="primary" size="icon" className="min-h-11 min-w-11" title="Imprimir / Guardar PDF" aria-label="Imprimir / Guardar PDF" onClick={() => window.print()}>
        <Printer className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Imprimir / Guardar PDF</span>
      </Button>
    </div>
  );
}
