import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuoteStatus } from "@prisma/client";

const requireOperationalRoleMock = vi.hoisted(() => vi.fn());
const prismaQuoteFindUniqueMock = vi.hoisted(() => vi.fn());
const listCustomersMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());
const updateDraftQuoteFromFormMock = vi.hoisted(() => vi.fn());
const editDraftQuoteFormMock = vi.hoisted(() =>
  vi.fn(() => <div data-testid="edit-draft-quote-form" />),
);

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: requireOperationalRoleMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quote: {
      findUnique: prismaQuoteFindUniqueMock,
    },
  },
}));

vi.mock("@/features/customers/queries", () => ({
  listCustomers: listCustomersMock,
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
  redirect: redirectMock,
}));

vi.mock("@/features/quotes/actions", () => ({
  updateDraftQuoteFromForm: updateDraftQuoteFromFormMock,
}));

vi.mock("@/features/quotes/components/edit-draft-quote-form", () => ({
  EditDraftQuoteForm: editDraftQuoteFormMock,
}));

import EditQuotePage from "./page";

describe("EditQuotePage", () => {
  const quoteId = "quote-123";
  const params = Promise.resolve({ id: quoteId });

  it("calls requireOperationalRole before loading data", async () => {
    requireOperationalRoleMock.mockRejectedValue(new Error("unauthorized"));

    await expect(EditQuotePage({ params })).rejects.toThrow("unauthorized");
    expect(requireOperationalRoleMock).toHaveBeenCalled();
  });

  it("calls notFound when the quote does not exist", async () => {
    requireOperationalRoleMock.mockResolvedValue(undefined);
    prismaQuoteFindUniqueMock.mockResolvedValue(null);
    listCustomersMock.mockResolvedValue([]);
    notFoundMock.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(EditQuotePage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(prismaQuoteFindUniqueMock).toHaveBeenCalledWith({
      where: { id: quoteId },
      include: expect.objectContaining({
        customer: true,
        vehicle: true,
        sections: {
          include: {
            items: {
              orderBy: { sortOrder: "asc" },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
        workOrder: true,
      }),
    });
    expect(notFoundMock).toHaveBeenCalled();
  });

  it("redirects to /admin/quotes when quote status is not editable", async () => {
    requireOperationalRoleMock.mockResolvedValue(undefined);
    prismaQuoteFindUniqueMock.mockResolvedValue({
      status: QuoteStatus.CANCELLED,
      workOrder: null,
      validUntil: new Date("2026-12-31"),
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      sections: [],
    });
    listCustomersMock.mockResolvedValue([]);
    redirectMock.mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });

    await expect(EditQuotePage({ params })).rejects.toThrow(
      "NEXT_REDIRECT:/admin/quotes",
    );
    expect(redirectMock).toHaveBeenCalledWith("/admin/quotes");
  });



  it("renders EditDraftQuoteForm with initialData from quote/items/customer/vehicle and quoteNumber for DRAFT without workOrder", async () => {
    requireOperationalRoleMock.mockResolvedValue(undefined);

    const draftQuote = {
      id: quoteId,
      number: "COT-001",
      status: QuoteStatus.DRAFT,
      title: "Servicio general",
      description: "Descripción de prueba",
      administrative: false,
      taxEnabled: true,
      operationalDate: new Date("2026-07-14T00:00:00.000Z"),
      customerId: "customer-1",
      customer: { id: "customer-1", name: "Cliente Demo" },
      vehicle: {
        plate: "ABC123",
        brand: "Toyota",
        model: "Corolla",
        year: 2022,
      },
      vehicleSnapshot: null,
      sections: [
        {
          name: "Sección 1",
          items: [
            {
              type: "LABOR" as const,
              description: "Mano de obra",
              quantity: 2,
              unitPriceCents: 50_000,
            },
          ],
        },
      ],
      workOrder: null,
    };

    const customers = [
      { id: "customer-1", name: "Cliente Demo" },
      { id: "customer-2", name: "Otro Cliente" },
    ];

    prismaQuoteFindUniqueMock.mockResolvedValue(draftQuote);
    listCustomersMock.mockResolvedValue(customers);

    render(await EditQuotePage({ params }));

    expect(screen.getByTestId("edit-draft-quote-form")).toBeInTheDocument();

    expect(editDraftQuoteFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customers,
        quoteNumber: "COT-001",
        saveAction: expect.any(Function),
        initialData: expect.objectContaining({
          customerId: "customer-1",
          title: "Servicio general",
          description: "Descripción de prueba",
          administrative: false,
          taxEnabled: true,
          operationalDate: "2026-07-14",
          isOperationalDateEditable: true,
          vehicle: {
            plate: "ABC123",
            brand: "Toyota",
            model: "Corolla",
            year: "2022",
          },
          sections: [
            expect.objectContaining({
              name: "Sección 1",
              items: [
                expect.objectContaining({
                  type: "LABOR",
                  description: "Mano de obra",
                  quantity: "2",
                  unitPrice: "500",
                }),
              ],
            }),
          ],
        }),
      }),
      undefined,
    );
  });

  it("resolves vehicle data from vehicleSnapshot when vehicle relation is absent", async () => {
    requireOperationalRoleMock.mockResolvedValue(undefined);

    const draftQuote = {
      id: quoteId,
      number: "COT-002",
      status: QuoteStatus.DRAFT,
      title: "Servicio express",
      description: null,
      administrative: true,
      taxEnabled: false,
      operationalDate: new Date("2026-07-13T00:00:00.000Z"),
      customerId: "customer-2",
      customer: { id: "customer-2", name: "Otro Cliente" },
      vehicle: null,
      vehicleSnapshot: {
        plate: "XYZ789",
        brand: "Honda",
        model: "Civic",
        year: 2023,
      },
      sections: [],
      workOrder: null,
    };

    const customers = [{ id: "customer-2", name: "Otro Cliente" }];

    prismaQuoteFindUniqueMock.mockResolvedValue(draftQuote);
    listCustomersMock.mockResolvedValue(customers);

    render(await EditQuotePage({ params }));

    expect(editDraftQuoteFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialData: expect.objectContaining({
          description: "",
          administrative: true,
          taxEnabled: false,
          operationalDate: "2026-07-13",
          vehicle: {
            plate: "XYZ789",
            brand: "Honda",
            model: "Civic",
            year: "2023",
          },
          sections: [{ name: "General", items: [] }],
        }),
      }),
      undefined,
    );
  });
});
