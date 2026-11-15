import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerSearch } from "./customer-search";

const replace = vi.fn();
let currentSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/customers",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

describe("CustomerSearch", () => {
  afterEach(() => {
    currentSearch = "";
    replace.mockReset();
    vi.useRealTimers();
  });

  it("debounces URL search updates and ignores stale URL responses", () => {
    vi.useFakeTimers();
    const view = render(<CustomerSearch />);

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar clientes" }), { target: { value: "Ana" } });
    vi.advanceTimersByTime(300);
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar clientes" }), { target: { value: "Ana Torres" } });

    currentSearch = "q=Ana";
    view.rerender(<CustomerSearch />);
    vi.advanceTimersByTime(300);

    expect(screen.getByRole("searchbox", { name: "Buscar clientes" })).toHaveValue("Ana Torres");
    expect(replace).toHaveBeenCalledTimes(2);
    expect(replace).toHaveBeenNthCalledWith(1, "/admin/customers?q=Ana", { scroll: false });
    expect(replace).toHaveBeenCalledWith("/admin/customers?q=Ana+Torres", { scroll: false });
  });

  it("uses the current URL state and clears only the search query", () => {
    currentSearch = "created=1&q=Ana";
    render(<CustomerSearch />);

    expect(screen.getByRole("searchbox", { name: "Buscar clientes" })).toHaveValue("Ana");
    fireEvent.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));

    expect(replace).toHaveBeenCalledWith("/admin/customers?created=1", { scroll: false });
  });
});
