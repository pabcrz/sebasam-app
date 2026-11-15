import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Chip, ChipAdd, ChipRow } from "./chip";

describe("Chip", () => {
  it("exposes selection with aria-pressed and a borderless tonal state when pressed", () => {
    const { rerender } = render(<Chip pressed={false}>Frenos</Chip>);

    const chip = screen.getByRole("button", { name: "Frenos" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(chip.className).not.toMatch(/(?:^|\s)border(?:\s|$)/);
    expect(chip.className).not.toMatch(/(?:^|\s)bg-\[var\(--color-tonal-bg\)\](?:\s|$)/);

    rerender(<Chip pressed>Frenos</Chip>);

    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip.className).toContain("bg-[var(--color-tonal-bg)]");
    expect(chip.className).toContain("text-[var(--color-tonal-fg)]");
  });

  it("uses a tonal hover with a thin outline instead of a border", () => {
    render(<Chip pressed={false}>Frenos</Chip>);

    const chip = screen.getByRole("button", { name: "Frenos" });
    expect(chip.className).toContain("hover:bg-[var(--color-tonal-bg)]");
    expect(chip.className).toContain("hover:outline");
  });

  it("calls onClick and keeps a 44px invisible hit area without wrapping away from its row", () => {
    const onClick = vi.fn();
    render(<Chip pressed={false} onClick={onClick}>Frenos</Chip>);

    const chip = screen.getByRole("button", { name: "Frenos" });
    fireEvent.click(chip);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(chip.className).toContain("before:h-[max(100%,var(--tap-min-height))]");
    expect(chip.className).toContain("shrink-0");
  });
});

describe("ChipAdd", () => {
  it("is a plain action with a dashed border and a tonal hover, and no pressed state", () => {
    render(<ChipAdd>Mano de obra</ChipAdd>);

    const add = screen.getByRole("button", { name: "Mano de obra" });
    expect(add).not.toHaveAttribute("aria-pressed");
    expect(add.className).toContain("border-dashed");
    expect(add.className).toContain("hover:bg-[var(--color-tonal-bg)]");
    expect(add.className).toContain("before:h-[max(100%,var(--tap-min-height))]");
  });
});

describe("ChipRow", () => {
  it("keeps chips on one horizontally scrolling row that never wraps", () => {
    render(
      <ChipRow label="Filtros activos">
        <Chip pressed>Frenos</Chip>
        <ChipAdd>Mano de obra</ChipAdd>
      </ChipRow>,
    );

    const row = screen.getByRole("group", { name: "Filtros activos" });
    expect(row.className).toContain("flex-nowrap");
    expect(row.className).toContain("overflow-x-auto");
    expect(row.className).toContain("max-w-full");
    expect(row.className).not.toContain("flex-wrap");
  });
});
