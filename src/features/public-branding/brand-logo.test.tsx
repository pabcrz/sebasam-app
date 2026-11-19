import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrandLogo } from "./brand-logo";

describe("BrandLogo", () => {
  it("shows the white mark on screen and the navy mark on paper for the default logo", () => {
    const { container } = render(<BrandLogo src="/logo-white-short.png" alt="Logo de SEBASAM" size={52} />);
    expect(screen.getByAltText("Logo de SEBASAM")).toHaveClass("print:hidden");
    const paper = container.querySelector('img[src*="logo-ink-short"]');
    expect(paper).toHaveClass("hidden", "print:block");
    expect(paper).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the invert fallback for a custom logo and renders a single image", () => {
    const { container } = render(<BrandLogo src="/taller-norte.png" alt="Logo" size={52} />);
    expect(screen.getByAltText("Logo")).toHaveClass("print:invert");
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
