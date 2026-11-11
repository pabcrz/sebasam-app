import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StatTile } from "./stat-tile";

describe("StatTile", () => {
  it("renders a short label, the figure and an ⓘ explanation without a colored border", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <StatTile label="Por cobrar" value="$4,500.00" tone="warning" info="Saldo de las notas del periodo y filtros elegidos." />,
    );

    expect(screen.getByText("Por cobrar")).toBeInTheDocument();
    expect(screen.getByText("$4,500.00")).toHaveClass("tabular-nums");
    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveClass("bg-[var(--color-status-warning-bg)]");
    expect(tile.className).not.toMatch(/border/);

    await user.click(screen.getByRole("button", { name: "Qué incluye: Por cobrar" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Saldo de las notas del periodo y filtros elegidos.");
  });

  it("omits the ⓘ control when there is nothing to explain", () => {
    render(<StatTile label="Cobrado" value="$0.00" />);

    expect(screen.getByText("Cobrado")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
