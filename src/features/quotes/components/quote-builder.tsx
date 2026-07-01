"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { QuoteItemType } from "@prisma/client";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { createQuoteValidUntil } from "@/features/quotes/lib/calculate";
import {
  calculateTotals,
  emptyItem,
  getStepError,
  isItemComplete,
  ItemFormValue,
  maxQuantity,
  Step,
  steps,
  validateItemValue,
} from "./quote-builder-shared";
import { QuoteBuilderItemsStep } from "./quote-builder-items-step";
import { QuoteBuilderStepper } from "./quote-builder-stepper";
import { QuotePreviewCard } from "./quote-preview-card";
import { QuoteSummaryCard } from "./quote-summary-card";

type CustomerOption = {
  id: string;
  name: string;
};

type QuoteBuilderProps = {
  customers: CustomerOption[];
  createAction: (formData: FormData) => void | Promise<void>;
  onCancel?: () => void;
};

export function QuoteBuilder({ customers, createAction, onCancel }: QuoteBuilderProps) {
  const [step, setStep] = React.useState<Step>("client");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [showItemValidation, setShowItemValidation] = React.useState(false);
  const [customerId, setCustomerId] = React.useState("");
  const [vehicle, setVehicle] = React.useState({
    plate: "",
    brand: "",
    model: "",
    year: "",
  });
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [administrative, setAdministrative] = React.useState(false);
  const [taxEnabled, setTaxEnabled] = React.useState(true);
  const [items, setItems] = React.useState<ItemFormValue[]>(() => [{ ...emptyItem }]);

  const currentStepIndex = steps.indexOf(step);
  const { subtotalCents, taxCents, totalCents } = calculateTotals(items, taxEnabled);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const completeItems = items.filter(isItemComplete);
  const validUntil = createQuoteValidUntil();

  function addItem() {
    const firstInvalidIndex = items.findIndex((item, index) => validateItemValue(item, index));

    if (firstInvalidIndex !== -1) {
      setShowItemValidation(true);
      return;
    }

    setShowItemValidation(false);
    setStepError(null);
    setItems((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function updateItem(index: number, patch: Partial<ItemFormValue>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function adjustItemQuantity(index: number, delta: number) {
    setItems((prev) => {
      const next = [...prev];
      const currentQuantity = Number(next[index]?.quantity);
      const baseQuantity = Number.isFinite(currentQuantity) ? currentQuantity : 0;
      const nextQuantity = Math.min(maxQuantity, Math.max(1, baseQuantity + delta));
      next[index] = { ...next[index], quantity: String(nextQuantity) };
      return next;
    });
  }

  function addItemOfType(type: QuoteItemType) {
    const firstInvalidIndex = items.findIndex((item, index) => validateItemValue(item, index));

    if (firstInvalidIndex !== -1) {
      setShowItemValidation(true);
      return;
    }

    setShowItemValidation(false);
    setStepError(null);
    setItems((prev) => [...prev, { ...emptyItem, type }]);
  }

  function duplicateItem(index: number) {
    const firstInvalidIndex = items.findIndex((item, index) => validateItemValue(item, index));

    if (firstInvalidIndex !== -1) {
      setShowItemValidation(true);
      return;
    }

    setShowItemValidation(false);
    setStepError(null);
    setItems((prev) => {
      const source = prev[index];
      if (!source) return prev;

      const duplicated: ItemFormValue = {
        type: source.type,
        description: source.description,
        quantity: source.quantity,
        unitPrice: source.unitPrice,
      };

      const next = [...prev];
      next.splice(index + 1, 0, duplicated);
      return next;
    });
  }

  function goToNext() {
    if (step === "items") {
      const firstInvalidIndex = items.findIndex((item, index) => validateItemValue(item, index));

      if (firstInvalidIndex !== -1) {
        setShowItemValidation(true);
        setStepError(null);
        return;
      }

      if (completeItems.length === 0) {
        setStepError("Ingresa al menos un concepto completo.");
        setShowItemValidation(false);
        return;
      }

      setShowItemValidation(false);
      setStepError(null);
    } else {
      const error = getStepError(step, { customerId, vehicle, title, items });

      if (error) {
        setStepError(error);
        return;
      }

      setStepError(null);
    }

    const nextIndex = currentStepIndex + 1;

    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  }

  function goToPrevious() {
    setStepError(null);
    setShowItemValidation(false);
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">Crear cotización en borrador</CardTitle>
        <CardDescription>Flujo paso a paso para armar una cotización desde el celular.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={createAction}
          className="grid gap-6"
          data-testid="quote-builder-form"
          onSubmit={(event) => {
            if (step !== "preview") {
              event.preventDefault();
              setStepError("Avanza al último paso antes de enviar la cotización.");
            }
          }}
        >
          <QuoteBuilderStepper current={step} onChange={setStep} />

          {stepError ? (
            <p
              className="rounded-[var(--radius-sm)] border border-[var(--color-status-danger-border)] bg-[var(--color-status-danger-bg)] px-4 py-3 text-sm text-[var(--color-status-danger-fg)]"
              role="alert"
            >
              {stepError}
            </p>
          ) : null}

          {/* Step 1: Cliente / Unidad */}
          <section hidden={step !== "client"} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerId">Cliente</Label>
              <Select name="customerId" value={customerId} onValueChange={setCustomerId} required>
                <SelectTrigger id="customerId">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
              <p className="text-sm font-medium text-[var(--color-text-main)]">Vehículo</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="plate">Placas (opcional)</Label>
                  <Input
                    id="plate"
                    name="plate"
                    maxLength={10}
                    value={vehicle.plate}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, plate: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="brand">Marca (opcional)</Label>
                  <Input
                    id="brand"
                    name="brand"
                    value={vehicle.brand}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, brand: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Modelo (opcional)</Label>
                  <Input
                    id="model"
                    name="model"
                    value={vehicle.model}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, model: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="year">Año (opcional)</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1950"
                    max={new Date().getFullYear() + 1}
                    value={vehicle.year}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, year: event.target.value }))}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Conceptos */}
          <div hidden={step !== "items"}>
            <QuoteBuilderItemsStep
              items={items}
              showItemValidation={showItemValidation}
              completeItemsCount={completeItems.length}
              onAddItem={addItem}
              onAddItemOfType={addItemOfType}
              onRemoveItem={removeItem}
              onDuplicateItem={duplicateItem}
              onUpdateItem={updateItem}
              onAdjustQuantity={adjustItemQuantity}
            />
          </div>

          {/* Step 3: Notas */}
          <section hidden={step !== "notes"} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                name="title"
                required
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ej. Servicio general"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Detalles adicionales de la cotización..."
              />
            </div>
            <Checkbox
              name="administrative"
              label="Cotización administrativa"
              checked={administrative}
              onCheckedChange={(checked) => setAdministrative(checked === true)}
            />
            <input type="hidden" name="taxEnabled" value={taxEnabled ? "on" : "off"} />
            <Checkbox
              label="Incluir IVA (16%)"
              checked={taxEnabled}
              onCheckedChange={(checked) => setTaxEnabled(checked === true)}
            />
          </section>

          {/* Step 4: Resumen */}
          <section hidden={step !== "summary"} className="grid gap-4">
            <QuoteSummaryCard
              customerName={selectedCustomer?.name ?? ""}
              vehicle={vehicle}
              title={title}
              description={description}
              administrative={administrative}
              items={completeItems}
              subtotalCents={subtotalCents}
              taxCents={taxCents}
              totalCents={totalCents}
            />
          </section>

          {/* Step 5: Preview / Enviar */}
          <section hidden={step !== "preview"} className="grid gap-4">
            <QuotePreviewCard
              customerName={selectedCustomer?.name ?? ""}
              vehicle={vehicle}
              title={title}
              description={description}
              administrative={administrative}
              items={completeItems}
              subtotalCents={subtotalCents}
              taxCents={taxCents}
              totalCents={totalCents}
              validUntil={validUntil}
            />
          </section>

          <div className="sticky bottom-0 z-30 -mx-[var(--space-md)] mt-2 flex items-center justify-between gap-3 border-t border-[var(--color-border-light)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]">
            {step === "client" ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="min-w-[96px]"
              >
                Cancelar
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevious}
                className="min-w-[96px]"
              >
                Anterior
              </Button>
            )}

            {step === "preview" ? (
              <CreateQuoteSubmitButton />
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={goToNext}
                disabled={step === "client" && !customerId}
                className="min-w-[140px]"
              >
                Siguiente
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateQuoteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      loading={pending}
      className="min-w-[160px]"
      aria-live="polite"
    >
      {pending ? "Creando..." : "Crear cotización"}
    </Button>
  );
}
