"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button type="button" variant="primary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden="true" />
      Imprimir / Guardar PDF
    </Button>
  );
}
