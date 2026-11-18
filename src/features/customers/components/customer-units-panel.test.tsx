import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CustomerUnitsPanel } from "./customer-units-panel";

function unit(id: string, overrides: Partial<Parameters<typeof CustomerUnitsPanel>[0]["vehicles"][number]> = {}) {
  return {
    id,
    economicNumber: null,
    plate: null,
    brand: null,
    model: null,
    year: null,
    inWorkshop: false,
    ...overrides,
  };
}

describe("CustomerUnitsPanel", () => {
  const vehicles = [
    unit("v-1", { economicNumber: "118", brand: "Kenworth", model: "T800", inWorkshop: true }),
    unit("v-2", { plate: "LX-5520", brand: "Isuzu", model: "ELF" }),
    unit("v-3", { economicNumber: "042", brand: "International", model: "4400" }),
  ];

  it("searches by ECO or plates as the user types", async () => {
    const user = userEvent.setup();
    render(<CustomerUnitsPanel vehicles={vehicles} />);

    await user.type(screen.getByRole("searchbox", { name: "Buscar unidades" }), "042");

    expect(screen.getByText("ECO 042 · International 4400")).toBeInTheDocument();
    expect(screen.queryByText("ECO 118 · Kenworth T800")).not.toBeInTheDocument();
  });

  it("applies the En taller and Sin ECO quick filters", async () => {
    const user = userEvent.setup();
    render(<CustomerUnitsPanel vehicles={vehicles} />);

    await user.click(screen.getByRole("button", { name: "En taller" }));
    expect(screen.getByText("ECO 118 · Kenworth T800")).toBeInTheDocument();
    expect(screen.queryByText("ECO 042 · International 4400")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "En taller" }));
    await user.click(screen.getByRole("button", { name: "Sin ECO" }));
    expect(screen.getByText("LX-5520 · Isuzu ELF")).toBeInTheDocument();
    expect(screen.queryByText("ECO 118 · Kenworth T800")).not.toBeInTheDocument();
  });

  it("shows four units with Ver todas above eight units, and all of them after expanding", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 9 }, (_, index) => unit(`u-${index}`, { economicNumber: `10${index}`, model: "Modelo" }));
    render(<CustomerUnitsPanel vehicles={many} />);

    const list = screen.getByRole("list", { name: "Unidades del cliente" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "Ver todas" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(9);
  });

  it("shows the empty state when the customer has no units", () => {
    render(<CustomerUnitsPanel vehicles={[]} />);

    expect(screen.getByText("Sin unidades registradas")).toBeInTheDocument();
  });

  it("hides the scrollbar of the quick-filter row without losing horizontal scroll", () => {
    render(<CustomerUnitsPanel vehicles={vehicles} />);

    expect(screen.getByRole("group", { name: "Filtros rápidos de unidades" })).toHaveClass("no-scrollbar", "overflow-x-auto");
  });
});
