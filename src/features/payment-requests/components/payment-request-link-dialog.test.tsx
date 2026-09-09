import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaymentRequest } from "@prisma/client";
import {
  PaymentRequestLinkDialog,
  type PaymentRequestDialogContext,
} from "./payment-request-link-dialog";

function createMockPaymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: "pr-123",
    token: "abc123token",
    status: "PENDING",
    customerId: "cust-123",
    quoteId: "quote-123",
    workOrderId: null,
    requiresInvoice: false,
    customerFiscalProfileId: null,
    fiscalSnapshot: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    viewedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as PaymentRequest;
}

function createDialogContext(overrides: Partial<PaymentRequestDialogContext> = {}): PaymentRequestDialogContext {
  return {
    quoteNumber: "Q-001",
    title: "Servicio general",
    customerName: "Constructora del Norte",
    vehicleDescription: "Ford Transit 2024 · ABC123",
    workOrderNumber: "T-001",
    subtotalCents: 10000,
    taxCents: 1600,
    totalCents: 11600,
    requiresInvoice: true,
    paymentRequestStatus: "FISCAL_DATA_REQUIRED",
    fiscalProfile: null,
    fiscalActionHref: "/admin/customers/cust-123",
    bankAccount: {
      accountHolder: "Federico Cruz",
      bankName: "Santander",
      accountNumber: "123456",
      clabe: "4444 4444 4444 4444",
    },
    ...overrides,
  };
}

describe("PaymentRequestLinkDialog", () => {
  let windowOpenMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    windowOpenMock = vi.fn();

    Object.defineProperty(window, "location", {
      value: { origin: "https://example.com" },
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "open", {
      value: windowOpenMock,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens the dialog and generates a payment link", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(createMockPaymentRequest());
    render(<PaymentRequestLinkDialog action={action} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /generar link/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByText("https://example.com/datos-de-pago/abc123token")).toBeInTheDocument();
  });

  it("copies the absolute URL to the clipboard", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(createMockPaymentRequest());
    render(<PaymentRequestLinkDialog action={action} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /generar link/i }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));

    const copyButton = screen.getByRole("button", { name: /copiar link/i });
    await user.click(copyButton);

    expect(screen.getByRole("button", { name: /copiado/i })).toBeInTheDocument();
  });

  it("opens the URL in a new tab from the copy-and-open action", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(createMockPaymentRequest());
    render(<PaymentRequestLinkDialog action={action} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /generar link/i }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      expect(screen.getByText("https://example.com/datos-de-pago/abc123token")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /copiar y abrir link de q-001/i }));

    expect(windowOpenMock).toHaveBeenCalledWith(
      "https://example.com/datos-de-pago/abc123token",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("displays an error when the action fails", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("La cotización no existe."));
    render(<PaymentRequestLinkDialog action={action} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /generar link/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alert")).toHaveTextContent("La cotización no existe.");
  });

  it("prevents double submission while loading", async () => {
    const user = userEvent.setup();
    const action = vi.fn(() => new Promise<PaymentRequest>(() => {}));
    render(<PaymentRequestLinkDialog action={action} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    const generateButton = screen.getByRole("button", { name: /generar link/i });

    await user.click(generateButton);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(generateButton).toBeDisabled());
  });

  it("closes the dialog without calling the action when cancelled", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<PaymentRequestLinkDialog action={action} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it("renders fixed mobile chrome and returns focus after closing", async () => {
    const user = userEvent.setup();
    render(<PaymentRequestLinkDialog action={vi.fn()} context={createDialogContext()} />);

    const trigger = screen.getByRole("button", { name: /link de pago/i });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toMatch(/(?:^|\s)w-\[calc\(100vw(?:-|_-_)2rem\)\](?:\s|$)/);
    expect(dialog).toHaveClass("max-w-2xl");
    expect(dialog).toHaveClass("overflow-hidden");
    expect(dialog.querySelector("[class*='overflow-y-auto']")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar link de pago" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("renders quote, fiscal, and bank context before generating the link", async () => {
    const user = userEvent.setup();
    render(<PaymentRequestLinkDialog action={vi.fn()} context={createDialogContext()} />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));

    expect(screen.getByText("Cotización Q-001")).toBeInTheDocument();
    expect(screen.getByText("Constructora del Norte")).toBeInTheDocument();
    expect(screen.getByText("Ford Transit 2024 · ABC123")).toBeInTheDocument();
    expect(screen.getByText("$116.00")).toBeInTheDocument();
    expect(screen.getByText("Factura requerida")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /revisar cliente/i })).toHaveAttribute(
      "href",
      "/admin/customers/cust-123",
    );
    expect(screen.getByText("Santander")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar clabe al portapapeles/i })).toBeInTheDocument();
  });

  it("shows the saved fiscal profile instead of the review action", async () => {
    const user = userEvent.setup();
    render(
      <PaymentRequestLinkDialog
        action={vi.fn()}
        context={createDialogContext({
          fiscalProfile: { businessName: "Constructora del Norte SA", taxId: "CNO010101AA1" },
          paymentRequestStatus: "READY_TO_PAY",
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /link de pago/i }));

    expect(screen.getByText(/Constructora del Norte SA · RFC CNO010101AA1/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /revisar cliente/i })).not.toBeInTheDocument();
  });
});
