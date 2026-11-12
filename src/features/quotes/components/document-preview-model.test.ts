import { describe, expect, it } from "vitest";
import { toDocumentPreviewProps } from "./document-preview-model";
import { toQuotePreviewCardProps, type QuotePreviewSummary } from "./quote-preview-dialog";

function summary(overrides: Record<string, unknown> = {}) {
  return {
    id: "quote-1",
    number: "C-001",
    title: "Servicio general",
    description: "",
    administrative: false,
    subtotalCents: 10000,
    discountCents: 0,
    taxCents: 1600,
    totalCents: 11600,
    paidCents: 0,
    remainingCents: 11600,
    validUntil: new Date("2026-11-18T12:00:00"),
    createdAt: new Date("2026-11-02T12:00:00"),
    customer: { name: "Constructora del Norte", phone: "55 1234 5678" },
    customerSnapshot: null,
    contactSnapshot: null,
    customerContact: null,
    customerFiscalProfile: null,
    vehicle: { plate: "ABC-123", economicNumber: "42", brand: "Ford", model: "F-150", year: 2020 },
    vehicleSnapshot: null,
    workOrder: null,
    items: [{ sectionId: null, type: "LABOR", description: "Cambio de aceite", quantity: 1, unitPriceCents: 10000 }],
    sections: [],
    ...overrides,
  } as unknown as QuotePreviewSummary;
}

function toProps(quote: QuotePreviewSummary) {
  return toDocumentPreviewProps(toQuotePreviewCardProps(quote));
}

describe("toDocumentPreviewProps", () => {
  it("keeps the quantity visible for a single labor item", () => {
    const props = toProps(summary());

    expect(props.sections[0]?.rows[0]?.quantityLabel).toBe("1");
  });

  it("names the driver only when the customer contact is a driver", () => {
    const withDriver = toProps(summary({ customerContact: { name: "Juan Chofer", role: "DRIVER" } }));
    const withBilling = toProps(summary({ customerContact: { name: "Carlos Facturación", role: "BILLING" } }));
    const withoutContact = toProps(summary());

    expect(withDriver.driverName).toBe("Juan Chofer");
    expect(withBilling.driverName).toBeNull();
    expect(withoutContact.driverName).toBeNull();
  });

  it("puts the economic number in the unit identity", () => {
    expect(toProps(summary()).unitLine).toBe("ECO 42 · Ford F-150 2020");
  });

  it("takes the customer phone from the live customer when the snapshot has none", () => {
    expect(toProps(summary()).customer.phone).toBe("55 1234 5678");
  });

  it("shows the creation and validity dates as one footer line, without the old disclaimer", () => {
    const props = toProps(summary());

    expect(props.issuedText).toBe("Cotizada el 2 de noviembre de 2026");
    expect(props.validityText).toBe("Vigente hasta 18 de noviembre de 2026");
  });

  it("omits the creation date when the quote has none", () => {
    const props = toProps(summary({ createdAt: undefined }));

    expect(props.issuedText).toBeNull();
    expect(props.validityText).toBe("Vigente hasta 18 de noviembre de 2026");
  });
});
