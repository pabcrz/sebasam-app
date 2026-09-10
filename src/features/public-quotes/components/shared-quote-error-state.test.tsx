import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SharedQuoteErrorState, type SharedQuoteErrorType } from "./shared-quote-error-state";

const errorCases: Array<{ type: SharedQuoteErrorType; title: string; message: string }> = [
  {
    type: "not-found",
    title: "Link inválido",
    message: "El link de cotización que abriste no existe o es incorrecto. Verifica la URL o contacta al taller.",
  },
  {
    type: "expired",
    title: "Link expirado",
    message: "Este link ha expirado. Solicita una nueva cotización si aún te interesa el servicio.",
  },
  {
    type: "revoked",
    title: "Cotización no disponible",
    message: "Esta cotización ya no está disponible. Contacta al taller para más información.",
  },
];

describe("SharedQuoteErrorState", () => {
  it("renders the public SEBASAM quote brand treatment", () => {
    render(<SharedQuoteErrorState type="not-found" />);

    const logo = screen.getByRole("img", { name: "Logo de SEBASAM" });

    expect(logo).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByRole("heading", { name: "SEBASAM" })).toBeInTheDocument();
    expect(screen.getByText("Servicio y Refacciones para Suspensiones de Aire y Muelles")).toHaveClass("font-mono", "print:text-[10px]");
  });

  it.each(errorCases)("renders the $type error message", ({ type, title, message }) => {
    render(<SharedQuoteErrorState type={type} />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
  });
});
