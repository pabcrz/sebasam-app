import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "paid", label: "Pagadas" },
];

describe("SegmentedControl", () => {
  it("renders a named group of toggle buttons with the chosen option pressed", () => {
    render(<SegmentedControl label="Filtrar notas" options={options} value="pending" onValueChange={() => {}} />);

    expect(screen.getByRole("group", { name: "Filtrar notas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendientes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todas" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the clicked option value", () => {
    const onValueChange = vi.fn();
    render(<SegmentedControl label="Filtrar notas" options={options} value="all" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Pagadas" }));

    expect(onValueChange).toHaveBeenCalledWith("paid");
  });

  it("has a 16px container with no border or inner padding, and a tonal full-height chosen option", () => {
    render(<SegmentedControl label="Filtrar notas" options={options} value="pending" onValueChange={() => {}} />);

    const group = screen.getByRole("group", { name: "Filtrar notas" });
    expect(group.className).toContain("rounded-[var(--radius-lg)]");
    expect(group.className).toContain("no-scrollbar");
    expect(group.className).not.toMatch(/(?:^|\s)border(?:\s|$)/);
    expect(group.className).not.toMatch(/(?:^|\s)p[xytrbl]?-/);

    const chosen = screen.getByRole("button", { name: "Pendientes" });
    expect(chosen.className).toContain("bg-[var(--color-tonal-bg)]");
    expect(chosen.className).toContain("text-[var(--color-tonal-fg)]");
    expect(chosen.className).toContain("self-stretch");
    expect(chosen.className).toContain("rounded-[var(--radius-md)]");

    const other = screen.getByRole("button", { name: "Todas" });
    expect(other.className).not.toContain("bg-[var(--color-tonal-bg)]");
  });

  it("gives each option a 44px invisible hit area", () => {
    render(<SegmentedControl label="Filtrar notas" options={options} value="all" onValueChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Todas" }).className).toContain("before:h-[max(100%,var(--tap-min-height))]");
  });

  it("renders href options as links, marking the chosen one with aria-current", () => {
    render(
      <SegmentedControl
        label="Estado de pago"
        options={[
          { value: "/notas?payment=all", label: "Todas", href: "/notas?payment=all" },
          { value: "/notas?payment=paid", label: "Pagadas", href: "/notas?payment=paid" },
        ]}
        value="/notas?payment=paid"
      />,
    );

    expect(screen.getByRole("navigation", { name: "Estado de pago" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagadas" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Todas" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Pagadas" }).className).toContain("bg-[var(--color-tonal-bg)]");
  });
});
