import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("renders a labelled checkbox control", () => {
    render(<Checkbox name="administrative" label="Cotización administrativa" />);

    const checkbox = screen.getByRole("checkbox", { name: "Cotización administrativa" });
    expect(checkbox).toBeInTheDocument();
  });

  it("exposes checked state through aria attributes when toggled", async () => {
    const user = userEvent.setup();
    render(<Checkbox name="administrative" label="Cotización administrativa" />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it("renders a form-associated control with name='administrative'", () => {
    render(
      <form>
        <Checkbox name="administrative" label="Cotización administrativa" />
      </form>,
    );

    const hiddenInput = document.querySelector('input[name="administrative"]');
    expect(hiddenInput).toBeInTheDocument();
    expect(hiddenInput).toHaveAttribute("type", "checkbox");
    expect(hiddenInput).toHaveAttribute("value", "on");
  });

  it("submits 'on' in FormData when checked", async () => {
    const user = userEvent.setup();

    function TestForm() {
      return (
        <form>
          <Checkbox name="administrative" label="Cotización administrativa" />
          <button type="submit">Submit</button>
        </form>
      );
    }

    render(<TestForm />);

    const checkbox = screen.getByRole("checkbox", { name: "Cotización administrativa" });
    await user.click(checkbox);

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);

    expect(formData.get("administrative")).toBe("on");
  });

  it("does not submit a value when unchecked", () => {
    render(
      <form>
        <Checkbox name="administrative" label="Cotización administrativa" />
      </form>,
    );

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);

    expect(formData.get("administrative")).toBeNull();
  });

  it("honours controlled checked state", async () => {
    const user = userEvent.setup();

    function ControlledCheckbox() {
      const [checked, setChecked] = useState(false);
      return (
        <Checkbox
          name="administrative"
          label="Cotización administrativa"
          checked={checked}
          onCheckedChange={(value) => setChecked(value === true)}
        />
      );
    }

    render(<ControlledCheckbox />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});
