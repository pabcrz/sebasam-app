import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperationalCard } from "./operational-card";

describe("OperationalCard", () => {
  it("opens its body with the keyboard without treating footer actions as body clicks", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(<OperationalCard onOpen={onOpen} openLabel="Ver detalle" footer={<button type="button" onClick={onAction}>Acción</button>}>Contenido</OperationalCard>);

    screen.getByRole("button", { name: "Ver detalle" }).focus();
    await user.keyboard("{Enter}");
    await user.click(screen.getByRole("button", { name: "Acción" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
