import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

describe("ConfirmDialog", () => {
  it("renders a centered 440px dialog with the shared header and footer anatomy", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={vi.fn()}
        title="Eliminar nota"
        description="Esta acción no se puede deshacer."
        onConfirm={vi.fn()}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: "Eliminar nota" });
    expect(dialog).toHaveClass("max-w-[440px]");

    const header = dialog.querySelector("[data-dialog-header]");
    if (!(header instanceof HTMLElement)) throw new Error("Header not found");
    const controls = within(header).getAllByRole("button");
    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAccessibleName("Cerrar");
    expect(controls[0].parentElement).toHaveClass("h-[52px]");
    expect(controls.at(-1)).toBe(controls[0]);

    expect(screen.getByText("Esta acción no se puede deshacer.")).toBeInTheDocument();
  });

  it("orders the footer with the cancel action first and the confirm action last", () => {
    render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="Confirmar" onConfirm={vi.fn()} />,
    );

    const cancel = screen.getByRole("button", { name: "Cancelar" });
    const confirm = screen.getByRole("button", { name: "Confirmar" });
    const footer = cancel.parentElement;
    if (!footer) throw new Error("Footer not found");

    expect(footer).toContainElement(confirm);
    expect(Array.from(footer.children).map((child) => child.textContent)).toEqual(["Cancelar", "Confirmar"]);
    expect(footer).toHaveClass("[&>:last-child]:ml-auto");
  });

  it("closes from the ✕ and blocks it while loading", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ConfirmDialog open loading onOpenChange={onOpenChange} title="Confirmar" onConfirm={vi.fn()} />,
    );

    const close = screen.getByRole("button", { name: "Cerrar" });
    expect(close).toBeDisabled();
    await user.click(close);
    expect(onOpenChange).not.toHaveBeenCalled();

    rerender(<ConfirmDialog open onOpenChange={onOpenChange} title="Confirmar" onConfirm={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
