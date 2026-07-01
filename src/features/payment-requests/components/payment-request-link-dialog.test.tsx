import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PaymentRequest } from "@prisma/client";
import { PaymentRequestLinkDialog } from "./payment-request-link-dialog";

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
    render(<PaymentRequestLinkDialog action={action} quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /generar link/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByText("https://example.com/datos-de-pago/abc123token")).toBeInTheDocument();
  });

  it("copies the absolute URL to the clipboard", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(createMockPaymentRequest());
    render(<PaymentRequestLinkDialog action={action} quoteNumber="Q-001" />);

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
    render(<PaymentRequestLinkDialog action={action} quoteNumber="Q-001" />);

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
    render(<PaymentRequestLinkDialog action={action} quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /generar link/i }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alert")).toHaveTextContent("La cotización no existe.");
  });

  it("prevents double submission while loading", async () => {
    const user = userEvent.setup();
    const action = vi.fn(() => new Promise<PaymentRequest>(() => {}));
    render(<PaymentRequestLinkDialog action={action} quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    const generateButton = screen.getByRole("button", { name: /generar link/i });

    await user.click(generateButton);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(generateButton).toBeDisabled());
  });

  it("closes the dialog without calling the action when cancelled", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<PaymentRequestLinkDialog action={action} quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it("renders the dialog with the expected width constraint", async () => {
    const user = userEvent.setup();
    render(<PaymentRequestLinkDialog action={vi.fn()} quoteNumber="Q-001" />);

    await user.click(screen.getByRole("button", { name: /link de pago/i }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-w-2xl");
  });
});
