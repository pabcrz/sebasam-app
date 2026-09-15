import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CashPaymentDialog } from "./cash-payment-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const validPngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function renderDialog(action = vi.fn()) {
  return render(
    <CashPaymentDialog
      action={action}
      quoteNumber="C-001"
      totalCents={10000}
      paidCents={2500}
      remainingCents={7500}
    />,
  );
}

describe("CashPaymentDialog", () => {
  it("renders triggerOnly without wrapper section and allows PaymentBalanceSummary independently", () => {
    const { container } = render(
      <CashPaymentDialog
        action={vi.fn()}
        quoteNumber="C-001"
        totalCents={10000}
        paidCents={2500}
        remainingCents={7500}
        triggerOnly
      />,
    );

    expect(container.querySelector("section")).toBeNull();
    expect(screen.getByRole("button", { name: /registrar pago para c-001/i })).toBeInTheDocument();
  });

  it("refreshes membership once after success but not after failure", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValueOnce(new Error("Falló")).mockResolvedValueOnce({ payment: { amountCents: 7500 }, paidCents: 10000, remainingCents: 0 });
    renderDialog(action);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await screen.findByRole("alert");
    expect(refresh).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });
  it("shows the quote total, paid amount, and remaining balance", () => {
    renderDialog();

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("offers one receipt sharing action after a successful Nota payment", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      payment: { amountCents: 2500 },
      paidCents: 5000,
      remainingCents: 5000,
    });

    render(
      <CashPaymentDialog
        action={action}
        quoteNumber="N-001"
        documentTitle="Cambio de muelles"
        documentFolio="N-090926-01"
        receiptEnabled
        totalCents={10000}
        paidCents={2500}
        remainingCents={7500}
      />,
    );

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByText("Recibo listo para compartir")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compartir recibo" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
  });

  it("shares the PNG file and complete receipt message through the native share sheet", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "",
      fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, "canShare", { configurable: true, value: canShare });

    const action = vi.fn().mockResolvedValue({ payment: { amountCents: 2500 }, paidCents: 5000, remainingCents: 5000 });
    render(<CashPaymentDialog action={action} quoteNumber="N-001" documentTitle="Cambio de muelles" documentFolio="N-090926-01" receiptEnabled totalCents={10000} paidCents={2500} remainingCents={7500} />);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.click(await screen.findByRole("button", { name: "Compartir recibo" }));

    expect(share).toHaveBeenCalledWith(expect.objectContaining({
      title: "Recibo N-090926-01",
      text: expect.stringContaining("Pagado acumulado: $50.00"),
      files: [expect.objectContaining({ name: "N-090926-01-recibo.png", type: "image/png" })],
    }));
    expect(canShare).toHaveBeenCalledWith(share.mock.calls[0][0]);
  });

  it("downloads, copies the message, and opens WhatsApp Web when file sharing is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "",
      fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:receipt");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    const action = vi.fn().mockResolvedValue({ payment: { amountCents: 2500 }, paidCents: 5000, remainingCents: 5000 });
    render(<CashPaymentDialog action={action} quoteNumber="N-001" documentTitle="Cambio de muelles" documentFolio="N-090926-01" receiptEnabled totalCents={10000} paidCents={2500} remainingCents={7500} />);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.click(await screen.findByRole("button", { name: "Compartir recibo" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Saldo restante: $50.00")));
    expect(open).toHaveBeenCalledWith("https://web.whatsapp.com/", "_blank", "noopener,noreferrer");
    expect(screen.getByText(/mensaje copiado.*ventana emergente/i)).toBeInTheDocument();
  });

  it("falls back when native sharing rejects for a reason other than cancellation", async () => {
    const user = userEvent.setup();
    const share = vi.fn().mockRejectedValue(new Error("Share failed"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "", fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn().mockReturnValue(true) });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:receipt");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<CashPaymentDialog action={vi.fn().mockResolvedValue({ payment: { amountCents: 2500 }, paidCents: 5000, remainingCents: 5000 })} quoteNumber="N-001" receiptEnabled totalCents={10000} paidCents={2500} remainingCents={7500} />);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.click(await screen.findByRole("button", { name: "Compartir recibo" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText(/mensaje copiado/)).toBeInTheDocument();
    expect(share).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["missing", undefined],
    ["throwing", vi.fn().mockImplementation(() => { throw new Error("Unsupported"); })],
  ])("uses the manual path when canShare is %s", async (_label, canShare) => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "", fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn() });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: canShare });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:receipt");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    render(<CashPaymentDialog action={vi.fn().mockResolvedValue({ payment: { amountCents: 2500 }, paidCents: 5000, remainingCents: 5000 })} quoteNumber="N-001" receiptEnabled totalCents={10000} paidCents={2500} remainingCents={7500} />);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.click(await screen.findByRole("button", { name: "Compartir recibo" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(screen.getByText(/mensaje copiado/)).toBeInTheDocument();
  });

  it("revokes the object URL even when the download click throws", async () => {
    const user = userEvent.setup();
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const schedule = vi.spyOn(window, "setTimeout");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "", fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:receipt");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => { throw new Error("Download failed"); });

    render(<CashPaymentDialog action={vi.fn().mockResolvedValue({ payment: { amountCents: 2500 }, paidCents: 5000, remainingCents: 5000 })} quoteNumber="N-001" receiptEnabled totalCents={10000} paidCents={2500} remainingCents={7500} />);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.click(await screen.findByRole("button", { name: "Compartir recibo" }));

    await waitFor(() => expect(schedule).toHaveBeenCalledWith(expect.any(Function), 0));
    const cleanup = schedule.mock.calls.at(-1)?.[0];
    if (typeof cleanup === "function") cleanup();
    expect(revoke).toHaveBeenCalledWith("blob:receipt");
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo descargar");
  });

  it("treats native share cancellation as normal status", async () => {
    const user = userEvent.setup();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "", fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn().mockRejectedValue(new DOMException("Canceled", "AbortError")) });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: vi.fn().mockReturnValue(true) });
    const action = vi.fn().mockResolvedValue({ payment: { amountCents: 2500 }, paidCents: 5000, remainingCents: 5000 });
    render(<CashPaymentDialog action={action} quoteNumber="N-001" receiptEnabled totalCents={10000} paidCents={2500} remainingCents={7500} />);
    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await user.click(await screen.findByRole("button", { name: "Compartir recibo" }));
    expect(await screen.findByText("Compartir cancelado.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("provides a fixed mobile header close control and restores trigger focus", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByRole("button", { name: /registrar pago para/i });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("overflow-hidden");
    expect(dialog.querySelector("[class*='overflow-y-auto']")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar registro de pago" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("blocks an overpayment immediately and accepts a corrected partial amount", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      payment: { amountCents: 1250 },
      paidCents: 3750,
      remainingCents: 6250,
    });
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    const amount = screen.getByRole("textbox", { name: /monto recibido/i });
    const errorSlot = document.getElementById("cash-amount-error-C-001");
    expect(amount).toHaveValue("75.00");
    expect(errorSlot).toBeEmptyDOMElement();
    expect(errorSlot).toHaveClass("min-h-4", "text-xs");
    expect(errorSlot).not.toHaveAttribute("role");
    await user.clear(amount);
    await user.type(amount, "75.01");
    expect(screen.getByRole("alert")).toHaveTextContent("El pago no puede exceder el saldo pendiente.");
    expect(errorSlot).toHaveAttribute("role", "alert");
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(amount).toHaveAttribute("aria-describedby", expect.stringContaining("cash-amount-error-C-001"));
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    expect(action).not.toHaveBeenCalled();

    await user.clear(amount);
    await user.type(amount, "12.50");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(errorSlot).toBeEmptyDOMElement();
    expect(errorSlot).not.toHaveAttribute("role");
    expect(amount).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(action).toHaveBeenCalledWith("12.50", expect.any(String), expect.any(String)));
    expect(screen.getByRole("status")).toHaveTextContent("$12.50");
    expect(screen.getAllByText("$62.50")).toHaveLength(2);
  });

  it("rejects invalid formatting and non-positive values before submit", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    const amount = screen.getByRole("textbox", { name: /monto recibido/i });
    await user.clear(amount);
    await user.type(amount, "0");
    expect(screen.getByRole("alert")).toHaveTextContent("El pago debe ser mayor que cero.");
    expect(screen.getByRole("button", { name: "Registrar pago" })).toBeDisabled();

    await user.clear(amount);
    await user.type(amount, "12.345");
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa un monto válido con hasta dos decimales.");
    expect(action).not.toHaveBeenCalled();
  });

  it("shows an action error and keeps the dialog open", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("El pago no puede exceder el saldo pendiente."));
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("El pago no puede exceder el saldo pendiente.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("reuses its operation key when an ambiguous action failure is retried", async () => {
    const user = userEvent.setup();
    const action = vi.fn()
      .mockRejectedValueOnce(new Error("No se pudo confirmar el pago."))
      .mockResolvedValueOnce({
        payment: { amountCents: 7500 },
        paidCents: 10000,
        remainingCents: 0,
      });
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    // Same operationKey (index 1) on retry
    expect(action.mock.calls[1][1]).toBe(action.mock.calls[0][1]);
  });

  it("starts a new operation only after a successful payment", async () => {
    const user = userEvent.setup();
    const action = vi.fn()
      .mockResolvedValueOnce({
        payment: { amountCents: 1250 },
        paidCents: 3750,
        remainingCents: 6250,
      })
      .mockResolvedValueOnce({
        payment: { amountCents: 6250 },
        paidCents: 10000,
        remainingCents: 0,
      });
    renderDialog(action);

    await user.click(screen.getByRole("button", { name: /registrar pago para/i }));
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));
    await screen.findByRole("status");
    await user.click(screen.getByRole("button", { name: "Registrar pago" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(2));
    // New operationKey (index 1) after success
    expect(action.mock.calls[1][1]).not.toBe(action.mock.calls[0][1]);
  });
});
