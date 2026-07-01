import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("opens and displays the absolute share URL", async () => {
    const user = userEvent.setup();
    render(<ShareQuoteLinkDialog sharedQuote={createMockSharedQuote()} quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: /ver link de cotización c-001/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/cotizacion\/abc123/i)).toBeInTheDocument();
  });
});
