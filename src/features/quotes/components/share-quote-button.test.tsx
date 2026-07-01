import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ShareQuoteButton } from "./share-quote-button";

describe("ShareQuoteButton", () => {
  it("renders a submit button and carries the quoteId in a hidden field", () => {
    render(<ShareQuoteButton action={vi.fn()} quoteId="quote-1" quoteNumber="C-001" />);

    expect(screen.getByRole("button", { name: /compartir cotización c-001/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue("quote-1")).toHaveAttribute("name", "quoteId");
    expect(screen.getByDisplayValue("quote-1")).toHaveAttribute("type", "hidden");
  });
});
