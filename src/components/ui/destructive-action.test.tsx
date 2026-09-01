import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DestructiveAction } from "./destructive-action";

function renderAction(props: Record<string, unknown> = {}) {
  return render(
    <DestructiveAction
      triggerLabel="Eliminar"
      triggerAriaLabel="Eliminar cotización C-001"
      title="Eliminar cotización"
      description="¿Confirmas eliminar C-001 de forma permanente?"
      confirmLabel="Sí, eliminar"
      cancelLabel="Volver"
      onConfirm={vi.fn()}
      {...props}
    />,
  );
}

describe("DestructiveAction", () => {
  it("opens the confirmation dialog and runs the action on confirm", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderAction({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Eliminar cotización C-001" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("closes without running the action on cancel and returns focus to the trigger", async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    renderAction({ onConfirm });

    const trigger = screen.getByRole("button", { name: "Eliminar cotización C-001" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Volver" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
  });

  it("disables double submission and blocks dismissal while pending", async () => {
    let resolvePending!: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => {
        resolvePending = resolve;
      }),
    );
    const user = userEvent.setup();
    renderAction({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Eliminar cotización C-001" }));
    const confirmButton = screen.getByRole("button", { name: "Sí, eliminar" });
    await user.click(confirmButton);

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Volver" })).toBeDisabled();

    await user.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    resolvePending();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the dialog open, shows the error and restores controls when the action throws", async () => {
    const onConfirm = vi.fn(() => {
      throw new Error("Falló la operación.");
    });
    const user = userEvent.setup();
    renderAction({ onConfirm });

    await user.click(screen.getByRole("button", { name: "Eliminar cotización C-001" }));
    const confirmButton = screen.getByRole("button", { name: "Sí, eliminar" });
    await user.click(confirmButton);

    await waitFor(() => expect(screen.getByText("Falló la operación.")).toBeInTheDocument());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(confirmButton).not.toBeDisabled();
  });

  it("respects the disabled prop on the trigger", () => {
    renderAction({ disabled: true });
    expect(screen.getByRole("button", { name: "Eliminar cotización C-001" })).toBeDisabled();
  });

  it("exposes an accessible name when icon-only", () => {
    renderAction({ iconOnly: true, triggerIcon: <svg aria-hidden="true" /> });
    expect(screen.getByRole("button", { name: "Eliminar cotización C-001" })).toBeInTheDocument();
  });

  it("stops click propagation when stopPropagation is set", async () => {
    const rowClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={rowClick}>
        <DestructiveAction triggerLabel="Eliminar" title="Eliminar" onConfirm={vi.fn()} stopPropagation />
      </div>,
    );

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(rowClick).not.toHaveBeenCalled();
  });
});