import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import toast from "react-hot-toast";
import { PrintActionButton } from "./print-action-button";
import * as printDocModule from "@/features/quotes/lib/print-document";

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("PrintActionButton", () => {
  it("renders with data-print-url and accessible attributes", () => {
    render(
      <PrintActionButton
        url="/admin/quotes/q-1/print"
        title="Imprimir cotización"
        aria-label="Imprimir cotización"
      >
        <span>Imprimir</span>
      </PrintActionButton>,
    );

    const button = screen.getByRole("button", { name: "Imprimir cotización" });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("data-print-url", "/admin/quotes/q-1/print");
    expect(button).not.toBeDisabled();
  });

  it("calls printDocumentUrl on click and manages loading lifecycle", async () => {
    const user = userEvent.setup();
    let resolvePrint: () => void = () => {};
    const printSpy = vi.spyOn(printDocModule, "printDocumentUrl").mockImplementation(
      () => new Promise((res) => { resolvePrint = res; }),
    );
    const onBefore = vi.fn();
    const onAfter = vi.fn();

    render(
      <PrintActionButton
        url="/admin/quotes/q-1/print"
        title="Imprimir cotización"
        aria-label="Imprimir cotización"
        onBeforePrint={onBefore}
        onAfterPrint={onAfter}
      >
        <svg data-testid="printer-icon" />
        <span>Imprimir</span>
      </PrintActionButton>,
    );

    const button = screen.getByRole("button", { name: "Imprimir cotización" });
    await user.click(button);

    expect(onBefore).toHaveBeenCalled();
    expect(printSpy).toHaveBeenCalledWith("/admin/quotes/q-1/print");
    expect(button).toBeDisabled();

    // Resolve print
    await act(async () => {
      resolvePrint();
    });
    await vi.waitFor(() => {
      expect(button).not.toBeDisabled();
    });

    expect(onAfter).toHaveBeenCalled();
  });

  it("shows toast on print failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    vi.spyOn(printDocModule, "printDocumentUrl").mockRejectedValue(new Error("Print error"));
    const onError = vi.fn();

    render(
      <PrintActionButton
        url="/admin/quotes/q-fail/print"
        aria-label="Imprimir cotización"
        onError={onError}
      >
        <span>Imprimir</span>
      </PrintActionButton>,
    );

    const button = screen.getByRole("button", { name: "Imprimir cotización" });
    await user.click(button);

    await vi.waitFor(() => {
      expect(onError).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("No se pudo abrir la vista de impresión");
    });
    expect(button).not.toBeDisabled();
  });

  it("handles consecutive print actions across cotización, trabajo and nota (flow A -> B -> A)", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.spyOn(printDocModule, "printDocumentUrl").mockImplementation(async (url: string) => {
      calls.push(url);
    });

    const { rerender } = render(
      <PrintActionButton
        url="/admin/quotes/quote-100/print"
        aria-label="Imprimir cotización"
      >
        <span>Imprimir Cotización</span>
      </PrintActionButton>,
    );

    // 1. Click Print Cotización (Doc A)
    const cotizacionBtn = screen.getByRole("button", { name: "Imprimir cotización" });
    await user.click(cotizacionBtn);
    expect(calls).toEqual(["/admin/quotes/quote-100/print"]);

    // 2. Navigate / render Trabajo (Doc B)
    rerender(
      <PrintActionButton
        url="/admin/work-orders/wo-200/print"
        aria-label="Imprimir trabajo"
      >
        <span>Imprimir Trabajo</span>
      </PrintActionButton>,
    );
    const trabajoBtn = screen.getByRole("button", { name: "Imprimir trabajo" });
    await user.click(trabajoBtn);
    expect(calls).toEqual([
      "/admin/quotes/quote-100/print",
      "/admin/work-orders/wo-200/print",
    ]);

    // 3. Navigate / render Nota
    rerender(
      <PrintActionButton
        url="/admin/notas/nota-300/print"
        aria-label="Imprimir nota"
      >
        <span>Imprimir Nota</span>
      </PrintActionButton>,
    );
    const notaBtn = screen.getByRole("button", { name: "Imprimir nota" });
    await user.click(notaBtn);
    expect(calls).toEqual([
      "/admin/quotes/quote-100/print",
      "/admin/work-orders/wo-200/print",
      "/admin/notas/nota-300/print",
    ]);

    // 4. Return to Cotización (Doc A again)
    rerender(
      <PrintActionButton
        url="/admin/quotes/quote-100/print"
        aria-label="Imprimir cotización"
      >
        <span>Imprimir Cotización</span>
      </PrintActionButton>,
    );
    const cotizacionBtnAgain = screen.getByRole("button", { name: "Imprimir cotización" });
    await user.click(cotizacionBtnAgain);
    expect(calls).toEqual([
      "/admin/quotes/quote-100/print",
      "/admin/work-orders/wo-200/print",
      "/admin/notas/nota-300/print",
      "/admin/quotes/quote-100/print",
    ]);
  });
});
