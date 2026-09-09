import { describe, expect, it } from "vitest";
import { mapPersistedQuoteToBuilderInitialData } from "./quote-builder-mapper";

const persistedQuote = {
  customerId: "customer-1",
  vehicle: { plate: "ABC-123", brand: null, model: "Transit", year: 2024 },
  vehicleSnapshot: { plate: "OLD", brand: "Ford", model: "Old", year: 2020 },
  title: "Service",
  description: null,
  administrative: true,
  taxEnabled: false,
  discountCents: 2500,
  operationalDate: new Date("2026-09-01T00:00:00.000Z"),
  status: "DRAFT",
  sections: [
    {
      name: "Front",
      isAuthorized: true,
      items: [
        {
          type: "OTHER" as const,
          description: "Pending detail",
          quantity: 2,
          unitPriceCents: null,
          includeInPayroll: true,
          customRatePercent: 35,
        },
      ],
    },
  ],
  items: [],
};

describe("mapPersistedQuoteToBuilderInitialData", () => {
  it("maps sections, vehicle fallbacks, payroll fields, and pending prices", () => {
    expect(mapPersistedQuoteToBuilderInitialData(persistedQuote)).toEqual({
      customerId: "customer-1",
      customerContactId: null,
      customerFiscalProfileId: null,
      vehicle: { plate: "ABC-123", brand: "Ford", model: "Transit", year: "2024", economicNumber: "" },
      title: "Service",
      description: "",
      administrative: true,
      taxEnabled: false,
      discountCents: 2500,
      operationalDate: "2026-09-01",
      isOperationalDateEditable: true,
      sections: [
        {
          name: "Front",
          isAuthorized: true,
          items: [
            {
              type: "OTHER",
              description: "Pending detail",
              quantity: "2",
              unitPrice: "",
              includeInPayroll: true,
              customRatePercent: "35",
            },
          ],
        },
      ],
    });
  });

  it("maps contacts, fiscal profiles, and vehicle economic number when present", () => {
    const mapped = mapPersistedQuoteToBuilderInitialData({
      ...persistedQuote,
      customerContactId: "contact-1",
      customerFiscalProfileId: "fiscal-1",
      vehicle: {
        plate: "XYZ-789",
        brand: "Kenworth",
        model: "T680",
        year: 2022,
        economicNumber: "ECO-104",
      },
    });

    expect(mapped.customerContactId).toBe("contact-1");
    expect(mapped.customerFiscalProfileId).toBe("fiscal-1");
    expect(mapped.vehicle.economicNumber).toBe("ECO-104");
  });

  it("maps legacy root items into a General section", () => {
    const mapped = mapPersistedQuoteToBuilderInitialData({
      ...persistedQuote,
      status: "SENT",
      operationalDate: "2026-08-31T12:30:00.000Z",
      vehicle: null,
      sections: [],
      items: [
        {
          type: "LABOR",
          description: "Legacy work",
          quantity: "1",
          unitPriceCents: 12345,
        },
      ],
    });

    expect(mapped.vehicle).toEqual({ plate: "OLD", brand: "Ford", model: "Old", year: "2020", economicNumber: "" });
    expect(mapped.operationalDate).toBe("2026-08-31");
    expect(mapped.isOperationalDateEditable).toBe(false);
    expect(mapped.sections[0]?.name).toBe("General");
    expect(mapped.sections[0]?.items[0]).toMatchObject({ unitPrice: "123.45", customRatePercent: "40" });
  });
});
