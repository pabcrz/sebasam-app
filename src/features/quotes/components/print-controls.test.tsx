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
    ["/admin/notas?mode=week&anchor=2026-08-12&payment=pending&assignee=all", "/admin/notas?mode=week&anchor=2026-08-12&payment=pending&assignee=all&kind=all"],
    ["/admin/notas?mode=month&anchor=2026-08&payment=paid&assignee=A0B1C2D3-1234-4ABC-8DEF-1234567890AB&page=2", "/admin/notas?mode=month&anchor=2026-08&payment=paid&assignee=a0b1c2d3-1234-4abc-8def-1234567890ab&kind=all&page=2"],
  ])("accepts %s", (raw, expected) => {
    expect(resolveReturnTo(raw)).toBe(expected);
  });

  it.each([
    null,
    "/admin/unknown",
    "https://evil.com",
    "//evil.com/admin/notas",
    "../../../etc",
    "/admin/foo/../notas?mode=week&anchor=2026-08-12&payment=all&assignee=all",
    "/admin%2Fnotas?mode=week&anchor=2026-08-12&payment=all&assignee=all",
    "/admin/notas?mode=week&anchor=2026-02-30&payment=all&assignee=all",
    "/admin/notas?mode=month&anchor=2026-08-12&payment=all&assignee=all",
    "/admin/notas?mode=week&anchor=2026-08-12&payment=all&assignee=all&mode=month",
    "/admin/notas?mode=week&anchor=2026-08-12&payment=all&assignee=all&unexpected=value",
    "/admin/notas?mode=week&anchor=2026-08-12&payment=all&assignee=all&page=9007199254740992",
    "/admin/notas?mode=week&anchor=2026-08-12&payment=all&assignee=all#section",
  ])(
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
    expect(overlay).toHaveClass(
      "fixed",
      "bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)]",
      "left-1/2",
      "-translate-x-1/2",
      "print:hidden",
      "sm:bottom-4",
      "sm:left-auto",
      "sm:right-4",
      "sm:translate-x-0",
    );
    expect(overlay).not.toHaveClass("sm:left-4", "sm:top-4");
    expect(back).toHaveClass("relative");
    expect(printButton).toHaveClass("relative");
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
