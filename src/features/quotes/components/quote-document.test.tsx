import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuoteDocument } from "./quote-document";
import type { QuoteDocumentViewModel } from "../lib/quote-document";

const document: QuoteDocumentViewModel = {
  business: { name: "SEBASAM", legalName: "Servicio Básico", address: "Iztapalapa, CDMX" },
  folio: "C-143",
  issuedAt: new Date("2026-07-15T12:00:00Z"),
  validUntil: new Date("2026-07-30T12:00:00Z"),
  customer: { name: "Transportes Norte" },
  unit: { brand: "Kenworth", model: "T680", year: "2024", plate: "ABC-123" },
  title: "Reparación de suspensión",
  description: "Diagnóstico y reparación",
  concepts: [{ type: "LABOR", description: "Instalación", quantity: 2, unitAmountCents: 12550, amountCents: 25100 }],
  subtotalCents: 25100,
  taxCents: 4016,
  totalCents: 29116,
  conditions: ["Precios sujetos a disponibilidad."],
};

describe("QuoteDocument", () => {
  it("renders a semantic quote document with concepts, totals, validity and conditions", () => {
    render(<QuoteDocument document={document} />);

    const article = screen.getByRole("article", { name: "Reparación de suspensión" });
    expect(within(article).getByText("C-143")).toBeInTheDocument();
    expect(within(article).getByRole("table", { name: /conceptos de la cotización/i })).toBeInTheDocument();
    expect(within(article).getByText("Mano de obra · Cant. 2")).toBeInTheDocument();
    expect(within(article).getByText("$291.16")).toBeInTheDocument();
    expect(within(article).getByText(/30 de julio de 2026/i)).toBeInTheDocument();
    expect(within(article).getByRole("heading", { name: "Condiciones" })).toBeInTheDocument();
    expect(within(article).queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses unique accessible relationships for multiple instances", () => {
    render(<><QuoteDocument document={document} /><QuoteDocument document={{ ...document, folio: "C-144" }} /></>);

    const articles = screen.getAllByRole("article", { name: "Reparación de suspensión" });
    const labelledBy = articles.map((article) => article.getAttribute("aria-labelledby"));

    expect(new Set(labelledBy).size).toBe(2);
    for (const article of articles) {
      const titleId = article.getAttribute("aria-labelledby");
      expect(titleId).toBeTruthy();
      expect(within(article).getByRole("heading", { name: "Reparación de suspensión" })).toHaveAttribute("id", titleId);
    }
  });
});
