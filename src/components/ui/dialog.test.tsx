import { describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function TestDialog() {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Test dialog</DialogTitle>
        <Select>
          <SelectTrigger aria-label="Choose">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  );
}

describe("DialogContent", () => {
  it("renders the portaled SelectContent with the select-content marker", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.click(screen.getByRole("combobox", { name: "Choose" }));

    const selectContent = await waitFor(() => {
      const element = document.querySelector("[data-select-content]");
      if (!element) throw new Error("Select content not found");
      return element;
    });
    expect(selectContent).toBeInTheDocument();
  });

  it("keeps the dialog open when a portaled Select item is selected", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Choose" }));
    const option = await screen.findByRole("option", { name: "Option A" });
    await user.click(option);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
  });

  it("closes the dialog when clicking the overlay", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).not.toBeNull();
    // Click the overlay element that sits behind the dialog content.
    if (overlay instanceof HTMLElement) {
      await user.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
