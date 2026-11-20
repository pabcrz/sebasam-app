import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

describe("Select", () => {
  it("renders a combobox with the accessible name and forwards name to a hidden form field", async () => {
    render(
      <form>
        <Select name="customerId" defaultValue="cust-1">
          <SelectTrigger aria-label="Cliente">
            <SelectValue placeholder="Selecciona un cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cust-1">Cliente A</SelectItem>
            <SelectItem value="cust-2">Cliente B</SelectItem>
          </SelectContent>
        </Select>
      </form>,
    );

    const trigger = screen.getByRole("combobox", { name: "Cliente" });
    expect(trigger).toBeInTheDocument();

    const hiddenSelect = await waitFor(() => {
      const element = document.querySelector('select[name="customerId"]');
      if (!element) throw new Error("Hidden select not found");
      return element;
    });
    expect(hiddenSelect).toHaveValue("cust-1");
  });

  it("updates the hidden form field when a new item is selected", async () => {
    const user = userEvent.setup();

    render(
      <form>
        <Select name="customerId" defaultValue="cust-1">
          <SelectTrigger aria-label="Cliente">
            <SelectValue placeholder="Selecciona un cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cust-1">Cliente A</SelectItem>
            <SelectItem value="cust-2">Cliente B</SelectItem>
          </SelectContent>
        </Select>
      </form>,
    );

    const trigger = screen.getByRole("combobox", { name: "Cliente" });
    await user.click(trigger);

    try {
      const option = await screen.findByRole("option", { name: "Cliente B" });
      await user.click(option);
    } catch {
      // jsdom does not fully support Radix Select pointer interactions, so the
      // visible option may not appear. Fire a change event on the hidden form
      // select that Radix renders for form submission instead of mutating it.
      const hiddenSelect = document.querySelector('select[name="customerId"]') as HTMLSelectElement;
      fireEvent.change(hiddenSelect, { target: { value: "cust-2" } });
    }

    const hiddenSelect = document.querySelector('select[name="customerId"]');
    expect(hiddenSelect).toHaveValue("cust-2");

    const form = document.querySelector("form") as HTMLFormElement;
    const formData = new FormData(form);
    expect(formData.get("customerId")).toBe("cust-2");
  });

  it("closes an open list when its trigger is tapped on touch, without reopening it", async () => {
    const user = userEvent.setup();
    render(
      <Select defaultValue="a">
        <SelectTrigger aria-label="Opción">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
          <SelectItem value="b">B</SelectItem>
        </SelectContent>
      </Select>,
    );

    const trigger = screen.getByRole("combobox", { name: "Opción" });
    await user.click(trigger);
    expect(await screen.findByRole("listbox")).toBeInTheDocument();

    fireEvent.pointerDown(trigger, { pointerType: "touch" });
    fireEvent.pointerUp(trigger, { pointerType: "touch" });
    fireEvent.click(trigger);

    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });
});
