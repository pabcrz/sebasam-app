import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperationalActionRow, OperationalCard } from "./operational-card";

function ActionWithStatus() {
  return (
    <>
      <button type="button">Estado</button>
      <span role="status">Disponible</span>
    </>
  );
}

describe("OperationalCard", () => {
  it("opens its body with the keyboard without treating footer actions as body clicks", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(<OperationalCard onOpen={onOpen} openLabel="Ver detalle" actions={<button type="button" onClick={onAction}>Acción</button>} body="Contenido" />);

    screen.getByRole("button", { name: "Ver detalle" }).focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Acción" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("keeps body and actions on one padded surface", () => {
    render(<OperationalCard onOpen={vi.fn()} openLabel="Ver detalle" actions={<button type="button">Acción</button>} body="Contenido" />);

    const body = screen.getByRole("button", { name: "Ver detalle" });
    const action = screen.getByRole("button", { name: "Acción" });
    expect(body.parentElement).toHaveClass("p-4");
    expect(body).toHaveClass("rounded-[var(--radius-sm)]", "focus-visible:ring-offset-2");
    expect(action.parentElement).toHaveClass("mt-4");
    expect(action.parentElement).not.toHaveClass("border-t", "bg-[var(--color-bg-soft)]");
  });

  it("lays out action cells one after another without promoting feedback", () => {
    render(
      <OperationalActionRow>
        <button type="button">Directa</button>
        <form><button type="button">Formulario</button></form>
        <ActionWithStatus />
      </OperationalActionRow>,
    );

    const row = screen.getByRole("button", { name: "Directa" }).parentElement?.parentElement;
    const cells = Array.from(row?.children ?? []);

    expect(row).toHaveClass("flex", "w-full", "flex-wrap", "items-center", "gap-3", "[&_button]:h-10", "[&_button]:w-10", "sm:gap-2", "sm:[&_button]:h-9", "sm:[&_button]:w-auto");
    expect(cells).toHaveLength(3);
    cells.forEach((cell) => expect(cell).toHaveClass("grid", "w-10", "sm:block", "sm:w-auto"));
    expect(screen.getByRole("status").parentElement).toBe(cells[2]);
  });
});
