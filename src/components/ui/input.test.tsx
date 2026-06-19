import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("preserves name attribute and value for form submission", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Input id="title" name="title" />
      </form>,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("name", "title");

    await user.type(input, "Cambio de aceite");
    expect(input).toHaveValue("Cambio de aceite");

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);
    expect(formData.get("title")).toBe("Cambio de aceite");
  });

  it("preserves number field name and value for form submission", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Input id="year" name="year" type="number" />
      </form>,
    );

    const input = screen.getByRole("spinbutton");
    expect(input).toHaveAttribute("name", "year");

    await user.type(input, "2024");

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);
    expect(formData.get("year")).toBe("2024");
  });
});
