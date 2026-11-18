import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders a labelled switch with the label on the left and the control on the right", () => {
    render(<Switch name="administrative" label="Cotización administrativa" />);

    const toggle = screen.getByRole("switch", { name: "Cotización administrativa" });
    const row = toggle.parentElement;
    expect(row).toHaveClass("flex", "items-center", "justify-between");
    expect(row?.firstElementChild?.tagName).toBe("LABEL");
    expect(row?.lastElementChild).toBe(toggle);
  });

  it("exposes checked state through aria-checked and toggles on click", async () => {
    const user = userEvent.setup();
    render(<Switch name="administrative" label="Cotización administrativa" />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("toggles with the Space key", async () => {
    const user = userEvent.setup();
    render(<Switch label="Incluir IVA (16%)" />);

    const toggle = screen.getByRole("switch", { name: "Incluir IVA (16%)" });
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("submits name='on' only while checked, like the checkbox it replaces", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Switch name="administrative" label="Cotización administrativa" />
      </form>,
    );

    const form = document.querySelector("form") as HTMLFormElement;
    expect(new FormData(form).has("administrative")).toBe(false);

    await user.click(screen.getByRole("switch"));
    expect(new FormData(form).get("administrative")).toBe("on");
  });

  it("accepts an aria-label when it renders without a visible label", () => {
    render(<Switch aria-label="Incluir en nómina / comisión" />);

    expect(screen.getByRole("switch", { name: "Incluir en nómina / comisión" })).toBeInTheDocument();
  });
});
