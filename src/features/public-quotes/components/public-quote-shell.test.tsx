import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PublicQuoteShell } from "./public-quote-shell";

describe("PublicQuoteShell", () => {
  it("anchors totals at bottom of page in print using calibrated printable height", () => {
    const { container } = render(<PublicQuoteShell>content</PublicQuoteShell>);

    expect(container.firstElementChild).toHaveClass("min-h-screen");
    expect(container.firstElementChild).toHaveClass("print:min-h-[255mm]", "print:py-0");
    expect(container.firstElementChild).toHaveClass("print:px-[14mm]");
    expect(container.firstElementChild).toHaveClass("print:py-0");
  });

  it("renders the approved quote brand treatment and subtitle", () => {
    render(<PublicQuoteShell business={{ businessName: "Taller Norte", fullName: "Servicio Norte" }} logoSrc="/taller-norte.png">content</PublicQuoteShell>);

    const logos = screen.getAllByRole("img", { name: "Logo de Taller Norte" });

    expect(logos).toHaveLength(1);
    expect(logos[0]).toHaveAttribute("src", expect.stringContaining("taller-norte.png"));
    expect(logos[0]).toHaveClass("h-13", "print:h-10", "print:w-10", "print:invert");
    expect(screen.getByRole("heading", { name: "Taller Norte" })).toHaveClass("print:text-2xl", "print:text-black");
    expect(screen.getByText("Servicio Norte")).toHaveClass("font-mono", "print:text-[10px]");
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

  it("renders an address without a map URL as text instead of an invalid link", () => {
    render(<PublicQuoteShell location={{ address: "Batalla de Casa Blanca", mapsUrl: "not a URL" }}>content</PublicQuoteShell>);

    expect(screen.getByText("Batalla de Casa Blanca")).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: /Batalla de Casa Blanca/i })).not.toBeInTheDocument();
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

  it("renders client, date, and document metadata without legacy vehicle descriptions", () => {
    const { container } = render(
        <PublicQuoteShell
          business={{ businessName: "SEBASAM", fullName: "Servicio y Refacciones para Suspensiones de Aire y Muelles", phone: "5556007675", whatsapp: "5536239346" }}
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
    expect(container).toHaveTextContent("Servicio y Refacciones para Suspensiones de Aire y Muelles");
    expect(container).toHaveTextContent("5556007675");
    expect(container).toHaveTextContent("5536239346");
    expect(container).toHaveTextContent("Batalla de Casa Blanca");
    expect(container).toHaveTextContent("Cristian Del Toro");
    expect(container).not.toHaveTextContent("Freightliner - Sin placas");
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

  it.each([
    [{}, []],
    [{ plate: "ABC-123" }, ["Placas ABC-123"]],
    [{ plate: "ABC-123", economicNumber: "ECO-7" }, ["Placas ABC-123", "Eco ECO-7"]],
    [{ plate: "ABC-123", economicNumber: "ECO-7", operatorName: "Luis Pérez" }, ["Placas ABC-123", "Eco ECO-7", "Chofer Luis Pérez"]],
  ])("renders only the %s unit values", (unitData, expectedValues) => {
    const { container } = render(
      <PublicQuoteShell business={{ businessName: "SEBASAM" }} documentType="Nota" documentNumber="N-001" customerName="Cliente" unitData={unitData}>
        content
      </PublicQuoteShell>,
    );

    for (const value of expectedValues) expect(container).toHaveTextContent(value);
    for (const value of ["Placas", "Eco", "Chofer"]) {
      if (!expectedValues.some((expected) => expected.startsWith(`${value} `))) expect(container).not.toHaveTextContent(value);
    }
  });

  it("renders flat unit metadata without chip treatment", () => {
    const { container } = render(
      <PublicQuoteShell business={{ businessName: "SEBASAM" }} customerName="Cliente" unitData={{ plate: "ABC-123" }}>
        content
      </PublicQuoteShell>,
    );

    expect(container.querySelector("header > div > div > div > div:first-child")?.className).toContain("print:flex-[11_1_0%]");
    expect(container.querySelector('[aria-label="Datos de unidad"]')).toHaveClass("border-t");
    expect(screen.getByText("ABC-123").closest("span")).not.toHaveClass("rounded-[6px]", "bg-white/10", "print:bg-gray-50");
    expect(container.querySelector('[aria-label="Datos de unidad"]')?.textContent).not.toContain(" · ");
    expect(container.querySelector("header > div:first-child")?.className).toContain("rgba(255,255,255,0.03)");
  });

  it("keeps the same compact card anatomy at every viewport", () => {
    const { container } = render(
      <PublicQuoteShell
        customerName="A customer with a deliberately long readable name"
        documentType="Cotización"
        documentNumber="A-2026-09-09-THIS-IS-A-LONG-FOLIO"
        date={new Date("2026-09-09T00:00:00.000Z")}
        unitData={{ plate: "55-AA-1B", economicNumber: "ECO-7" }}
      >
        content
      </PublicQuoteShell>,
    );

    const folioCard = container.querySelector("header > div > div > div > div:nth-child(2)");
    const contentGrid = folioCard?.firstElementChild;
    const customerColumn = contentGrid?.firstElementChild;
    const folioColumn = contentGrid?.lastElementChild;

    expect(contentGrid).toHaveClass("grid-cols-[minmax(0,1fr)_minmax(0,auto)]");
    expect(customerColumn).toHaveClass("min-w-0", "flex-1", "break-words");
    expect(folioColumn).toHaveClass("min-w-0", "shrink-0", "max-w-full");
    expect(screen.getByText("9 de septiembre de 2026")).toBeInTheDocument();
    expect(container.querySelector('[aria-label="Datos de unidad"]')).toHaveTextContent("9 de septiembre de 2026");
    expect(folioColumn).toHaveTextContent("A-2026-09-09-THIS-IS-A-LONG-FOLIO");
  });

  it("keeps the compact card anatomy in print", () => {
    const { container } = render(<PublicQuoteShell customerName="Cliente" documentNumber="C-001">content</PublicQuoteShell>);

    const folioCard = container.querySelector("header > div > div > div > div:nth-child(2)");
    const contentGrid = folioCard?.firstElementChild;

    expect(contentGrid).toHaveClass("grid-cols-[minmax(0,1fr)_minmax(0,auto)]");
  });

  it("hides the verbose customer subtitle on mobile while preserving it on desktop", () => {
    render(<PublicQuoteShell customerName="Cliente" customerSubtitle="Identidad secundaria">content</PublicQuoteShell>);

    expect(screen.getByText("Identidad secundaria")).toHaveClass("hidden", "sm:block");
  });

  it("keeps only separator-free special document labels", () => {
    const { container } = render(
      <PublicQuoteShell documentType="Nota" unitDescription="Taller" vehicleDescription="Freightliner - ECO-7 · ABC-123">
        content
      </PublicQuoteShell>,
    );

    expect(container).toHaveTextContent("Taller");
    expect(container).not.toHaveTextContent("Freightliner");
  });
});
