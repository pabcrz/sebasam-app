import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PrintControls, resolveReturnTo } from "./print-controls";

const searchParams = vi.fn(() => new URLSearchParams());
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams() }));

describe("resolveReturnTo", () => {
  it.each([
    ["/admin/quotes", "/admin/quotes"],
    ["/admin/notas", "/admin/notas"],
    ["/admin/work-orders", "/admin/work-orders"],
  ])("accepts %s", (raw, expected) => {
    expect(resolveReturnTo(raw)).toBe(expected);
  });

  it.each([null, "/admin/unknown", "https://evil.com", "../../../etc"])(
    "falls back for unsafe returnTo %s",
    (raw) => expect(resolveReturnTo(raw)).toBe("/admin/quotes"),
  );
});

describe("PrintControls", () => {
  it("renders floating accessible controls and prints without a backHref API", () => {
    searchParams.mockReturnValue(new URLSearchParams("returnTo=/admin/notas"));
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    render(<PrintControls backLabel="Volver a notas" />);

    const back = screen.getByRole("link", { name: /volver a notas/i });
    const printButton = screen.getByRole("button", { name: /imprimir/i });
    const overlay = back.parentElement;
    expect(back).toHaveAttribute("href", "/admin/notas");
    expect(overlay).toHaveClass("fixed", "print:hidden");
    expect(back).toHaveClass("min-h-11", "min-w-11");
    expect(printButton).toHaveClass("min-h-11", "min-w-11");
    expect(overlay).not.toHaveClass("border-b", "mb-6", "mt-4");

    fireEvent.click(printButton);
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it("uses the safe fallback for unknown browser query values", () => {
    searchParams.mockReturnValue(new URLSearchParams("returnTo=../../../etc"));
    render(<PrintControls />);

    expect(screen.getByRole("link", { name: /volver/i })).toHaveAttribute("href", "/admin/quotes");
  });
});
