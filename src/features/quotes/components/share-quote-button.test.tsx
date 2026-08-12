import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareQuoteButton } from "./share-quote-button";

describe("ShareQuoteButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes a draft before confirming clipboard success", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const action = vi.fn().mockResolvedValue({ success: true });
    writeText.mockResolvedValue(undefined);
    render(<ShareQuoteButton action={action} sharedQuote={{ token: "stable" }} status="DRAFT" quoteNumber="C-001" />);

    const button = screen.getByRole("button", { name: /compartir cotización c-001/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);

    expect(action).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/cotizacion/stable`);
    expect(await screen.findByRole("status")).toHaveTextContent("Link copiado");
    await user.click(screen.getByRole("button"));
    expect(action).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledTimes(2);
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
