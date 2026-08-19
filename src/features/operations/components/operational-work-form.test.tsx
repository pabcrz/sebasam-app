import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OperationalWorkForm } from "./operational-work-form";

const masters = [{ id: "master-1", displayName: "Ana Maestra" }];
const customers = [{ id: "customer-1", name: "Cliente Uno" }];

describe("OperationalWorkForm", () => {
  it("preserves initial concepts and keeps one row after removing a concept", async () => {
    const user = userEvent.setup();
    render(<OperationalWorkForm action={vi.fn()} masters={masters} customers={customers} initial={{ masterId: "master-1", customerId: null, plate: "ABC123", brand: null, model: null, report: null, notes: null, concepts: [{ description: "Initial one", quantity: 1 }, { description: "Initial two", quantity: 2 }] }} />);

    expect(screen.getByDisplayValue("Initial one")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Initial two")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Eliminar concepto 2" }));
    expect(screen.queryByDisplayValue("Initial two")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar concepto 1" })).toBeDisabled();
  });

  it("adds a row and serializes multiple price-free concepts with stable names", async () => {
    const action = vi.fn();
    const user = userEvent.setup();
    render(<OperationalWorkForm action={action} masters={masters} customers={customers} />);

    await user.type(screen.getByLabelText("Descripción 1"), "Inspection");
    await user.click(screen.getByRole("button", { name: "Agregar concepto" }));
    await user.type(screen.getByLabelText("Descripción 2"), "Replace bushing");
    await user.clear(screen.getByLabelText("Cantidad 2"));
    await user.type(screen.getByLabelText("Cantidad 2"), "2");
    fireEvent.submit(screen.getByTestId("operational-work-form"));

    expect(action).toHaveBeenCalledTimes(1);
    const formData = action.mock.calls[0][0] as FormData;
    expect(formData.get("concept-description-0")).toBe("Inspection");
    expect(formData.get("concept-quantity-0")).toBe("1");
    expect(formData.get("concept-description-1")).toBe("Replace bushing");
    expect(formData.get("concept-quantity-1")).toBe("2");
    expect(formData.get("concept-description-2")).toBeNull();
  });
});
