"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import Link from "next/link";

export function PrintControls() {
  return (
    <div className="mb-6 flex items-center justify-between border-b pb-4 print:hidden px-4 md:px-8 mt-4 max-w-3xl mx-auto">
      <Link href="/admin/notas">
        <Button type="button" variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la nota
        </Button>
      </Link>
      <Button type="button" variant="primary" onClick={() => window.print()}>
        <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
        Imprimir / Guardar PDF
      </Button>
    </div>
  );
}
