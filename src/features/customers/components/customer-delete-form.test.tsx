import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerDeleteForm } from "./customer-delete-form";

describe("CustomerDeleteForm", () => {
  it("renders trigger button and opens confirmation dialog on click", async () => {
    const user = userEvent.setup();
    const action = vi.fn();

    render(
      <CustomerDeleteForm
        action={action}
        customerId="cust-1"
        customerName="Empresa Acme"
      />
    );

    const trigger = screen.getByRole("button", { name: "Eliminar cliente Empresa Acme" });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Eliminar cliente" })).toBeInTheDocument();
    expect(screen.getByText(/¿Confirmas eliminar permanentemente a "Empresa Acme"\?/)).toBeInTheDocument();
  });

  it("submits formData with customerId when confirmed", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue(undefined);

    render(
      <CustomerDeleteForm
        action={action}
        customerId="cust-1"
        customerName="Empresa Acme"
      />
    );

    await user.click(screen.getByRole("button", { name: "Eliminar cliente Empresa Acme" }));

    const confirmBtn = screen.getByRole("button", { name: "Eliminar cliente" });
    await user.click(confirmBtn);

    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("customerId")).toBe("cust-1");
  });
});
