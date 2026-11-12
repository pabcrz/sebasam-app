import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CardPanelProvider, useCardPanel } from "./card-panel";

function Card({ id }: { id: string }) {
  const panel = useCardPanel(id);

  return (
    <div>
      <button
        type="button"
        aria-current={panel.selected ? "true" : undefined}
        onClick={() => panel.open("preview")}
      >
        Abrir {id}
      </button>
      <button type="button" onClick={() => panel.open("manage")}>
        Gestionar {id}
      </button>
      <button type="button" onClick={() => panel.close("preview")}>
        Cerrar preview {id}
      </button>
      {panel.isOpen("preview") ? <p>Vista de {id}</p> : null}
      {panel.isOpen("manage") ? <p>Gestión de {id}</p> : null}
    </div>
  );
}

describe("CardPanelProvider", () => {
  it("keeps one open panel across the list: opening another card moves the mark and swaps the panel", async () => {
    const user = userEvent.setup();
    render(
      <CardPanelProvider>
        <Card id="a" />
        <Card id="b" />
      </CardPanelProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir a" }));
    expect(screen.getByText("Vista de a")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir a" })).toHaveAttribute("aria-current", "true");

    await user.click(screen.getByRole("button", { name: "Abrir b" }));
    expect(screen.queryByText("Vista de a")).not.toBeInTheDocument();
    expect(screen.getByText("Vista de b")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir a" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "Abrir b" })).toHaveAttribute("aria-current", "true");
  });

  it("replaces a preview with a management panel of the same card and keeps the mark", async () => {
    const user = userEvent.setup();
    render(
      <CardPanelProvider>
        <Card id="a" />
      </CardPanelProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir a" }));
    await user.click(screen.getByRole("button", { name: "Gestionar a" }));

    expect(screen.queryByText("Vista de a")).not.toBeInTheDocument();
    expect(screen.getByText("Gestión de a")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir a" })).toHaveAttribute("aria-current", "true");
  });

  it("ignores a close for a panel that is not the open one", async () => {
    const user = userEvent.setup();
    render(
      <CardPanelProvider>
        <Card id="a" />
        <Card id="b" />
      </CardPanelProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Abrir b" }));
    await user.click(screen.getByRole("button", { name: "Cerrar preview a" }));

    expect(screen.getByText("Vista de b")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir b" })).toHaveAttribute("aria-current", "true");
  });
});

describe("useCardPanel without a provider", () => {
  it("still opens and closes a card's own panel", async () => {
    const user = userEvent.setup();
    render(<Card id="solo" />);

    await user.click(screen.getByRole("button", { name: "Abrir solo" }));
    expect(screen.getByText("Vista de solo")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar preview solo" }));
    expect(screen.queryByText("Vista de solo")).not.toBeInTheDocument();
  });
});
