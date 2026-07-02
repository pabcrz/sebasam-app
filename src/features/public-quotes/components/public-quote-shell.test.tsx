import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicQuoteShell } from "./public-quote-shell";

describe("PublicQuoteShell", () => {
  it("renders the workshop address as a Google Maps link", () => {
    render(<PublicQuoteShell>content</PublicQuoteShell>);

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/MYuGBKwabPGbea7y7");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
