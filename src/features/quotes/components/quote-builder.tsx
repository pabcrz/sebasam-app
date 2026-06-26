"use client";

import * as React from "react";
import { QuoteItemType } from "@prisma/client";
import {
  Badge,
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
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import { createQuoteValidUntil } from "@/features/quotes/lib/calculate";

type CustomerOption = {
  id: string;
  name: string;
};

type QuoteForEdit = {
  id: string;
  customerId: string;
  vehicle: { plate: string | null; brand: string | null; model: string; color: string | null; year: number | null } | null;
  vehicleSnapshot: unknown;
  title: string;
  description: string | null;
  administrative: boolean;
  taxEnabled: boolean;
  validUntil: Date;
  items: { type: QuoteItemType; description: string; quantity: number | { toNumber(): number }; unitPriceCents: number }[];
};

type QuoteBuilderProps = {
  customers: CustomerOption[];
  createAction: (formData: FormData) => void | Promise<void>;
  mode?: "create" | "edit";
  quote?: QuoteForEdit;
};

type Step = "client" | "items" | "notes" | "summary" | "preview";

type ItemFormValue = {
  type: QuoteItemType;
  description: string;
  quantity: string;
  unitPrice: string;
};

const steps: Step[] = ["client", "items", "notes", "summary", "preview"];

const stepLabels: Record<Step, string> = {
  client: "Cliente / Unidad",
  items: "Conceptos",
  notes: "Notas",
  summary: "Resumen",
  preview: "Enviar",
};

const itemTypes = Object.values(QuoteItemType);

const itemTypeLabels: Record<QuoteItemType, string> = {
  SERVICE: "Servicio",
  MATERIAL: "Material",
  LABOR: "Mano de obra",
  EQUIPMENT: "Equipo",
  OTHER: "Otro",
};

const emptyItem: ItemFormValue = {
  type: "SERVICE",
  description: "",
  quantity: "",
  unitPrice: "",
};

function calculateTotals(items: ItemFormValue[], taxEnabled: boolean) {
  let subtotalCents = 0;

  for (const item of items) {
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);

    if (item.description.trim() && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice >= 0) {
      subtotalCents += Math.round(quantity * unitPrice * 100);
    }
  }

  const taxCents = taxEnabled ? Math.round(subtotalCents * 0.16) : 0;

  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents };
}

function validateItemValue(item: ItemFormValue, index: number): string | null {
  const description = item.description.trim();
  const quantity = item.quantity.trim();
  const unitPrice = item.unitPrice.trim();
  const hasAnyValue = description !== "" || quantity !== "" || unitPrice !== "";

  if (!hasAnyValue) {
    return null;
  }

  if (description === "") {
    return `El concepto ${index + 1} necesita una descripción.`;
  }

  if (description.length > 240) {
    return `La descripción del concepto ${index + 1} es muy larga.`;
  }

  if (quantity === "") {
    return `El concepto ${index + 1} necesita una cantidad.`;
  }

  const quantityNum = Number(quantity);
  if (!Number.isFinite(quantityNum) || quantityNum <= 0 || quantityNum > 999_999.99) {
    return `La cantidad del concepto ${index + 1} debe ser mayor a 0.`;
  }

  if (Number(quantityNum.toFixed(2)) !== quantityNum) {
    return `La cantidad del concepto ${index + 1} admite hasta 2 decimales.`;
  }

  if (unitPrice === "") {
    return `El concepto ${index + 1} necesita un precio unitario.`;
  }

  const unitPriceNum = Number(unitPrice);
  if (!Number.isFinite(unitPriceNum) || unitPriceNum < 0) {
    return `El precio unitario del concepto ${index + 1} no puede ser negativo.`;
  }

  return null;
}

function isItemComplete(item: ItemFormValue): boolean {
  const description = item.description.trim();
  const quantityNum = Number(item.quantity.trim());
  const unitPriceNum = Number(item.unitPrice.trim());

  return (
    description.length > 0 &&
    Number.isFinite(quantityNum) &&
    quantityNum > 0 &&
    Number.isFinite(unitPriceNum) &&
    unitPriceNum >= 0
  );
}

function getStepError(step: Step, state: {
  customerId: string;
  vehicle: { model: string };
  title: string;
  items: ItemFormValue[];
}): string | null {
  if (step === "client") {
    if (!state.customerId) return "Selecciona un cliente.";
    if (!state.vehicle.model.trim()) return "Ingresa el modelo del vehículo.";
    return null;
  }

  if (step === "items") {
    const rowError = state.items
      .map((item, index) => validateItemValue(item, index))
      .find(Boolean);
    if (rowError) return rowError;

    return state.items.some(isItemComplete) ? null : "Ingresa al menos un concepto completo.";
  }

  if (step === "notes") {
    return state.title.trim() ? null : "Ingresa el título de la cotización.";
  }

  return null;
}

function initialItems(quote?: QuoteForEdit): ItemFormValue[] {
  if (!quote) {
    return Array.from({ length: 5 }, () => ({ ...emptyItem }));
  }

  const base = quote.items.map((item) => {
    const quantity = typeof item.quantity === "number" ? item.quantity : item.quantity.toNumber();

    return {
      type: item.type,
      description: item.description,
      quantity: quantity.toFixed(2),
      unitPrice: (item.unitPriceCents / 100).toFixed(2),
    };
  });

  while (base.length < 5) {
    base.push({ ...emptyItem });
  }

  return base;
}

function initialVehicle(quote?: QuoteForEdit) {
  const source = quote?.vehicle ?? (quote?.vehicleSnapshot as QuoteForEdit["vehicle"]);
  return {
    plate: source?.plate ?? "",
    brand: source?.brand ?? "",
    model: source?.model ?? "",
    color: source?.color ?? "",
    year: source?.year?.toString() ?? "",
  };
}

export function QuoteBuilder({ customers, createAction, mode = "create", quote }: QuoteBuilderProps) {
  const isEdit = mode === "edit";
  const [step, setStep] = React.useState<Step>("client");
  const [stepError, setStepError] = React.useState<string | null>(null);
  const [customerId, setCustomerId] = React.useState(quote?.customerId ?? "");
  const [vehicle, setVehicle] = React.useState(initialVehicle(quote));
  const [title, setTitle] = React.useState(quote?.title ?? "");
  const [description, setDescription] = React.useState(quote?.description ?? "");
  const [administrative, setAdministrative] = React.useState(quote?.administrative ?? false);
  const [taxEnabled, setTaxEnabled] = React.useState(quote?.taxEnabled ?? true);
  const [items, setItems] = React.useState<ItemFormValue[]>(() => initialItems(quote));

  const currentStepIndex = steps.indexOf(step);
  const { subtotalCents, taxCents, totalCents } = calculateTotals(items, taxEnabled);
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const completeItems = items.filter(isItemComplete);
  const validUntil = isEdit && quote ? quote.validUntil : createQuoteValidUntil();

  function updateItem(index: number, patch: Partial<ItemFormValue>) {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function goToNext() {
    const error = getStepError(step, { customerId, vehicle, title, items });

    if (error) {
      setStepError(error);
      return;
    }

    setStepError(null);
    const nextIndex = currentStepIndex + 1;

    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  }

  function goToPrevious() {
    setStepError(null);
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle as="h2">{isEdit ? "Editar cotización en borrador" : "Crear cotización en borrador"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Actualiza los datos de la cotización antes de aprobarla."
            : "Flujo paso a paso para armar una cotización desde el celular."}
        </CardDescription>
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
          {isEdit && quote ? <input type="hidden" name="quoteId" value={quote.id} /> : null}
          <Stepper steps={steps} current={step} onChange={setStep} />

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
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    name="model"
                    required
                    value={vehicle.model}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, model: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    value={vehicle.color}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, color: event.target.value }))}
                  />
                </div>
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                    value={vehicle.year}
                    onChange={(event) => setVehicle((prev) => ({ ...prev, year: event.target.value }))}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Conceptos */}
          <section hidden={step !== "items"} className="grid gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--color-text-main)]">Conceptos</h3>
              <Badge variant="info">{completeItems.length} de {items.length}</Badge>
            </div>

            {items.map((item, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-main)]">Concepto {index + 1}</span>
                  <Select
                    value={item.type}
                    onValueChange={(value) => updateItem(index, { type: value as QuoteItemType })}
                  >
                    <SelectTrigger className="w-auto min-w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {itemTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {itemTypeLabels[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <input type="hidden" name={`items.${index}.type`} value={item.type} />
                <div className="grid gap-2">
                  <Label htmlFor={`items-${index}-description`}>Descripción</Label>
                  <Input
                    id={`items-${index}-description`}
                    name={`items.${index}.description`}
                    value={item.description}
                    onChange={(event) => updateItem(index, { description: event.target.value })}
                    placeholder="Ej. Cambio de aceite"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`items-${index}-quantity`}>Cantidad</Label>
                    <Input
                      id={`items-${index}-quantity`}
                      name={`items.${index}.quantity`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => updateItem(index, { quantity: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`items-${index}-unitPrice`}>Precio unitario</Label>
                    <Input
                      id={`items-${index}-unitPrice`}
                      name={`items.${index}.unitPrice`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(index, { unitPrice: event.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </section>

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
            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
              <h3 className="font-semibold text-[var(--color-text-main)]">Cliente / Unidad</h3>
              <p data-testid="summary-customer" className="text-sm text-[var(--color-text-main)]">
                {selectedCustomer?.name ?? "Sin cliente seleccionado"}
              </p>
              <p data-testid="summary-vehicle" className="text-sm text-[var(--color-text-muted)]">
                {[vehicle.brand, vehicle.model, vehicle.color, vehicle.year, vehicle.plate]
                  .filter(Boolean)
                  .join(" · ") || "Sin datos de vehículo"}
              </p>
            </div>

            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
              <h3 className="font-semibold text-[var(--color-text-main)]">Conceptos</h3>
              {completeItems.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
              ) : (
                <ul className="grid gap-2">
                  {completeItems.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-start justify-between gap-3 text-sm text-[var(--color-text-main)]"
                    >
                      <span>
                        {item.description} ({itemTypeLabels[item.type]})
                      </span>
                      <span className="whitespace-nowrap text-[var(--color-text-muted)]">
                        {Number(item.quantity).toFixed(2)} × {formatCents(Number(item.unitPrice) * 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-light)] p-4">
              <h3 className="font-semibold text-[var(--color-text-main)]">Notas</h3>
              <p className="text-sm text-[var(--color-text-main)]">{title || "Sin título"}</p>
              {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
              {administrative ? <Badge variant="info">Administrativa</Badge> : null}
            </div>

            <QuoteTotalsCard subtotalCents={subtotalCents} taxCents={taxCents} totalCents={totalCents} />
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
            <Button
              type="button"
              variant="outline"
              onClick={goToPrevious}
              disabled={currentStepIndex === 0}
              className="min-w-[96px]"
            >
              Anterior
            </Button>

            {step === "preview" ? (
              <Button type="submit" variant="primary" className="min-w-[140px]">
                {isEdit ? "Guardar cambios" : "Crear cotización"}
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={goToNext} className="min-w-[140px]">
                Siguiente
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Stepper({
  steps,
  current,
  onChange,
}: {
  steps: Step[];
  current: Step;
  onChange?: (step: Step) => void;
}) {
  const currentIndex = steps.indexOf(current);

  return (
    <nav aria-label="Pasos de cotización">
      <ol className="flex items-center justify-between gap-1">
        {steps.map((step, index) => {
          const isActive = step === current;
          const isCompleted = index < currentIndex;
          const isClickable = onChange && (isCompleted || index <= currentIndex);

          return (
            <li key={step} className="flex flex-1 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => isClickable && onChange?.(step)}
                disabled={!isClickable}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Paso ${index + 1}: ${stepLabels[step]}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : isCompleted
                      ? "bg-[var(--color-status-success)] text-white"
                      : "bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isCompleted ? "✓" : index + 1}
              </button>
              <span
                className={`text-center text-[10px] font-medium leading-tight sm:text-xs ${
                  isActive ? "text-[var(--color-text-main)]" : "text-[var(--color-text-muted)]"
                }`}
              >
                {stepLabels[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function QuoteTotalsCard({
  subtotalCents,
  taxCents,
  totalCents,
}: {
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}) {
  return (
    <div className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-4">
      <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>Subtotal</span>
        <span data-testid="quote-subtotal">{formatCents(subtotalCents)}</span>
      </div>
      <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)]">
        <span>IVA</span>
        <span data-testid="quote-tax">{formatCents(taxCents)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-[var(--color-border-light)] pt-2 text-lg font-bold text-[var(--color-primary)]">
        <span>Total</span>
        <span data-testid="quote-total">{formatCents(totalCents)}</span>
      </div>
    </div>
  );
}

function QuotePreviewCard({
  customerName,
  vehicle,
  title,
  description,
  administrative,
  items,
  subtotalCents,
  taxCents,
  totalCents,
  validUntil,
}: {
  customerName: string;
  vehicle: { plate: string; brand: string; model: string; color: string; year: string };
  title: string;
  description: string;
  administrative: boolean;
  items: ItemFormValue[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  validUntil: Date;
}) {
  const vehicleDescription = [vehicle.brand, vehicle.model, vehicle.color, vehicle.year, vehicle.plate]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border-light)] bg-[var(--color-surface)] shadow-sm">
      <div className="bg-[image:var(--gradient-primary)] px-5 py-4 text-white">
        <p className="text-xs font-medium opacity-90">Vista previa de cotización</p>
        <p className="text-lg font-bold">{title || "Sin título"}</p>
      </div>
      <div className="grid gap-4 p-4">
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">CLIENTE</p>
          <p className="text-sm font-medium text-[var(--color-text-main)]">{customerName || "Sin cliente"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-[var(--color-text-muted)]">UNIDAD</p>
          <p className="text-sm text-[var(--color-text-main)]">{vehicleDescription || "Sin vehículo"}</p>
        </div>
        {administrative ? <Badge variant="info">Cotización administrativa</Badge> : null}
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}

        <div className="grid gap-2">
          <p className="text-xs font-medium text-[var(--color-text-muted)]">CONCEPTOS</p>
          {items.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Sin conceptos.</p>
          ) : (
            <ul className="grid gap-2">
              {items.map((item, index) => (
                <li
                  key={index}
                  className="flex items-start justify-between gap-3 border-b border-[var(--color-border-light)] pb-2 text-sm text-[var(--color-text-main)] last:border-0 last:pb-0"
                >
                  <span>
                    {item.description} ({itemTypeLabels[item.type]})
                  </span>
                  <span className="whitespace-nowrap text-[var(--color-text-muted)]">
                    {formatCents(Math.round(Number(item.quantity) * Number(item.unitPrice) * 100))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <QuoteTotalsCard subtotalCents={subtotalCents} taxCents={taxCents} totalCents={totalCents} />

        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3 text-sm text-[var(--color-text-muted)]">
          <p data-testid="quote-validity">
            Vigente hasta el {formatDate(validUntil)}. Los precios están sujetos a cambios imprevistos
            en el costo de materiales.
          </p>
        </div>
      </div>
    </div>
  );
}
