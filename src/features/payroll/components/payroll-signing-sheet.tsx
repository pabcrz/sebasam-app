"use client";

import * as React from "react";
import { FileSignature, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WeeklyPayrollReport } from "../domain";
import type { ParsedPayrollParams } from "../period";

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
  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeZone: "America/Mexico_City",
  }).format(new Date());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-[var(--color-primary-600)]" />
            <DialogTitle>Hoja de Firma de Nómina</DialogTitle>
          </div>
          <DialogDescription>
            Documento colectivo para firma de conformidad de los trabajadores. Los montos se mantienen 100% confidenciales.
          </DialogDescription>
        </DialogHeader>

        {/* Printable Surface */}
        <div id="payroll-signing-sheet-document" className="space-y-6 rounded-md border border-[var(--color-border-light)] p-6 bg-white text-slate-900 shadow-sm print:border-none print:p-0 print:shadow-none">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">SEBASAM</h1>
              <p className="text-xs text-slate-600">Servicio Básico a Suspensiones y Aire y Muelles</p>
            </div>
            <div className="sm:text-right">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Hoja de Firma de Nómina ({period.mode === "monthly" ? "Mensual" : "Semanal"})
              </h2>
              <p className="text-xs font-medium text-slate-600">
                Período: <span className="font-semibold text-slate-900">{period.rangeLabel}</span>
              </p>
              <p className="text-[11px] text-slate-500">Fecha de Emisión: {todayStr}</p>
            </div>
          </div>

          {/* Workers Table */}
          <div className="overflow-hidden border border-slate-300 rounded">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-800 font-semibold">
                  <th className="py-2.5 px-3 w-12 text-center">No.</th>
                  <th className="py-2.5 px-4">Nombre del Trabajador</th>
                  <th className="py-2.5 px-4 w-40 text-center">Puesto / Tipo</th>
                  <th className="py-2.5 px-6 w-64 text-center">Firma de Conformidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.workers.length > 0 ? (
                  report.workers.map((worker, idx) => (
                    <tr key={worker.workerId} className="h-16">
                      <td className="py-2 px-3 text-center font-medium text-slate-600">{idx + 1}</td>
                      <td className="py-2 px-4 font-semibold text-slate-900">{worker.displayName}</td>
                      <td className="py-2 px-4 text-center text-slate-600">
                        {worker.workerKind === "SPECIAL" ? "Especial / Taller" : "Maestro Mecánico"}
                      </td>
                      <td className="py-2 px-6">
                        <div className="h-10 border-b border-dashed border-slate-400 flex items-end justify-center">
                          <span className="text-[10px] text-slate-400 pb-0.5 select-none">Firma</span>
                        </div>
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

          {/* Confidentiality Notice & Signatures */}
          <div className="pt-4 space-y-6">
            <p className="text-[11px] text-slate-600 italic leading-relaxed text-center sm:text-left">
              * Al plasmar su firma en este documento, cada trabajador manifiesta su entera conformidad con la recepción del sobre/recibo correspondiente al período indicado y la correcta liquidación de sus trabajos de mano de obra.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center">
              <div>
                <div className="w-48 mx-auto border-b border-slate-900 pb-1"></div>
                <p className="text-xs font-semibold text-slate-800 mt-1">Entregado por</p>
                <p className="text-[10px] text-slate-500">Administración / Taller</p>
              </div>
              <div>
                <div className="w-48 mx-auto border-b border-slate-900 pb-1"></div>
                <p className="text-xs font-semibold text-slate-800 mt-1">Autorizado por</p>
                <p className="text-[10px] text-slate-500">Dirección General</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
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
