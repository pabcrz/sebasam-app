"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { QuoteItemType } from "@prisma/client";
import { ITEM_TYPE_LABELS } from "../types";
import { hasQuantityConcept, isPayrollConcept } from "../domain";
import {
  resolveMasterId,
  type DraftItem,
  type DraftPayload,
  type DraftWork,
} from "./import-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImportReviewStepProps {
  draft: DraftPayload;
  masters: Array<{ id: string; displayName: string }>;
  workErrors: Record<string, string[]>;
  onDraftChange: (draft: DraftPayload) => void;
  onBack: () => void;
  onContinue: () => void;
  canContinue: boolean;
}

const itemTypes: QuoteItemType[] = ["LABOR", "REFACCIONES", "MATERIAL", "OTHER"];

export function ImportReviewStep({
  draft,
  masters,
  workErrors,
  onDraftChange,
  onBack,
  onContinue,
  canContinue,
}: ImportReviewStepProps) {

  const updateWork = (workIndex: number, patch: Partial<DraftWork>) => {
    const next: DraftPayload = {
      ...draft,
      works: draft.works.map((work, index) => (index === workIndex ? { ...work, ...patch } : work)),
    };
    onDraftChange(next);
  };

  const updateItem = (workIndex: number, itemIndex: number, patch: Partial<DraftItem>) => {
    const next: DraftPayload = {
      ...draft,
      works: draft.works.map((work, index) =>
        index === workIndex
          ? {
              ...work,
              items: work.items.map((item, i) => (i === itemIndex ? { ...item, ...patch } : item)),
            }
          : work,
      ),
    };
    onDraftChange(next);
  };

  const removeWork = (workIndex: number) => {
    onDraftChange({ ...draft, works: draft.works.filter((_, index) => index !== workIndex) });
  };

  const removeItem = (workIndex: number, itemIndex: number) => {
    onDraftChange({
      ...draft,
      works: draft.works.map((work, index) =>
        index === workIndex
          ? { ...work, items: work.items.filter((_, i) => i !== itemIndex) }
          : work,
      ),
    });
  };

  const addItem = (workIndex: number) => {
    const newItem: DraftItem = {
      key: `new-item-${Date.now()}`,
      type: "LABOR",
      description: "",
      quantity: "",
      customerPrice: "",
      payrollBase: "",
      ratePercent: "",
      includeInPayroll: false,
      isKit: false,
    };
    onDraftChange({
      ...draft,
      works: draft.works.map((work, index) =>
        index === workIndex ? { ...work, items: [...work.items, newItem] } : work,
      ),
    });
  };

  const handleMasterChange = (workIndex: number, value: string) => {
    const resolvedId = resolveMasterId(value, masters);
    onDraftChange({
      ...draft,
      works: draft.works.map((work, index) =>
        index === workIndex ? { ...work, master: value, masterId: resolvedId } : work,
      ),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--color-text-main)]">Revisar</h2>
        <p className="text-sm text-[var(--color-text-muted)]">
          Lote {draft.batch.id} · {draft.works.length} trabajos
        </p>
      </div>

      {draft.works.map((work, workIndex) => (
        <Card key={work.key}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle as="h3">Trabajo {work.ref || `#${workIndex + 1}`}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeWork(workIndex)}
                aria-label={`Eliminar trabajo ${work.ref || workIndex + 1}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor={`${work.key}-ref`}>Referencia</Label>
                <Input
                  id={`${work.key}-ref`}
                  value={work.ref}
                  onChange={(event) => updateWork(workIndex, { ref: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${work.key}-date`}>Fecha (YYYY-MM-DD)</Label>
                <Input
                  id={`${work.key}-date`}
                  value={work.date}
                  onChange={(event) => updateWork(workIndex, { date: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${work.key}-customer`}>Cliente</Label>
                <Input
                  id={`${work.key}-customer`}
                  value={work.customerName}
                  onChange={(event) => updateWork(workIndex, { customerName: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${work.key}-plate`}>Placas</Label>
                <Input
                  id={`${work.key}-plate`}
                  value={work.plate}
                  onChange={(event) => updateWork(workIndex, { plate: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${work.key}-brand`}>Marca</Label>
                <Input
                  id={`${work.key}-brand`}
                  value={work.brand}
                  onChange={(event) => updateWork(workIndex, { brand: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${work.key}-model`}>Modelo</Label>
                <Input
                  id={`${work.key}-model`}
                  value={work.model}
                  onChange={(event) => updateWork(workIndex, { model: event.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor={`${work.key}-master`}>Maestro</Label>
                <Input
                  id={`${work.key}-master`}
                  value={work.master}
                  onChange={(event) => handleMasterChange(workIndex, event.target.value)}
                />
                {work.masterId ? (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Vinculado al perfil {masters.find((master) => master.id === work.masterId)?.displayName ?? work.master}
                  </p>
                ) : work.master.trim() !== "" ? (
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Sin perfil único: queda como texto libre
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm font-semibold text-[var(--color-text-main)]">Conceptos</p>
              {work.items.map((item, itemIndex) => {
                const payroll = isPayrollConcept(item.type, item.includeInPayroll);
                const withQuantity = hasQuantityConcept(item.type, item.includeInPayroll);
                return (
                  <div
                    key={item.key}
                    className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={item.type}
                            onValueChange={(value) =>
                              updateItem(workIndex, itemIndex, { type: value as QuoteItemType })
                            }
                          >
                            <SelectTrigger aria-label={`Tipo del concepto ${itemIndex + 1}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {itemTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {ITEM_TYPE_LABELS[type]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Concepto</Label>
                          <Input
                            value={item.description}
                            placeholder="Ej. Cambiar bujes"
                            onChange={(event) =>
                              updateItem(workIndex, itemIndex, { description: event.target.value })
                            }
                          />
                        </div>
                        {withQuantity ? (
                          <div className="space-y-2">
                            <Label>Cantidad</Label>
                            <Input
                              inputMode="decimal"
                              value={item.quantity}
                              placeholder="1"
                              onChange={(event) =>
                                updateItem(workIndex, itemIndex, { quantity: event.target.value })
                              }
                            />
                          </div>
                        ) : null}
                        <div className="space-y-2">
                          <Label>Importe total ($)</Label>
                          <Input
                            inputMode="decimal"
                            value={item.customerPrice}
                            placeholder="1200"
                            onChange={(event) =>
                              updateItem(workIndex, itemIndex, { customerPrice: event.target.value })
                            }
                          />
                        </div>
                        {payroll ? (
                          <>
                            <div className="space-y-2">
                              <Label>Base taller ($)</Label>
                              <Input
                                inputMode="decimal"
                                value={item.payrollBase}
                                placeholder="1000"
                                onChange={(event) =>
                                  updateItem(workIndex, itemIndex, { payrollBase: event.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>% comisión (vacío = 50/40)</Label>
                              <Input
                                inputMode="numeric"
                                value={item.ratePercent}
                                placeholder="50"
                                onChange={(event) =>
                                  updateItem(workIndex, itemIndex, { ratePercent: event.target.value })
                                }
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(workIndex, itemIndex)}
                        aria-label={`Eliminar concepto ${itemIndex + 1}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <Checkbox
                        checked={item.isKit}
                        onCheckedChange={(checked) =>
                          updateItem(workIndex, itemIndex, { isKit: checked === true })
                        }
                        label="Es kit (no dividir)"
                      />
                      {item.type === QuoteItemType.OTHER ? (
                        <Checkbox
                          checked={item.includeInPayroll}
                          onCheckedChange={(checked) =>
                            updateItem(workIndex, itemIndex, { includeInPayroll: checked === true })
                          }
                          label="En nómina"
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}

              <Button type="button" variant="outline" size="sm" onClick={() => addItem(workIndex)}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Agregar concepto
              </Button>
            </div>

            {workErrors[work.key]?.length ? (
              <div className="mt-4 space-y-1" role="alert">
                {workErrors[work.key].map((message) => (
                  <p key={message} className="text-xs text-[var(--color-status-danger)]">
                    {message}
                  </p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button type="button" onClick={onContinue} disabled={!canContinue || draft.works.length === 0}>
          Continuar
        </Button>
      </div>
    </div>
  );
}