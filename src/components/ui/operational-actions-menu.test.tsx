import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperationalActionsMenu } from "./operational-actions-menu";

describe("OperationalActionsMenu", () => {
  it("renders trigger with accessibility attributes and opens dialog with standard and destructive actions", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDestroy = vi.fn();

    render(
      <OperationalActionsMenu
        title="Acciones de orden"
        description="Opciones para la orden OT-100"
        triggerAriaLabel="Más opciones para OT-100"
        triggerIconOnly
        destructive={<button type="button" onClick={onDestroy}>Eliminar orden</button>}
      >
        <button type="button" onClick={onAction}>Duplicar orden</button>
      </OperationalActionsMenu>,
    );

    const trigger = screen.getByRole("button", { name: "Más opciones para OT-100" });
    expect(trigger).toHaveAttribute("title", "Más opciones para OT-100");

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Acciones de orden" })).toBeInTheDocument();
    expect(screen.getByText("Opciones para la orden OT-100")).toBeInTheDocument();

    const actionBtn = screen.getByRole("button", { name: "Duplicar orden" });
    const destroyBtn = screen.getByRole("button", { name: "Eliminar orden" });

    await user.click(actionBtn);
    expect(onAction).toHaveBeenCalledTimes(1);

    await user.click(destroyBtn);
    expect(onDestroy).toHaveBeenCalledTimes(1);
  });
});
