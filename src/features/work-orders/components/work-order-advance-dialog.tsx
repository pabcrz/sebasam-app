"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { formatCents } from "@/features/quotes/lib/format";
import {
  recordLaborAdvanceAction,
  deleteLaborAdvanceAction,
  getWorkOrderLaborAdvancesSummary,
  type WorkOrderLaborAdvancesSummary,
} from "../actions/advances";

export interface WorkOrderAdvanceDialogProps {
  workOrderId: string;
  workOrderNumber: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function WorkOrderAdvanceDialog({
  workOrderId,
  workOrderNumber,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: WorkOrderAdvanceDialogProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (isControlled) {
        controlledOnOpenChange?.(nextOpen);
      } else {
        setUncontrolledOpen(nextOpen);
      }
    },
    [isControlled, controlledOnOpenChange]
  );

  const [loadingSummary, setLoadingSummary] = React.useState(false);
  const [summary, setSummary] = React.useState<WorkOrderLaborAdvancesSummary | null>(null);

  const [selectedQuoteItemId, setSelectedQuoteItemId] = React.useState<string>("");
  const [advancePercentage, setAdvancePercentage] = React.useState<number>(50);
  const [advanceBaseInput, setAdvanceBaseInput] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");

  const [submitting, setSubmitting] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const initConceptState = React.useCallback(
    (concepts: NonNullable<WorkOrderLaborAdvancesSummary>["concepts"], preferredId?: string) => {
      const target =
        (preferredId ? concepts.find((c) => c.quoteItemId === preferredId) : null) || concepts[0];
      if (target) {
        setSelectedQuoteItemId(target.quoteItemId);
        const remainingCents = target.remainingBaseCents;
        const initialPercent = 50;
        setAdvancePercentage(initialPercent);
        const calculatedCents = Math.round((remainingCents * initialPercent) / 100);
        setAdvanceBaseInput((calculatedCents / 100).toFixed(2));
      }
    },
    []
  );

  const loadSummary = React.useCallback(async () => {
    setLoadingSummary(true);
    setErrorMessage(null);
    try {
      const data = await getWorkOrderLaborAdvancesSummary(workOrderId);
      setSummary(data);
      if (data && data.concepts.length > 0) {
        initConceptState(data.concepts);
      }
    } catch {
      setErrorMessage("No se pudo cargar el resumen de avances.");
    } finally {
      setLoadingSummary(false);
    }
  }, [workOrderId, initConceptState]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      void loadSummary();
    }
  };

  const handleConceptChange = (newItemId: string) => {
    if (summary) {
      initConceptState(summary.concepts, newItemId);
    } else {
      setSelectedQuoteItemId(newItemId);
    }
  };

  const selectedConcept = React.useMemo(() => {
    if (!summary) return null;
    return summary.concepts.find((c) => c.quoteItemId === selectedQuoteItemId) ?? null;
  }, [summary, selectedQuoteItemId]);

  // Handle percentage change -> updates amount input
  const handlePercentageChange = (val: string) => {
    const p = parseInt(val, 10);
    const safeP = isNaN(p) ? 0 : Math.min(100, Math.max(0, p));
    setAdvancePercentage(safeP);
    if (selectedConcept) {
      const calculatedCents = Math.round((selectedConcept.remainingBaseCents * safeP) / 100);
      setAdvanceBaseInput((calculatedCents / 100).toFixed(2));
    }
  };

  // Handle amount input change -> updates percentage
  const handleAmountChange = (val: string) => {
    setAdvanceBaseInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && selectedConcept && selectedConcept.remainingBaseCents > 0) {
      const inputCents = Math.round(num * 100);
      const calculatedP = Math.min(
        100,
        Math.max(0, Math.round((inputCents / selectedConcept.remainingBaseCents) * 100))
      );
      setAdvancePercentage(calculatedP);
    }
  };

  const parsedAdvanceCents = React.useMemo(() => {
    const num = parseFloat(advanceBaseInput);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }, [advanceBaseInput]);

  const estimatedCommissionCents = React.useMemo(() => {
    if (!selectedConcept) return 0;
    return Math.round((parsedAdvanceCents * selectedConcept.commissionRatePercent) / 100);
  }, [selectedConcept, parsedAdvanceCents]);

  const isValidAmount =
    selectedConcept != null &&
    parsedAdvanceCents > 0 &&
    parsedAdvanceCents <= selectedConcept.remainingBaseCents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcept || !isValidAmount) return;

    setSubmitting(true);
    setErrorMessage(null);

    const result = await recordLaborAdvanceAction({
      workOrderId,
      quoteItemId: selectedConcept.quoteItemId,
      advanceBaseCents: parsedAdvanceCents,
      notes: notes.trim() || undefined,
    });

    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error ?? "Error al registrar el avance.");
    } else {
      setNotes("");
      await loadSummary();
      router.refresh();
      onSuccess?.();
    }
  };

  const handleDeleteAdvance = async (advanceId: string) => {
    setDeletingId(advanceId);
    setErrorMessage(null);
    const result = await deleteLaborAdvanceAction({ advanceId });
    setDeletingId(null);

    if (!result.success) {
      setErrorMessage(result.error ?? "Error al eliminar el avance.");
    } else {
      await loadSummary();
      router.refresh();
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Icon name="coins" className="h-4 w-4" aria-hidden="true" />
            Avance de mano de obra
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Avance de Mano de Obra · {workOrderNumber}</DialogTitle>
          <DialogDescription>
            Registrá un abono de base de mano de obra para liquidar comisión al maestro en la semana en curso.
          </DialogDescription>
        </DialogHeader>

        {loadingSummary ? (
          <div className="py-8 text-center text-sm text-[var(--color-text-muted)]">
            Cargando conceptos de la orden...
          </div>
        ) : !summary ? (
          <div className="py-4 text-sm text-[var(--color-status-danger)]">
            No se pudo obtener la información de la orden.
          </div>
        ) : summary.isSpecial ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-4 text-sm text-[var(--color-text-muted)]">
            Esta es una orden de taller especial; la nómina no aplica avances de maestro para este tipo de trabajo.
          </div>
        ) : !summary.masterWorker ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-status-danger)] bg-[var(--color-bg-soft)] p-4 text-sm text-[var(--color-status-danger)]">
            La orden no tiene un maestro asignado. Asigná un maestro responsable antes de registrar avances.
          </div>
        ) : summary.concepts.length === 0 ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-4 text-sm text-[var(--color-text-muted)]">
            Esta orden no tiene conceptos de mano de obra comisionables en su cotización.
          </div>
        ) : (
          <div className="grid gap-6">
            <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-3 text-sm">
              <span className="text-[var(--color-text-muted)]">Maestro responsable: </span>
              <strong className="text-[var(--color-text-main)]">{summary.masterWorker.displayName}</strong>
            </div>

            {/* Selector de concepto */}
            {summary.concepts.length > 1 ? (
              <div className="grid gap-1.5">
                <Label htmlFor="concept-select">Concepto de mano de obra</Label>
                <Select
                  value={selectedQuoteItemId}
                  onValueChange={handleConceptChange}
                  disabled={submitting}
                >
                  <SelectTrigger id="concept-select">
                    <SelectValue placeholder="Selecciona un concepto" />
                  </SelectTrigger>
                  <SelectContent>
                    {summary.concepts.map((concept) => (
                      <SelectItem key={concept.quoteItemId} value={concept.quoteItemId}>
                        {concept.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {selectedConcept ? (
              <div className="grid gap-4">
                {/* Métricas del concepto */}
                <div className="grid grid-cols-3 gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-3 text-center">
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)]">Base total</div>
                    <div className="font-semibold text-[var(--color-text-main)]">
                      {formatCents(selectedConcept.totalBaseCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)]">Abonado previo</div>
                    <div className="font-semibold text-[var(--color-status-warning)]">
                      {formatCents(selectedConcept.previousAdvancesBaseCents)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-text-muted)]">Disponible</div>
                    <div className="font-semibold text-[var(--color-status-success)]">
                      {formatCents(selectedConcept.remainingBaseCents)}
                    </div>
                  </div>
                </div>

                {selectedConcept.currentWeekAdvance ? (
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-status-warning)] bg-[var(--color-bg-soft)] p-3 text-xs text-[var(--color-text-muted)] flex items-start gap-2">
                    <Icon name="alert" className="h-4 w-4 text-[var(--color-status-warning)] shrink-0 mt-0.5" />
                    <div>
                      <strong>Ya registraste un avance para este concepto esta semana:</strong>{" "}
                      Base {formatCents(selectedConcept.currentWeekAdvance.advanceBaseCents)} (Comisión{" "}
                      {formatCents(selectedConcept.currentWeekAdvance.commissionCents)}). Podés eliminarlo
                      abajo si necesitás corregirlo.
                    </div>
                  </div>
                ) : selectedConcept.remainingBaseCents <= 0 ? (
                  <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-3 text-center text-xs text-[var(--color-text-muted)]">
                    Este concepto ya tiene el 100% de su base adelantada. Al finalizar la orden se liquidará con saldo restante $0.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="grid gap-4 border-t border-[var(--color-border-light)] pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label htmlFor="advance-percent">Porcentaje de avance (%)</Label>
                        <Input
                          id="advance-percent"
                          type="number"
                          min="1"
                          max="100"
                          step="1"
                          value={advancePercentage}
                          onChange={(e) => handlePercentageChange(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label htmlFor="advance-amount">Base a adelantar ($)</Label>
                        <Input
                          id="advance-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={advanceBaseInput}
                          onChange={(e) => handleAmountChange(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Preview de la comisión resultante */}
                    <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-soft)] p-3 text-xs flex justify-between items-center">
                      <span className="text-[var(--color-text-muted)]">
                        Comisión maestro ({selectedConcept.commissionRatePercent}%):
                      </span>
                      <strong className="text-sm text-[var(--color-text-main)]">
                        {formatCents(estimatedCommissionCents)} a pagar en nómina
                      </strong>
                    </div>

                    <div className="grid gap-1.5">
                      <Label htmlFor="advance-notes">Notas u observaciones (opcional)</Label>
                      <Input
                        id="advance-notes"
                        placeholder="Ej. Terminó un lado del chasis"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={submitting}
                      />
                    </div>

                    {errorMessage ? (
                      <div className="text-xs text-[var(--color-status-danger)]">{errorMessage}</div>
                    ) : null}

                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!isValidAmount || submitting}
                      loading={submitting}
                      className="w-full"
                    >
                      {submitting ? "Registrando avance..." : "Registrar avance en nómina"}
                    </Button>
                  </form>
                )}
              </div>
            ) : null}

            {/* Historial de avances registrados */}
            {summary.allAdvances.length > 0 ? (
              <div className="border-t border-[var(--color-border-light)] pt-4 grid gap-2">
                <h4 className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                  Historial de avances en esta orden
                </h4>
                <div className="grid gap-2">
                  {summary.allAdvances.map((adv) => (
                    <div
                      key={adv.id}
                      className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-2.5 text-xs bg-[var(--color-bg-surface)]"
                    >
                      <div>
                        <div className="font-semibold text-[var(--color-text-main)]">
                          {adv.conceptDescription} · {formatCents(adv.advanceBaseCents)}
                        </div>
                        <div className="text-[var(--color-text-muted)]">
                          Semana: {adv.weekStart} · Comisión: {formatCents(adv.commissionCents)} (
                          {adv.commissionRatePercent}%)
                          {adv.notes ? ` · "${adv.notes}"` : ""}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Eliminar avance"
                        loading={deletingId === adv.id}
                        disabled={deletingId === adv.id || submitting}
                        onClick={() => handleDeleteAdvance(adv.id)}
                      >
                        <Icon name="trash" className="h-3.5 w-3.5 text-[var(--color-status-danger)]" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
