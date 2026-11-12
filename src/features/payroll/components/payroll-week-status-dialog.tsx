"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { PayrollPeriodStatus } from "@/generated/prisma/enums";
import toast from "react-hot-toast";
import {
  Badge,
  Button,
  Dialog,
  DialogDescription,
  DialogMobileBody,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  Label,
} from "@/components/ui";
import { reopenPayrollWeekAction, closePayrollWeekAction } from "../actions";

/** Open or closed state of the week, shown in the page header. */
export function PayrollWeekStatusBadge({ status = PayrollPeriodStatus.OPEN }: { status?: PayrollPeriodStatus }) {
  if (status === PayrollPeriodStatus.CLOSED) {
    return (
      <Badge variant="default" className="gap-1">
        <Icon name="lock" className="h-3 w-3" aria-hidden="true" />
        Semana cerrada
      </Badge>
    );
  }

  return (
    <Badge variant="success" className="gap-1">
      <Icon name="unlock" className="h-3 w-3" aria-hidden="true" />
      Semana abierta
    </Badge>
  );
}

interface PayrollWeekStatusControlsProps {
  weekStart: string;
  status?: PayrollPeriodStatus;
  isCurrentWeek?: boolean;
}

/** Close or reopen the week. Both confirmations use the dialog anatomy with an outlined danger confirm. */
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
        <Button type="button" variant="outline" size="sm" onClick={() => setReopenOpen(true)} className="gap-1.5">
          <Icon name="unlock" className="h-4 w-4" aria-hidden="true" />
          Reabrir semana
        </Button>
      ) : !isCurrentWeek ? (
        <Button type="button" variant="outline" size="sm" onClick={() => setCloseOpen(true)} className="gap-1.5">
          <Icon name="lock" className="h-4 w-4" aria-hidden="true" />
          Cerrar semana
        </Button>
      ) : null}

      {/* Dialog Reabrir Semana */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogMobileContent className="sm:max-w-[440px]">
          <DialogMobileHeader>
            <DialogTitle>Reabrir semana de nómina</DialogTitle>
            <DialogDescription>
              Esta semana se encuentra cerrada para registro o eliminación de avances de mano de obra.
              Ingresa el motivo operativo para autorizar su reapertura.
            </DialogDescription>
          </DialogMobileHeader>
          <DialogMobileBody className="space-y-3">
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
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-transparent p-2 text-xs text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={loading}
              />
            </div>
          </DialogMobileBody>
          <DialogMobileFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setReopenOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleReopen}
              disabled={loading || reason.trim().length < 5}
              className="gap-1.5"
            >
              {loading && <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />}
              Autorizar reapertura
            </Button>
          </DialogMobileFooter>
        </DialogMobileContent>
      </Dialog>

      {/* Dialog Cerrar Semana */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogMobileContent className="sm:max-w-[440px]">
          <DialogMobileHeader>
            <DialogTitle>Cerrar semana de nómina</DialogTitle>
          </DialogMobileHeader>
          <DialogMobileBody>
            <DialogDescription>
              Al cerrar esta semana, quedará bloqueado el registro y eliminación de nuevos anticipos a menos que se realice una reapertura explícita.
            </DialogDescription>
          </DialogMobileBody>
          <DialogMobileFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setCloseOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={handleClose} disabled={loading} className="gap-1.5">
              {loading && <Icon name="loader" className="h-3.5 w-3.5 animate-spin" />}
              Confirmar cierre
            </Button>
          </DialogMobileFooter>
        </DialogMobileContent>
      </Dialog>
    </div>
  );
}
