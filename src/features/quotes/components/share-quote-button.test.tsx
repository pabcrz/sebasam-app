import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import toast from "react-hot-toast";
import { ShareQuoteButton } from "./share-quote-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("ShareQuoteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates or reuses a shared link, copies it, confirms success, and refreshes the row", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const toastSuccess = vi.spyOn(toast, "success");
    const action = vi.fn().mockResolvedValue({ success: true, token: "new-token" });
    writeText.mockResolvedValue(undefined);
    render(<ShareQuoteButton action={action} quoteNumber="C-001" />);

    const button = screen.getByRole("button", { name: /compartir cotización c-001/i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(action).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/cotizacion/new-token"));
    expect(toastSuccess).toHaveBeenCalledWith("Enlace copiado al portapapeles.", { id: "quote-share-copied" });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the server error and does not refresh", async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, "error");
    const action = vi.fn().mockResolvedValue({
      success: false,
      error: "Completa la descripción, cantidad y precio de todos los conceptos antes de compartir.",
    });
    render(<ShareQuoteButton action={action} quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /compartir/i }));

    expect(toastError).toHaveBeenCalledWith(
      "Completa la descripción, cantidad y precio de todos los conceptos antes de compartir.",
      { id: "quote-share-error" }
    );
    expect(refresh).not.toHaveBeenCalled();
  });

  it("uses the action for a quote that already has a shared link", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const toastSuccess = vi.spyOn(toast, "success");
    const action = vi.fn().mockResolvedValue({ success: true, token: "stable" });
    writeText.mockResolvedValue(undefined);
    render(<ShareQuoteButton action={action} quoteNumber="C-001" />);
    const button = screen.getByRole("button", { name: /compartir cotización c-001/i });

    expect(button).toHaveTextContent("Compartir");
    expect(button).not.toHaveTextContent("Link copiado");

    await user.click(button);

    expect(action).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(toastSuccess).toHaveBeenCalledWith("Enlace copiado al portapapeles.", { id: "quote-share-copied" });
    expect(button).toHaveTextContent("Compartir");
    expect(button).not.toHaveTextContent("Link copiado");
  });

  it("shows error toast with URL for manual copy when clipboard rejects", async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, "error");
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    writeText.mockRejectedValue(new Error("denied"));
    render(<ShareQuoteButton action={vi.fn().mockResolvedValue({ success: true, token: "stable" })} quoteNumber="C-001" />);
    await user.click(screen.getByRole("button"));
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining("/cotizacion/stable"),
      expect.objectContaining({ id: "quote-share-error" })
    );
  });

  it("shows error toast with URL for manual copy when Clipboard API is absent", async () => {
    const user = userEvent.setup();
    const toastError = vi.spyOn(toast, "error");
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    render(<ShareQuoteButton action={vi.fn().mockResolvedValue({ success: true, token: "stable" })} quoteNumber="C-001" />);
    await user.click(screen.getByRole("button"));
    expect(toastError).toHaveBeenCalledWith(
      expect.stringContaining("/cotizacion/stable"),
      expect.objectContaining({ id: "quote-share-error" })
    );
  });
});
