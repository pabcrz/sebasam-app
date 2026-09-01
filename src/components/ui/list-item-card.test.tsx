import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListItemCard } from "./list-item-card";

describe("ListItemCard", () => {
  it("keeps actions outside the clickable body", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const onAction = vi.fn();
    render(<ListItemCard onOpen={onOpen} openLabel="Open customer" actions={<button type="button" onClick={onAction}>Edit customer</button>} body="Customer name" />);

    await user.click(screen.getByRole("button", { name: "Edit customer" }));
    expect(onOpen).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Open customer" }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Open customer" }).parentElement).toHaveClass("flex", "items-start", "gap-4");
  });

  it("does not render an empty action region", () => {
    render(<ListItemCard body="Customer name" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Customer name").parentElement?.parentElement).not.toHaveClass("mt-4");
  });
});
