import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StatTile } from "./stat-tile";

describe("StatTile", () => {
  it("renders a white bordered surface with no shadow, and the tone only on the figure", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StatTile label="Por cobrar" value="$4,500.00" tone="warning" info="Saldo de las notas del periodo y filtros elegidos." />,
    );

    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveClass("border", "border-[var(--color-border-light)]", "bg-[var(--color-surface)]");
    expect(tile.className).not.toMatch(/shadow/);
    expect(tile.className).not.toMatch(/status-warning-bg/);

    const figure = screen.getByText("$4,500.00");
    expect(figure).toHaveClass("tabular-nums", "text-[var(--color-status-warning-fg)]");
    expect(screen.getByText("Por cobrar").parentElement).toHaveClass("text-[var(--color-text-muted)]");

    await user.click(screen.getByRole("button", { name: "Qué incluye: Por cobrar" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Saldo de las notas del periodo y filtros elegidos.");
  });

  it.each([
    ["danger", "text-[var(--color-status-danger-fg)]"],
    ["success", "text-[var(--color-status-success-fg)]"],
    ["neutral", "text-[var(--color-text-main)]"],
  ] as const)("colors only the figure for the %s tone", (tone, figureClass) => {
    render(<StatTile label="Dato" value="$1.00" tone={tone} />);

    expect(screen.getByText("$1.00")).toHaveClass(figureClass);
    expect(screen.getByText("Dato")).not.toHaveClass(figureClass);
  });

  it("omits the ⓘ control when there is nothing to explain", () => {
    render(<StatTile label="Cobrado" value="$0.00" />);

    expect(screen.getByText("Cobrado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
