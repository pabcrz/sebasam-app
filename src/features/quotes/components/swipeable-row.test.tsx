import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SwipeableRow } from "./swipeable-row";

function mockMobileViewport(isMobile: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    const matches = isMobile && query.includes("max-width");
    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      addListener: () => {},
      removeListener: () => {},
    } as unknown as MediaQueryList;
  });
}

describe("SwipeableRow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children without swipe chrome on desktop", () => {
    mockMobileViewport(false);

    render(
      <SwipeableRow onConfirmDelete={vi.fn()} aria-label="Eliminar concepto 1">
        <div>Contenido del concepto</div>
      </SwipeableRow>,
    );

    expect(screen.getByText("Contenido del concepto")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar concepto 1" })).not.toBeInTheDocument();
  });

  it("renders the revealed delete action on mobile and confirms on tap", () => {
    mockMobileViewport(true);
    const onConfirmDelete = vi.fn();

    render(
      <SwipeableRow onConfirmDelete={onConfirmDelete} aria-label="Eliminar concepto 2">
        <div>Contenido del concepto</div>
      </SwipeableRow>,
    );

    const deleteButton = screen.getByRole("button", { name: "Eliminar concepto 2" });
    expect(deleteButton).toBeInTheDocument();
    expect(screen.getByText("Eliminar")).toBeInTheDocument();

    fireEvent.click(deleteButton);
    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
  });

  it("does not render the delete action when disabled", () => {
    mockMobileViewport(true);

    render(
      <SwipeableRow onConfirmDelete={vi.fn()} disabled aria-label="Eliminar concepto 3">
        <div>Contenido expandido</div>
      </SwipeableRow>,
    );

    expect(screen.getByText("Contenido expandido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar concepto 3" })).not.toBeInTheDocument();
  });

  it("reveals the delete action after a horizontal swipe past the threshold", () => {
    mockMobileViewport(true);

    render(
      <SwipeableRow onConfirmDelete={vi.fn()} aria-label="Eliminar concepto 4">
        <div>Concepto deslizable</div>
      </SwipeableRow>,
    );

    const content = screen.getByText("Concepto deslizable");
    const card = content.closest("div")!.parentElement!; // Swipeable card (has touch handlers)
    expect(card).not.toBeNull();

    const container = card.parentElement!;
    Object.defineProperty(container, "offsetWidth", { configurable: true, value: 400 });

    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 50 }],
    } as unknown as React.TouchEvent);
    fireEvent.touchMove(card, {
      touches: [{ clientX: 60, clientY: 52 }],
      preventDefault: () => {},
    } as unknown as React.TouchEvent);
    fireEvent.touchEnd(card, { touches: [] } as unknown as React.TouchEvent);

    const deleteButton = screen.getByRole("button", { name: "Eliminar concepto 4" });
    expect(deleteButton).toBeInTheDocument();
  });

  it("snaps back when the swipe does not reach the threshold", () => {
    mockMobileViewport(true);

    render(
      <SwipeableRow onConfirmDelete={vi.fn()} aria-label="Eliminar concepto 5">
        <div>Concepto con swipe corto</div>
      </SwipeableRow>,
    );

    const content = screen.getByText("Concepto con swipe corto");
    const card = content.closest("div")!.parentElement!;
    const container = card.parentElement!;

    Object.defineProperty(container, "offsetWidth", { configurable: true, value: 400 });

    fireEvent.touchStart(card, {
      touches: [{ clientX: 200, clientY: 50 }],
    } as unknown as React.TouchEvent);
    fireEvent.touchMove(card, {
      touches: [{ clientX: 180, clientY: 51 }],
      preventDefault: () => {},
    } as unknown as React.TouchEvent);
    fireEvent.touchEnd(card, { touches: [] } as unknown as React.TouchEvent);

    expect(card.style.transform).toBe("translateX(0px)");
  });
});
