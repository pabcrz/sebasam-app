import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListRow } from "./list-row";

describe("ListRow", () => {
  it("renders the whole row as one button named by openLabel, with the decision data on the right", () => {
    render(
      <ListRow
        openLabel="Ver detalle de Maestro Pedro"
        onOpen={vi.fn()}
        decision={<span>$400.00</span>}
      >
        <span>Maestro Pedro</span>
      </ListRow>,
    );

    const row = screen.getByRole("button", { name: "Ver detalle de Maestro Pedro" });
    expect(within(row).getByText("Maestro Pedro")).toBeInTheDocument();
    expect(within(row).getByText("$400.00")).toBeInTheDocument();
    expect(within(row).queryAllByRole("button")).toHaveLength(0);
  });

  it("opens from a tap anywhere on the row, including its left content", () => {
    const onOpen = vi.fn();
    render(
      <ListRow openLabel="Ver detalle de Maestro Juan" onOpen={onOpen} decision={<span>$1,000.00</span>}>
        <span>Maestro Juan</span>
      </ListRow>,
    );

    fireEvent.click(screen.getByText("Maestro Juan"));
    fireEvent.click(screen.getByText("$1,000.00"));

    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("renders as a link when href is given, keeping the same whole-row target", () => {
    render(
      <ListRow openLabel="Ver cliente Flotillas SA" href="/admin/clientes/c-1">
        <span>Flotillas SA</span>
      </ListRow>,
    );

    expect(screen.getByRole("link", { name: "Ver cliente Flotillas SA" })).toHaveAttribute(
      "href",
      "/admin/clientes/c-1",
    );
  });

  it("is a shadow-only surface with a 44px tap height", () => {
    render(
      <ListRow openLabel="Ver detalle" onOpen={vi.fn()}>
        <span>Fila</span>
      </ListRow>,
    );

    const row = screen.getByRole("button", { name: "Ver detalle" });
    expect(row).toHaveClass("shadow-[var(--shadow-card)]", "min-h-[var(--tap-min-height)]");
    expect(row.className).not.toMatch(/(^|\s)border(-|\s|$)/);
  });

  it("keeps the card surface by default; flat rows drop it and keep the tap target", () => {
    const { unmount } = render(<ListRow openLabel="Card" href="/a">Fila</ListRow>);
    expect(screen.getByRole("link", { name: "Card" })).toHaveClass("shadow-[var(--shadow-card)]", "rounded-[var(--radius-md)]");
    unmount();

    render(<ListRow openLabel="Flat" href="/b" flat>Fila</ListRow>);
    const flat = screen.getByRole("link", { name: "Flat" });
    expect(flat.className).not.toMatch(/shadow-\[|rounded-\[/);
    expect(flat).toHaveClass("min-h-[var(--tap-min-height)]");
  });

  it("shows a chevron by default and hides it when chevron is false", () => {
    const { rerender } = render(
      <ListRow openLabel="Ver detalle" onOpen={vi.fn()}>
        <span>Fila</span>
      </ListRow>,
    );
    expect(screen.getByRole("button", { name: "Ver detalle" }).querySelector("svg")).not.toBeNull();

    rerender(
      <ListRow openLabel="Ver detalle" onOpen={vi.fn()} chevron={false}>
        <span>Fila</span>
      </ListRow>,
    );
    expect(screen.getByRole("button", { name: "Ver detalle" }).querySelector("svg")).toBeNull();
  });
});
