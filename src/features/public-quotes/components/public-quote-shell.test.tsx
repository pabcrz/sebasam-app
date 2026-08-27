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
      screen.getAllByText("Servicio y Refacciones para Suspensiones de Aire y Muelles").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("SEBASAM").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Cotización").length).toBeGreaterThanOrEqual(1);
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

    expect(screen.getAllByText(/1 de julio de 2026/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders the header with complete client, vehicle, date, and document metadata", () => {
    const { container } = render(
      <PublicQuoteShell
        documentType="Cotización"
        documentNumber="C-0826-001"
        date={new Date("2026-06-18T00:00:00.000Z")}
        customerName="Cristian Del Toro"
        vehicleDescription="Freightliner - Sin placas"
      >
        content
      </PublicQuoteShell>,
    );

    expect(container).toHaveTextContent("Servicio y Refacciones para Suspensiones de Aire y Muelles");
    expect(container).toHaveTextContent("SEBASAM");
    expect(container).toHaveTextContent("5556007675");
    expect(container).toHaveTextContent("5536239346");
    expect(container).toHaveTextContent("Batalla de Casa Blanca");
    expect(container).toHaveTextContent("Cristian Del Toro");
    expect(container).toHaveTextContent("Freightliner - Sin placas");
    expect(container).toHaveTextContent("18 de junio de 2026");
    expect(container).toHaveTextContent("C-0826-001");
  });

  it("does not render bank accounts or CLABE in the public quote shell DOM", () => {
    const { container } = render(
      <PublicQuoteShell
        documentType="Cotización"
        documentNumber="C-0826-001"
        customerName="Cristian Del Toro"
        vehicleDescription="Freightliner - ABC-1234"
      >
        content
      </PublicQuoteShell>,
    );

    expect(container.textContent).not.toMatch(/CLABE/i);
    expect(container.textContent).not.toMatch(/Santander/i);
    expect(container.textContent).not.toMatch(/Mercado\s*Pago/i);
    expect(container.textContent).not.toMatch(/Cuenta\s*bancaria/i);
  });
});

