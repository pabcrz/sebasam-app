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
    expect(screen.getByText("Cotización")).toBeInTheDocument();
  });

  it("renders the workshop address as a Google Maps link", () => {
    render(<PublicQuoteShell>content</PublicQuoteShell>);

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.app.goo.gl/MYuGBKwabPGbea7y7");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
