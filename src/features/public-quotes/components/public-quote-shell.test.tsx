import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicQuoteShell } from "./public-quote-shell";

describe("PublicQuoteShell", () => {
  it("renders configured branding and preserves print-safe logo treatment", () => {
    render(<PublicQuoteShell business={{ businessName: "Taller Norte" }} logoSrc="/taller-norte.png">content</PublicQuoteShell>);

    const logos = screen.getAllByRole("img", { name: "Logo de Taller Norte" });

    expect(logos).toHaveLength(1);
    expect(logos[0]).toHaveAttribute("src", expect.stringContaining("taller-norte.png"));
    expect(logos[0]).toHaveClass("print:h-10", "print:w-10", "print:invert");
    expect(screen.getByRole("heading", { name: "Taller Norte" })).toHaveClass("font-mono");
    expect(screen.getAllByText("Cotización").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render hardcoded branding when business settings are absent", () => {
    render(<PublicQuoteShell>content</PublicQuoteShell>);

    expect(screen.queryByRole("heading", { name: "SEBASAM" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/Batalla de Casa Blanca/i)).not.toBeInTheDocument();
  });

  it("renders the workshop address as a Google Maps link", () => {
    render(<PublicQuoteShell location={{ address: "Batalla de Casa Blanca", mapsUrl: "https://maps.example.test" }}>content</PublicQuoteShell>);

    const link = screen.getByRole("link", { name: /Batalla de Casa Blanca/i });
    expect(link).toHaveAttribute("href", "https://maps.example.test");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("gives public header links a high-contrast keyboard focus ring", () => {
     render(<PublicQuoteShell business={{ businessName: "Taller Norte" }} location={{ address: "Address", mapsUrl: "https://maps.example.test" }}>content</PublicQuoteShell>);

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
          business={{ businessName: "SEBASAM", phone: "5556007675", whatsapp: "5536239346" }}
          location={{ address: "Batalla de Casa Blanca" }}
        documentType="Cotización"
        documentNumber="C-0826-001"
        date={new Date("2026-06-18T00:00:00.000Z")}
        customerName="Cristian Del Toro"
        vehicleDescription="Freightliner - Sin placas"
      >
        content
      </PublicQuoteShell>,
    );

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
        <PublicQuoteShell business={{ businessName: "SEBASAM" }}
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
