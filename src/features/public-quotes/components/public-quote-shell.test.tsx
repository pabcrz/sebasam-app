import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicQuoteShell } from "./public-quote-shell";

describe("PublicQuoteShell", () => {
  it("renders the logo beside one SEBASAM title without the small duplicate label", () => {
    render(<PublicQuoteShell>content</PublicQuoteShell>);

    const logos = screen.getAllByRole("img", { name: "Logo de SEBASAM" });

    expect(logos).toHaveLength(1);
    expect(logos[0]).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(
      screen.getByText("Servicio y Refacciones para Suspensiones de Aire y Muelles"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("SEBASAM")).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "SEBASAM" })).toHaveClass("font-mono");
    expect(screen.getByText("Cotización")).toBeInTheDocument();
  });

  it("renders the workshop address as a Google Maps link", () => {
    render(<PublicQuoteShell>content</PublicQuoteShell>);

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/MYuGBKwabPGbea7y7");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("gives public header links a high-contrast keyboard focus ring", () => {
    render(<PublicQuoteShell>content</PublicQuoteShell>);

    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveClass("focus-visible:ring-white", "focus-visible:ring-offset-2");
    }
  });

  it("formats a date-only operational date without shifting it to the prior day", () => {
    render(<PublicQuoteShell date={new Date("2026-07-01T00:00:00.000Z")}>content</PublicQuoteShell>);

    expect(screen.getByText(/1 de julio de 2026/i)).toBeInTheDocument();
  });
});
