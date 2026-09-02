"use client";

import * as React from "react";
import Image from "next/image";
import { FileSignature, Printer, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { printElementById } from "../lib/print-element";
import type { WeeklyPayrollReport } from "../domain";
import type { ParsedPayrollParams } from "../period";

interface CustomRow {
  id: string;
  name: string;
}

interface PayrollSigningSheetProps {
  report: WeeklyPayrollReport;
  period: ParsedPayrollParams;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PayrollSigningSheetModal({
  report,
  period,
  open,
  onOpenChange,
}: PayrollSigningSheetProps) {
  const [customRows, setCustomRows] = React.useState<CustomRow[]>([]);
  const [newWorkerName, setNewWorkerName] = React.useState("");

  const handlePrint = () => {
    printElementById("payroll-signing-sheet-document", "Hoja de Firma de Nómina");
  };

  const handleAddWorker = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWorkerName.trim()) return;
    setCustomRows((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: newWorkerName.trim(),
      },
    ]);
    setNewWorkerName("");
  };

  const handleAddBlankRow = () => {
    setCustomRows((prev) => [
      ...prev,
      {
        id: `blank-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: "",
      },
    ]);
  };

  const handleRemoveCustomRow = (id: string) => {
    setCustomRows((prev) => prev.filter((r) => r.id !== id));
  };

  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  const allWorkers = [
    ...report.workers.map((w) => ({
      id: w.workerId,
      name: w.displayName,
      isCustom: false,
    })),
    ...customRows.map((r) => ({
      id: r.id,
      name: r.name,
      isCustom: true,
    })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto print:max-w-none print:w-full print:h-auto print:max-h-none print:p-0 print:border-none print:shadow-none print:overflow-visible print:static print:transform-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle>Hoja de Firma de Nómina</DialogTitle>
          </div>
        </DialogHeader>

        {/* Printable Letter-Sized Document Surface */}
        <div
          id="payroll-signing-sheet-document"
          className="w-full space-y-6 rounded-md border border-slate-300 p-8 sm:p-10 bg-white text-slate-900 shadow-sm print:border-none print:p-0 print:shadow-none print:w-full"
        >
          {/* Header with Logo and Title */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative h-11 w-11 shrink-0 flex items-center justify-center">
                <Image
                  src="/logo-white-short.png"
                  alt="Logo de SEBASAM"
                  width={44}
                  height={44}
                  className="object-contain invert"
                  priority
                />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">SEBASAM</h1>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Hoja de Firma de Nómina ({period.mode === "monthly" ? "Mensual" : "Semanal"})
              </h2>
              <p className="text-xs font-medium text-slate-700">
                Período: <span className="font-bold text-slate-900">{period.rangeLabel}</span>
              </p>
              <p className="text-[11px] text-slate-500">Fecha de Emisión: {todayStr}</p>
            </div>
          </div>

          {/* Full-width Workers Table (No Puesto column) */}
          <div className="overflow-hidden border border-slate-300 rounded">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold text-xs uppercase tracking-wide">
                  <th className="py-3.5 px-4 w-16 text-center">No.</th>
                  <th className="py-3.5 px-6">Nombre del Trabajador</th>
                  <th className="py-3.5 px-8 w-80 text-center">Firma de Conformidad</th>
                  <th className="py-3.5 px-2 w-8 text-center print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allWorkers.length > 0 ? (
                  allWorkers.map((worker, idx) => (
                    <tr key={worker.id} className="h-16 hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-600">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-6">
                        {worker.name ? (
                          <span className="font-bold text-base text-slate-900 block">
                            {worker.name}
                          </span>
                        ) : (
                          <div className="border-b border-dotted border-slate-400 h-6 w-full max-w-[280px]" />
                        )}
                      </td>
                      <td className="py-3.5 px-8">
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center">
                          <span className="text-[10px] text-slate-400 pb-0.5 select-none">Firma</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-center print:hidden">
                        {worker.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomRow(worker.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                            title="Eliminar fila"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No hay trabajadores con trabajos registrados en este período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Single clean legal notice */}
          <div className="pt-2">
            <p className="text-xs text-slate-600 italic leading-relaxed text-center sm:text-left">
              * Al plasmar su firma en este documento, cada trabajador manifiesta su entera conformidad con la recepción del sobre/recibo correspondiente al período indicado y la correcta liquidación de sus trabajos de mano de obra.
            </p>
          </div>
        </div>

        {/* Dynamic Worker Controls (UI Only - Hidden on Print, Placed at Bottom) */}
        <div className="print:hidden space-y-2 p-3 bg-[var(--color-bg-soft)] rounded-lg border border-[var(--color-border-light)] text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--color-text-main)]">
              Personalizar lista de trabajadores:
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBlankRow}
              className="h-7 text-xs gap-1"
            >
              <Plus className="h-3 w-3" />
              + Fila en blanco
            </Button>
          </div>
          <form onSubmit={handleAddWorker} className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Nombre del trabajador adicional..."
              value={newWorkerName}
              onChange={(e) => setNewWorkerName(e.target.value)}
              className="h-8 text-xs flex-1"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-8 text-xs shrink-0">
              Agregar
            </Button>
          </form>
        </div>

        {/* Dialog Actions (Hidden in Print) */}
        <DialogFooter className="flex-row justify-end gap-2 pt-2 print:hidden">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button type="button" variant="primary" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            Imprimir Hoja de Firmas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
