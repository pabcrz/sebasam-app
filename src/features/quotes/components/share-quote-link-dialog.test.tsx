import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SharedQuote } from "@prisma/client";
import { ShareQuoteLinkDialog } from "./share-quote-link-dialog";

function createMockSharedQuote(overrides: Partial<SharedQuote> = {}): SharedQuote {
  return {
    id: "sq-1",
    token: "abc123",
    quoteId: "quote-1",
    expiresAt: new Date("2026-12-31T00:00:00.000Z"),
    revokedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("ShareQuoteLinkDialog", () => {
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

  it("opens and displays the absolute share URL", async () => {
    const user = userEvent.setup();
    render(<ShareQuoteLinkDialog sharedQuote={createMockSharedQuote()} quoteNumber="C-001" />);

    const shareButton = screen.getByRole("button", { name: /compartir cotización c-001/i });
    expect(shareButton.querySelector("svg")).toBeInTheDocument();
    await user.click(shareButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/cotizacion\/abc123/i)).toBeInTheDocument();
  });

  it("opens the URL in a new tab from the copy-and-open action", async () => {
    const user = userEvent.setup();
    render(<ShareQuoteLinkDialog sharedQuote={createMockSharedQuote()} quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /compartir cotización c-001/i }));
    await waitFor(() => {
      expect(screen.getByText("https://example.com/cotizacion/abc123")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /copiar y abrir link de c-001/i }));

    expect(windowOpenMock).toHaveBeenCalledWith(
      "https://example.com/cotizacion/abc123",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
