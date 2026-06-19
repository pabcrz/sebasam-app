import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("preserves name attribute and value for form submission", async () => {
    const user = userEvent.setup();
    render(
      <form>
        <Textarea id="description" name="description" />
      </form>,
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("name", "description");

    await user.type(textarea, "Revisión general del vehículo");
    expect(textarea).toHaveValue("Revisión general del vehículo");

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);
    expect(formData.get("description")).toBe("Revisión general del vehículo");
  });
});
