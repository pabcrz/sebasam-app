import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { CustomerStatus, QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { SharedQuoteView, type SharedQuoteViewProps } from "./shared-quote-view";
import { acceptSharedQuoteAction, declineSharedQuoteAction } from "@/features/quotes/actions";


vi.mock("@/features/quotes/actions", () => ({
  acceptSharedQuoteAction: vi.fn(),
  declineSharedQuoteAction: vi.fn(),
}));

const acceptSharedQuoteActionMock = vi.mocked(acceptSharedQuoteAction);
const declineSharedQuoteActionMock = vi.mocked(declineSharedQuoteAction);

function makeQuote(status: QuoteStatus = QuoteStatus.SENT, workOrderStatus?: WorkOrderStatus): SharedQuoteViewProps["quote"] {
  const quote: SharedQuoteViewProps["quote"] = {
    id: "quote-1",
    submissionKey: null,
    submissionHash: null,
    number: "COT-001",
    status,
    title: "Servicio general",
    description: "Servicio completo",
    administrative: false, deletedAt: null,
    subtotalCents: 100_00,
    discountCents: 0,
    taxCents: 16_00,
    totalCents: 116_00,
    taxEnabled: true,
    approvedAt: null,
    validUntil: new Date("2026-07-15T12:00:00.000Z"),
    customerId: "customer-1",
    vehicleId: null,
    vehicleSnapshot: null,
    operationalDate: new Date("2026-07-01T00:00:00.000Z"),
    createdAt: new Date("2026-07-01T12:00:00.000Z"),
    updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    customer: {
      id: "customer-1",
      name: "Cliente Demo",
      email: null,
      phone: null,
      address: null,
      notes: null,
      status: CustomerStatus.ACTIVE,
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
      updatedAt: new Date("2026-07-01T12:00:00.000Z"),
    },
    vehicle: null,
    items: [
      {
        id: "item-1",
        quoteId: "quote-1",
        sectionId: null,
        type: QuoteItemType.SERVICE,
        description: "Mano de obra",
        quantity: "1",
        unitPriceCents: 100_00,
        totalCents: 100_00,
        sortOrder: 0,
      },
    ],
    sections: [],
    workOrder: workOrderStatus ? { status: workOrderStatus } : null,
  };

  return quote;
}

function makeMultiSectionQuote(status: QuoteStatus = QuoteStatus.SENT): SharedQuoteViewProps["quote"] {
  return {
    ...makeQuote(status),
    items: [],
    sections: [
      {
        id: "sec-1",
        quoteId: "quote-1",
        name: "Aceite y filtros",
        sortOrder: 0,
        isAuthorized: false,
        items: [
          {
            id: "item-1",
            quoteId: "quote-1",
            sectionId: "sec-1",
            type: QuoteItemType.SERVICE,
            description: "Cambio de aceite",
            quantity: "1",
            unitPriceCents: 40_00,
            totalCents: 40_00,
            sortOrder: 0,
          },
        ],
      },
      {
        id: "sec-2",
        quoteId: "quote-1",
        name: "Frenos",
        sortOrder: 1,
        isAuthorized: false,
        items: [
          {
            id: "item-2",
            quoteId: "quote-1",
            sectionId: "sec-2",
            type: QuoteItemType.SERVICE,
            description: "Cambio de balatas",
            quantity: "1",
            unitPriceCents: 60_00,
            totalCents: 60_00,
            sortOrder: 0,
          },
        ],
      },
    ],
  };
}

function makePartiallyAuthorizedQuote(status: QuoteStatus = QuoteStatus.SENT): SharedQuoteViewProps["quote"] {
  const quote = makeMultiSectionQuote(status);

  return {
    ...quote,
    sections: quote.sections.map((section) => ({
      ...section,
      isAuthorized: section.id === "sec-1",
    })),
  };
}

function makeLegacyMultiSectionQuote(): SharedQuoteViewProps["quote"] {
  const quote = makeMultiSectionQuote();

  return {
    ...quote,
    sections: quote.sections.map((section) => {
      const legacySection: Omit<typeof section, "isAuthorized"> & { isAuthorized?: boolean } = { ...section };
      delete legacySection.isAuthorized;
      return legacySection;
    }),
  } as SharedQuoteViewProps["quote"];
}

describe("SharedQuoteView", () => {
  beforeEach(() => {
    acceptSharedQuoteActionMock.mockReset();
    declineSharedQuoteActionMock.mockReset();
  });

  it("renders whole-quote decision controls for sent shared quotes", () => {
    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    expect(screen.getByRole("heading", { name: "Cotización COT-001 — Servicio general" })).toBeInTheDocument();
    expect(screen.queryByText(/vista previa/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Enviada")).not.toBeInTheDocument();
    expect(screen.queryByText("SEBASAM")).not.toBeInTheDocument();
    expect(screen.queryByText(/Batalla de Casa Blanca/)).not.toBeInTheDocument();
    expect(screen.getByText("Mano de obra")).toBeInTheDocument();
    expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Declinar cotización" })).toBeInTheDocument();
    expect(screen.queryByText(/partida/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Progreso de la cotización" })).not.toBeInTheDocument();
  });

  it.each([
    [undefined, "Aceptada"],
    [WorkOrderStatus.ASSIGNED, "Orden asignada / En proceso"],
    [WorkOrderStatus.IN_PROGRESS, "Orden asignada / En proceso"],
    [WorkOrderStatus.COMPLETED, "Finalizada"],
  ])("derives approved progress from work order status %s", (workOrderStatus, currentStage) => {
    render(<SharedQuoteView quote={makeQuote(QuoteStatus.APPROVED, workOrderStatus)} token="token-123" />);
    const progress = screen.getByRole("list", { name: "Progreso de la cotización" });
    expect(within(progress).getByText(currentStage)).toHaveAttribute("aria-current", "step");
  });

  it("keeps final status as secondary feedback without decision controls", () => {
    render(<SharedQuoteView quote={makeQuote(QuoteStatus.APPROVED)} token="token-123" />);

    expect(screen.getByRole("heading", { name: "Cotización COT-001 — Servicio general" })).toBeInTheDocument();
    expect(screen.getAllByText(/Aceptada/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("shows all sections with authorization status after partial approval", () => {
    render(<SharedQuoteView quote={makePartiallyAuthorizedQuote(QuoteStatus.APPROVED)} token="token-123" />);

    expect(screen.getByText("Cambio de aceite")).toBeInTheDocument();
    const pendingItem = screen.getByText("Cambio de balatas").closest("tr");
    if (!pendingItem) throw new Error("Pending section item row was not rendered.");
    expect(pendingItem).toHaveClass("opacity-40");
    expect(screen.getByText("Autorizada")).toBeInTheDocument();
    expect(screen.getByText("Pendiente de autorización")).toBeInTheDocument();
    expect(screen.queryByTestId("section-toggle-sec-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("section-toggle-sec-2")).not.toBeInTheDocument();
  });

  it("accepts the full quote and shows the success state", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123", []);
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent("Cotización aceptada");
    expect(feedback).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("declines the full quote and shows the declined state", async () => {
    const user = userEvent.setup();
    declineSharedQuoteActionMock.mockResolvedValue({ success: true });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Declinar cotización" }));

    expect(declineSharedQuoteActionMock).toHaveBeenCalledWith("token-123");
    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent("Cotización declinada");
    expect(feedback).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Aceptar cotización" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Declinar cotización" })).not.toBeInTheDocument();
  });

  it("shows an error when the public decision action fails", async () => {
    const user = userEvent.setup();
    acceptSharedQuoteActionMock.mockResolvedValue({ success: false, error: "La cotización ya expiró." });

    render(<SharedQuoteView quote={makeQuote()} token="token-123" />);

    await user.click(screen.getByRole("button", { name: "Aceptar cotización" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("La cotización ya expiró.");
  });

  describe("partial authorization by sections", () => {
    it("selects only sections with persisted authorization", () => {
      render(<SharedQuoteView quote={makePartiallyAuthorizedQuote()} token="token-123" />);

      expect(screen.getByTestId("section-toggle-sec-1")).toBeChecked();
      expect(screen.getByTestId("section-toggle-sec-2")).not.toBeChecked();
      expect(screen.getByRole("button", { name: "Aceptar 1 sección" })).toBeInTheDocument();
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$46.40");
    });

    it("allows the customer to change the initially authorized selection", async () => {
      const user = userEvent.setup();
      render(<SharedQuoteView quote={makePartiallyAuthorizedQuote()} token="token-123" />);

      await user.click(screen.getByTestId("section-toggle-sec-2"));

      expect(screen.getByTestId("section-toggle-sec-2")).toBeChecked();
      expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    });

    it("disables accept when no section has persisted authorization", () => {
      render(<SharedQuoteView quote={makeMultiSectionQuote()} token="token-123" />);

      const accept = screen.getByRole("button", { name: "Seleccione al menos una sección" });
      expect(accept).toBeDisabled();
    });

    it("sends only initially authorized section ids when accepting", async () => {
      const user = userEvent.setup();
      acceptSharedQuoteActionMock.mockResolvedValue({ success: true });

      render(<SharedQuoteView quote={makePartiallyAuthorizedQuote()} token="token-123" />);

      await user.click(screen.getByRole("button", { name: "Aceptar 1 sección" }));

      expect(acceptSharedQuoteActionMock).toHaveBeenCalledWith("token-123", ["sec-1"]);
    });

    it("selects every section for legacy quotes without authorization state", () => {
      render(<SharedQuoteView quote={makeLegacyMultiSectionQuote()} token="token-123" />);

      expect(screen.getByTestId("section-toggle-sec-1")).toBeChecked();
      expect(screen.getByTestId("section-toggle-sec-2")).toBeChecked();
      expect(screen.getByRole("button", { name: "Aceptar cotización" })).toBeInTheDocument();
      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
    });

    it("renders complete totals and hides decision controls in isPrint mode", () => {
      render(<SharedQuoteView quote={makePartiallyAuthorizedQuote()} token="" isPrint={true} />);

      expect(screen.getByTestId("quote-total")).toHaveTextContent("$116.00");
      expect(screen.queryByRole("button", { name: /Aceptar/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Declinar/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId("section-toggle-sec-1")).not.toBeInTheDocument();
    });
  });
});
