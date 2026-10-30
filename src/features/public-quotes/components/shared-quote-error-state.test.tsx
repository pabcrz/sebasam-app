import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SharedQuoteErrorState, type SharedQuoteErrorType } from "./shared-quote-error-state";

const errorCases: Array<{ type: SharedQuoteErrorType; title: string; message: string }> = [
  {
    type: "not-found",
    title: "Cotización no disponible",
    message: "La cotización que buscas no está disponible, consulta al taller",
  },
  {
    type: "expired",
    title: "Link expirado",
    message: "La cotización que buscas no está disponible, consulta al taller",
  },
  {
    type: "revoked",
    title: "Cotización no disponible",
    message: "La cotización que buscas no está disponible, consulta al taller",
  },
];

describe("SharedQuoteErrorState", () => {
  it("renders the public SEBASAM quote brand treatment", () => {
    render(<SharedQuoteErrorState type="not-found" />);

    const logo = screen.getByRole("img", { name: "Logo de SEBASAM" });

    expect(logo).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByRole("heading", { name: "SEBASAM" })).toBeInTheDocument();
    expect(screen.getByText("Servicio y Refacciones para Suspensiones de Aire y Muelles")).toHaveClass(
      "font-mono",
      "text-[10px]",
      "uppercase",
      "text-[var(--color-on-navy-tint)]",
    );
  });

  it.each(errorCases)("renders the $type error message", ({ type, title, message }) => {
    render(<SharedQuoteErrorState type={type} />);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByLabelText("404")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Logo de SEBASAM" })).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByRole("heading", { name: "SEBASAM" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver información y contacto" })).toHaveAttribute(
      "href",
      "https://sebasam.online/info",
    );
    expect(screen.queryByRole("link", { name: /inicio|home/i })).not.toBeInTheDocument();
  });
});
