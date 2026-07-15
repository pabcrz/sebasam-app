import { calculateItemTotalCents, calculateQuoteTotals } from "./calculate";
import type { QuoteConceptType } from "./quote-concepts";

export interface QuoteDocumentViewModel {
  business: {
    name: string;
    legalName?: string;
    address?: string;
    phone?: string;
  };
  folio: string;
  issuedAt: Date;
  validUntil: Date;
  customer: { name: string };
  unit: { plate?: string; brand?: string; model?: string; year?: string };
  title: string;
  description?: string;
  concepts: Array<{
    type: QuoteConceptType;
    description: string;
    quantity: number;
    unitAmountCents: number;
    amountCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  conditions: string[];
}

type DocumentHeaderInput = Pick<
  QuoteDocumentViewModel,
  "business" | "folio" | "issuedAt" | "validUntil" | "customer" | "title" | "conditions"
> & {
  unit: QuoteDocumentViewModel["unit"];
  description?: string | null;
};

export type QuoteDocumentBuilderInput = DocumentHeaderInput & {
  items: Array<{
    type: QuoteConceptType;
    description: string;
    quantity: string;
    unitPrice: string;
  }>;
  taxEnabled: boolean;
};

export type QuoteDocumentPublicInput = DocumentHeaderInput & {
  items: Array<{
    type: QuoteConceptType;
    description: string;
    quantity: number | string;
    unitPriceCents: number;
    totalCents: number;
  }>;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
};

function header(input: DocumentHeaderInput) {
  return {
    business: input.business,
    folio: input.folio,
    issuedAt: input.issuedAt,
    validUntil: input.validUntil,
    customer: input.customer,
    unit: input.unit,
    title: input.title,
    description: input.description?.trim() || undefined,
    conditions: input.conditions,
  };
}

export function mapBuilderToQuoteDocument(input: QuoteDocumentBuilderInput): QuoteDocumentViewModel {
  const concepts = input.items.map((item) => {
    const quantity = Number(item.quantity);
    const unitAmountCents = Math.round(Number(item.unitPrice) * 100);
    const amountCents = calculateItemTotalCents(quantity, Number(item.unitPrice) * 100);
    return { ...item, quantity, unitAmountCents, amountCents };
  });
  const subtotalCents = concepts.reduce((sum, item) => sum + item.amountCents, 0);

  return { ...header(input), concepts, ...calculateQuoteTotals(subtotalCents, input.taxEnabled) };
}

export function mapPublicQuoteToDocument(input: QuoteDocumentPublicInput): QuoteDocumentViewModel {
  return {
    ...header(input),
    concepts: input.items.map((item) => ({
      type: item.type,
      description: item.description,
      quantity: Number(item.quantity),
      unitAmountCents: item.unitPriceCents,
      amountCents: item.totalCents,
    })),
    subtotalCents: input.subtotalCents,
    taxCents: input.taxCents,
    totalCents: input.totalCents,
  };
}
