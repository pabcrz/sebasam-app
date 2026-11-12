import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";
import { Button } from "./button";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("renders the title as a level-one heading with its status beside it", () => {
    render(<PageHeader title="Notas" status={<Badge variant="info">Pendientes: 3</Badge>} />);

    expect(screen.getByRole("heading", { level: 1, name: "Notas" })).toBeInTheDocument();
    expect(screen.getByText("Pendientes: 3")).toBeInTheDocument();
  });

  it("places secondary icon actions before the overflow menu and the primary action last", () => {
    render(
      <PageHeader
        title="Cotizaciones"
        secondaryActions={<Button variant="ghost" size="icon" aria-label="Imprimir lista">Imprimir</Button>}
        overflow={<Button>Exportar CSV</Button>}
        primaryAction={<Button>Nueva cotización</Button>}
      />,
    );

    const header = screen.getByTestId("page-header");
    const buttons = within(header).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);

    expect(buttons).toEqual(["Imprimir lista", "Más acciones de la página", "Nueva cotización"]);
  });

  it("keeps title and actions on one row in noWrap mode, so the header never breaks onto a second line", () => {
    render(
      <PageHeader
        noWrap
        title="Cotizaciones"
        secondaryActions={<Button variant="ghost" size="icon" aria-label="Archivo y papelera">Icono</Button>}
        primaryAction={<Button>Nueva cotización</Button>}
      />,
    );

    const header = screen.getByTestId("page-header");
    expect(header).toHaveClass("flex-nowrap");
    expect(header).not.toHaveClass("flex-wrap");
    expect(within(header).getByRole("button", { name: "Nueva cotización" }).parentElement).toHaveClass("flex-nowrap");
  });

  it("renders the primary action alone when there are no secondary actions", () => {
    render(<PageHeader title="Clientes" primaryAction={<Button>Nuevo cliente</Button>} />);

    const header = screen.getByTestId("page-header");
    expect(within(header).getAllByRole("button").map((button) => button.textContent)).toEqual(["Nuevo cliente"]);
  });
});
