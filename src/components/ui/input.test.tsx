import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

  it("blurs number fields during wheel capture without preventing page scrolling", () => {
    const onWheelCapture = vi.fn(() =>
      expect(screen.getByRole("spinbutton")).toHaveFocus(),
    );
    const onWheel = vi.fn(() =>
      expect(screen.getByRole("spinbutton")).not.toHaveFocus(),
    );
    render(
      <Input
        id="price"
        name="price"
        type="number"
        defaultValue="100"
        onWheel={onWheel}
        onWheelCapture={onWheelCapture}
      />,
    );

    const input = screen.getByRole("spinbutton");
    input.focus();

    expect(fireEvent.wheel(input)).toBe(true);
    expect(input).not.toHaveFocus();
    expect(input).toHaveValue(100);
    expect(onWheelCapture).toHaveBeenCalledOnce();
    expect(onWheel).toHaveBeenCalledOnce();
  });

  it("keeps non-number fields focused and preserves wheel handlers", () => {
    const onWheel = vi.fn();
    const onWheelCapture = vi.fn();
    render(
      <Input
        id="title"
        name="title"
        defaultValue="Oil change"
        onWheel={onWheel}
        onWheelCapture={onWheelCapture}
      />,
    );

    const input = screen.getByRole("textbox");
    input.focus();
    fireEvent.wheel(input);

    expect(input).toHaveFocus();
    expect(onWheelCapture).toHaveBeenCalledOnce();
    expect(onWheel).toHaveBeenCalledOnce();
  });
});
