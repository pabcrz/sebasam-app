import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OperationalCardLayout, OperationalCardActions } from "./operational-card-layout";

describe("OperationalCardLayout", () => {
  it("renders all four operational slots when provided", () => {
    render(
      <OperationalCardLayout
        header={<div>COT-001 - Borrador</div>}
        identity={<div>Cliente Juan Perez</div>}
        context={<div>Orden vinculada OT-100</div>}
        dates={<div>Creada: 10 sep 2026</div>}
      />,
    );

    expect(screen.getByTestId("card-header")).toHaveTextContent("COT-001 - Borrador");
    expect(screen.getByTestId("card-identity")).toHaveTextContent("Cliente Juan Perez");
    expect(screen.getByTestId("card-context")).toHaveTextContent("Orden vinculada OT-100");
    expect(screen.getByTestId("card-dates")).toHaveTextContent("Creada: 10 sep 2026");
  });

  it("omits context and dates slots gracefully when not provided", () => {
    render(
      <OperationalCardLayout
        header={<div>OT-001 - En proceso</div>}
        identity={<div>Cliente Maria Lopez</div>}
      />,
    );

    expect(screen.getByTestId("card-header")).toBeInTheDocument();
    expect(screen.getByTestId("card-identity")).toBeInTheDocument();
    expect(screen.queryByTestId("card-context")).not.toBeInTheDocument();
    expect(screen.queryByTestId("card-dates")).not.toBeInTheDocument();
  });
});

describe("OperationalCardActions", () => {
  it("renders primary action full-width, frequent action tiles, and overflow menu", () => {
    render(
      <OperationalCardActions
        primary={<button type="button">Gestionar trabajo</button>}
        frequent={
          <>
            <button type="button">Imprimir</button>
            <button type="button">Compartir</button>
          </>
        }
        overflow={<button type="button">Más opciones</button>}
      />,
    );

    const primarySlot = screen.getByTestId("operational-card-primary-action");
    expect(primarySlot).toHaveTextContent("Gestionar trabajo");

    const secondarySlot = screen.getByTestId("operational-card-secondary-actions");
    expect(secondarySlot).toHaveTextContent("Imprimir");
    expect(secondarySlot).toHaveTextContent("Compartir");

    const overflowSlot = screen.getByTestId("operational-card-overflow-action");
    expect(overflowSlot).toHaveTextContent("Más opciones");
  });

  it("renders only secondary actions if no primary action is defined", () => {
    render(
      <OperationalCardActions
        frequent={<button type="button">Imprimir</button>}
        overflow={<button type="button">...</button>}
      />,
    );

    expect(screen.queryByTestId("operational-card-primary-action")).not.toBeInTheDocument();
    expect(screen.getByTestId("operational-card-secondary-actions")).toBeInTheDocument();
  });
});
