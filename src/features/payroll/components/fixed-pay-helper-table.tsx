"use client";

import * as React from "react";
import toast from "react-hot-toast";
import { formatCents } from "@/features/quotes/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateFixedPayHelperAdjustments } from "../actions";
import type { FixedPayHelperPayrollSummary } from "../domain";

interface FixedPayHelperTableProps {
  helpers: FixedPayHelperPayrollSummary[];
  weekStart: string;
}

export function FixedPayHelperTable({ helpers, weekStart }: FixedPayHelperTableProps) {
  if (helpers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle as="h2" className="text-base sm:text-lg">
          Ayudantes generales
        </CardTitle>
        <CardDescription className="text-xs">
          Sueldo fijo semanal sin desglose por orden de trabajo. Registra faltas y comisiones de esta semana.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 sm:p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Ayudante</TableHead>
                <TableHead className="text-right">Sueldo semanal</TableHead>
                <TableHead className="text-right">Sueldo diario</TableHead>
                <TableHead className="text-center">Faltas</TableHead>
                <TableHead className="text-right">Descuento</TableHead>
                <TableHead className="text-right">Comisión manual</TableHead>
                <TableHead className="text-right">Total a liquidar</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {helpers.map((helper) => (
                <FixedPayHelperRow key={helper.workerId} helper={helper} weekStart={weekStart} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function FixedPayHelperRow({
  helper,
  weekStart,
}: {
  helper: FixedPayHelperPayrollSummary;
  weekStart: string;
}) {
  const [isPending, startTransition] = React.useTransition();
  const [absenceDaysValue, setAbsenceDaysValue] = React.useState(String(helper.absenceDays));
  const [manualCommissionValue, setManualCommissionValue] = React.useState(
    String(helper.manualCommissionCents / 100)
  );

  const handleSave = () => {
    const absenceDays = Number(absenceDaysValue);
    const manualCommission = Number(manualCommissionValue);

    if (!Number.isInteger(absenceDays) || absenceDays < 0 || absenceDays > 6) {
      toast.error("Registra entre 0 y 6 faltas.");
      return;
    }
    if (!Number.isFinite(manualCommission) || manualCommission < 0) {
      toast.error("Registra una comisión manual válida.");
      return;
    }

    startTransition(async () => {
      const result = await updateFixedPayHelperAdjustments({
        workerId: helper.workerId,
        weekStart,
        absenceDays,
        manualCommissionCents: Math.round(manualCommission * 100),
      });
      if (result.success) {
        toast.success("Ajustes del ayudante actualizados.");
      } else {
        toast.error(result.error ?? "No se pudieron actualizar los ajustes.");
      }
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{helper.displayName}</TableCell>
      <TableCell className="text-right">{formatCents(helper.weeklyRateCents)}</TableCell>
      <TableCell className="text-right">{formatCents(helper.dailyRateCents)}</TableCell>
      <TableCell className="text-center">
        <Input
          aria-label={`Faltas de ${helper.displayName}`}
          type="number"
          min="0"
          max="6"
          step="1"
          value={absenceDaysValue}
          onChange={(event) => setAbsenceDaysValue(event.target.value)}
          className="h-8 w-16 text-right"
        />
      </TableCell>
      <TableCell className="text-right text-red-600 dark:text-red-400">
        {formatCents(helper.absenceDeductionCents)}
      </TableCell>
      <TableCell className="text-right">
        <Input
          aria-label={`Comisión manual de ${helper.displayName}`}
          type="number"
          min="0"
          step="0.01"
          value={manualCommissionValue}
          onChange={(event) => setManualCommissionValue(event.target.value)}
          className="ml-auto h-8 w-28 text-right"
        />
      </TableCell>
      <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
        {formatCents(helper.totalPayableCents)}
      </TableCell>
      <TableCell>
        <Button type="button" size="sm" variant="outline" disabled={isPending} onClick={handleSave}>
          {isPending ? "..." : "Guardar"}
        </Button>
      </TableCell>
    </TableRow>
  );
}
