import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShareQuoteButton } from "./share-quote-button";

describe("ShareQuoteButton", () => {
  it("renders a button and calls action when clicked", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<ShareQuoteButton action={action} quoteId="quote-1" quoteNumber="C-001" />);

    const button = screen.getByRole("button", { name: /compartir cotización c-001/i });
    expect(button).toBeInTheDocument();
    
    await user.click(button);

    expect(action).toHaveBeenCalled();
    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("quoteId")).toBe("quote-1");
  });
});
