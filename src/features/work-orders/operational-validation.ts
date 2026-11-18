import { QuoteItemType } from "@/generated/prisma/client";
import { calculateItemTotalCents, calculateQuoteTotals } from "@/features/quotes/lib/calculate";
import { WorkOrderOperationError } from "./domain";

type OperationalQuoteItem = {
  type: unknown;
  description: string;
  quantity: unknown;
  unitPriceCents: number | null;
};

type OperationalQuote = {
  customerId: string | null;
  vehicle?: { plate: string | null; brand: string | null; model: string | null } | null;
  vehicleSnapshot?: unknown;
  subtotalCents: number | null;
  discountCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  taxEnabled: boolean;
  sections?: Array<{ items: OperationalQuoteItem[] }>;
  items?: OperationalQuoteItem[];
};

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

function hasIdentifiableUnit(quote: OperationalQuote) {
  const snapshot = quote.vehicleSnapshot && typeof quote.vehicleSnapshot === "object" && !Array.isArray(quote.vehicleSnapshot)
    ? quote.vehicleSnapshot as Record<string, unknown>
    : {};
  const plate = quote.vehicle?.plate ?? snapshot.plate;
  const brand = quote.vehicle?.brand ?? snapshot.brand;
  const model = quote.vehicle?.model ?? snapshot.model;

  return hasText(plate) || (hasText(brand) && hasText(model));
}

function getItems(quote: OperationalQuote) {
  return quote.sections?.flatMap((section) => section.items) ?? quote.items ?? [];
}

function assertIdentityAndConcepts(quote: OperationalQuote) {
  if (!quote.customerId && !hasIdentifiableUnit(quote)) {
    throw new WorkOrderOperationError("Selecciona un cliente o identifica la unidad con placas o marca y modelo antes de iniciar el trabajo.");
  }

  const items = getItems(quote);
  if (items.length === 0) {
    throw new WorkOrderOperationError("Agrega al menos un concepto antes de iniciar el trabajo.");
  }

  const validTypes = new Set<string>(Object.values(QuoteItemType));
  if (items.some((item) => {
    const quantity = Number(item.quantity);
    return !validTypes.has(String(item.type)) || item.description.trim() === "" || !Number.isInteger(quantity) || quantity <= 0;
  })) {
    throw new WorkOrderOperationError("Completa el tipo, descripción y cantidad válida de todos los conceptos antes de iniciar el trabajo.");
  }

  return items;
}

export function assertOperationalStartQuote(quote: OperationalQuote) {
  assertIdentityAndConcepts(quote);
}

export function assertOperationalClosureQuote(quote: OperationalQuote) {
  const items = assertIdentityAndConcepts(quote);

  if (items.some((item) => item.unitPriceCents === null || !Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0)) {
    throw new WorkOrderOperationError("Completa los precios válidos de todos los conceptos antes de finalizar el trabajo.");
  }

  const subtotalCents = items.reduce(
    (total, item) => total + calculateItemTotalCents(Number(item.quantity), item.unitPriceCents!),
    0,
  );
  const totals = calculateQuoteTotals(subtotalCents, quote.taxEnabled, quote.discountCents ?? 0);

  if (
    quote.subtotalCents !== totals.subtotalCents
    || quote.taxCents !== totals.taxCents
    || quote.totalCents !== totals.totalCents
  ) {
    throw new WorkOrderOperationError("Revisa los precios para actualizar los totales antes de finalizar el trabajo.");
  }

  return totals;
}
