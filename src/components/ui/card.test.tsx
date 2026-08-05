import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card, CardHeader, CardTitle } from "./card";

describe("Card", () => {
  it("fills the available width in a horizontal flex layout", () => {
    const styles = document.createElement("style");
    styles.textContent = ".w-full { width: 100%; }";
    document.head.append(styles);

    try {
      render(
        <div style={{ display: "flex" }}>
          <Card data-testid="card">Short content</Card>
        </div>,
      );

      expect(getComputedStyle(screen.getByTestId("card")).width).toBe("100%");
    } finally {
      styles.remove();
    }
  });
});

describe("CardTitle", () => {
  it("renders as h1 when as='h1' is provided", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h1">Cotizaciones en borrador</CardTitle>
        </CardHeader>
      </Card>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Cotizaciones en borrador");
  });

  it("renders as h2 when as='h2' is provided", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle as="h2">Crear cotización en borrador</CardTitle>
        </CardHeader>
      </Card>,
    );

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Crear cotización en borrador");
  });

  it("defaults to h3 when no 'as' prop is provided", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Cotizaciones recientes</CardTitle>
        </CardHeader>
      </Card>,
    );

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading).toHaveTextContent("Cotizaciones recientes");
  });
});
