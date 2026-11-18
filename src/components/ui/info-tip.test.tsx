import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { InfoTip } from "./info-tip";

describe("InfoTip", () => {
  it("names the ⓘ button and keeps its explanation closed until requested", () => {
    render(<InfoTip label="Qué incluye: Por cobrar">Saldo de las notas del periodo.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "Qué incluye: Por cobrar" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the explanation on activation and links it to the trigger", async () => {
    const user = userEvent.setup();
    render(<InfoTip label="Qué incluye: Por cobrar">Saldo de las notas del periodo.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "Qué incluye: Por cobrar" });
    await user.click(trigger);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Saldo de las notas del periodo.");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
  });

  it("hides the explanation again on a second activation and on Escape", async () => {
    const user = userEvent.setup();
    render(<InfoTip label="Qué incluye: Cobrado">Pagos acumulados.</InfoTip>);

    const trigger = screen.getByRole("button", { name: "Qué incluye: Cobrado" });
    await user.click(trigger);
    await user.click(trigger);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
