import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicBrandHeader } from "./public-brand-header";
describe("PublicBrandHeader", () => {
  it("renders v4 identity and caller logo with print classes", () => { render(<PublicBrandHeader identity={{ businessName: "Taller Norte", phone: "555123", whatsapp: "555456" }} logoSrc="/taller-norte.png" />); const logo = screen.getByAltText("Logo de Taller Norte"); expect(screen.getByRole("heading", { name: "Taller Norte" })).toBeInTheDocument(); expect(logo).toHaveAttribute("src", expect.stringContaining("taller-norte.png")); expect(logo).toHaveClass("print:h-10", "print:w-10", "print:invert"); expect(screen.getByRole("link", { name: /555123/ })).toHaveAttribute("href", "tel:555123"); expect(screen.getByRole("link", { name: /555456/ })).toHaveAttribute("href", "https://wa.me/52555456"); });
  it("renders nothing for missing identity and logo", () => { render(<PublicBrandHeader identity={{}} />); expect(screen.queryByRole("heading")).not.toBeInTheDocument(); expect(screen.queryByRole("img")).not.toBeInTheDocument(); });
  it("omits the logo when no caller source is supplied", () => { render(<PublicBrandHeader identity={{ businessName: "Taller Norte" }} />); expect(screen.queryByRole("img")).not.toBeInTheDocument(); });
});
