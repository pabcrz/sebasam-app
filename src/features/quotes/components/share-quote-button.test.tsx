import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareQuoteButton } from "./share-quote-button";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("ShareQuoteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a tokenless draft, confirms success, and refreshes the row", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const action = vi.fn().mockResolvedValue({ success: true });
    writeText.mockResolvedValue(undefined);
    render(<ShareQuoteButton action={action} status="DRAFT" quoteNumber="C-001" />);

    const button = screen.getByRole("button", { name: /preparar y compartir cotización c-001/i });
    expect(button).toBeInTheDocument();

    await user.click(button);

    expect(action).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();
    expect(await screen.findByRole("status")).toHaveTextContent("Cotización preparada");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows the server validation error and does not refresh an incomplete draft", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({
      success: false,
      error: "Completa la descripción, cantidad y precio de todos los conceptos antes de compartir.",
    });
    render(<ShareQuoteButton action={action} status="DRAFT" quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /preparar y compartir/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Completa la descripción, cantidad y precio");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("copies a sent quote locally without invoking the action", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const action = vi.fn();
    writeText.mockResolvedValue(undefined);
    render(<ShareQuoteButton action={action} sharedQuote={{ token: "stable" }} status="SENT" quoteNumber="C-001" />);
    await user.click(screen.getByRole("button"));
    expect(action).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledTimes(1);
  });

  it("shows the URL for manual copy when clipboard rejects", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    writeText.mockRejectedValue(new Error("denied"));
    render(<ShareQuoteButton sharedQuote={{ token: "stable" }} status="SENT" quoteNumber="C-001" />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("/cotizacion/stable");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the URL for manual copy when Clipboard API is absent", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
    render(<ShareQuoteButton sharedQuote={{ token: "stable" }} status="SENT" quoteNumber="C-001" />);
    await user.click(screen.getByRole("button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("/cotizacion/stable");
  });
});
