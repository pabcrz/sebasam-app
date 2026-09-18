"use client";

import * as React from "react";
import { Lock, Unlock, AlertTriangle, Loader2 } from "lucide-react";
import { PayrollPeriodStatus } from "@prisma/client";
import toast from "react-hot-toast";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Badge,
} from "@/components/ui";
import { reopenPayrollWeekAction, closePayrollWeekAction } from "../actions";

interface PayrollWeekStatusControlsProps {
  weekStart: string;
  status?: PayrollPeriodStatus;
  isCurrentWeek?: boolean;
}

export function PayrollWeekStatusControls({
  weekStart,
  status = PayrollPeriodStatus.OPEN,
  isCurrentWeek = false,
}: PayrollWeekStatusControlsProps) {
  const [reopenOpen, setReopenOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const isClosed = status === PayrollPeriodStatus.CLOSED;

  const handleReopen = async () => {
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length < 5) {
      toast.error("Ingresa un motivo válido para la reapertura (mínimo 5 caracteres).");
      return;
    }

    setLoading(true);
    try {
      const res = await reopenPayrollWeekAction({
        weekStart,
        reason: trimmed,
      });

      if (res.success) {
        toast.success("Semana de nómina reabierta con éxito.");
        setReopenOpen(false);
        setReason("");
      } else {
        toast.error(res.error || "No se pudo reabrir la semana.");
      }
    } catch {
      toast.error("Error al reabrir la semana.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    setLoading(true);
    try {
      const res = await closePayrollWeekAction({ weekStart });
      if (res.success) {
        toast.success("Semana de nómina cerrada con éxito.");
        setCloseOpen(false);
      } else {
        toast.error(res.error || "No se pudo cerrar la semana.");
      }
    } catch {
      toast.error("Error al cerrar la semana.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isClosed ? (
        <>
          <Badge
            variant="default"
            className="text-xs py-0.5 px-2 text-slate-700 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700 gap-1 inline-flex items-center"
          >
            <Lock className="h-3 w-3 text-slate-500" />
            Semana Cerrada
          </Badge>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReopenOpen(true)}
            className="h-7 text-xs px-2.5 gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-950/40"
          >
            <Unlock className="h-3 w-3" />
            Reabrir semana
          </Button>
        </>
      ) : (
        <>
          <Badge
            variant="success"
            className="text-xs py-0.5 px-2 text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 gap-1 inline-flex items-center"
          >
            <Unlock className="h-3 w-3 text-emerald-600" />
            Semana Abierta
          </Badge>
          {!isCurrentWeek && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCloseOpen(true)}
              className="h-7 text-xs px-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              Cerrar semana
            </Button>
          )}
        </>
      )}

      {/* Dialog Reabrir Semana */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Reabrir Semana de Nómina
            </DialogTitle>
            <DialogDescription>
              Esta semana se encuentra cerrada para registro o eliminación de avances de mano de obra.
              Ingresa el motivo operativo para autorizar su reapertura.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reopen-reason" className="text-xs font-medium">
                Motivo de reapertura <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="reopen-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej. Ajuste de avance rezagado autorizado por gerencia..."
                className="w-full rounded-md border border-[var(--color-border-light)] bg-transparent p-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={loading}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReopenOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleReopen}
              disabled={loading || reason.trim().length < 5}
              className="gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Autorizar reapertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cerrar Semana */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Lock className="h-5 w-5 text-slate-500" />
              Cerrar Semana de Nómina
            </DialogTitle>
            <DialogDescription>
              Al cerrar esta semana, quedará bloqueado el registro y eliminación de nuevos anticipos a menos que se realice una reapertura explícita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCloseOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleClose}
              disabled={loading}
              className="gap-1.5"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
