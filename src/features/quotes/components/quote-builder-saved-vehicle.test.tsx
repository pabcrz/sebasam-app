import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteBuilder } from "./quote-builder";

const customers = [
  {
    id: "cust-1",
    name: "Hino Yaxche",
    vehicles: [
      { id: "veh-1", plate: "ABC-123", economicNumber: "42", brand: "Ford", model: "F-350", year: 2015 },
      { id: "veh-2", plate: "XYZ-987", economicNumber: null, brand: null, model: null, year: null },
    ],
  },
  { id: "cust-2", name: "Sin unidades" },
];

async function pickCustomer(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole("combobox", { name: /cliente/i }));
  await user.click(screen.getByRole("option", { name }));
}

describe("quote builder saved vehicles", () => {
  it("fills the unit fields from a saved vehicle and clears them for another unit", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await pickCustomer(user, "Hino Yaxche");

    await user.click(screen.getByRole("combobox", { name: "Unidad guardada" }));
    await user.click(screen.getByRole("option", { name: "ECO 42 · Ford F-350" }));
    expect(screen.getByLabelText(/placas/i)).toHaveValue("ABC-123");
    expect(screen.getByLabelText(/^eco/i)).toHaveValue("42");
    expect(screen.getByLabelText(/marca/i)).toHaveValue("Ford");
    expect(screen.getByLabelText(/año/i)).toHaveValue(2015);

    await user.click(screen.getByRole("combobox", { name: "Unidad guardada" }));
    await user.click(screen.getByRole("option", { name: "Otra unidad" }));
    expect(screen.getByLabelText(/placas/i)).toHaveValue("");
    expect(screen.getByLabelText(/marca/i)).toHaveValue("");
  });

  it("hides the selector when the customer has no saved vehicles", async () => {
    const user = userEvent.setup();
    render(<QuoteBuilder customers={customers} createAction={vi.fn()} />);
    await pickCustomer(user, "Sin unidades");
    expect(screen.queryByRole("combobox", { name: "Unidad guardada" })).not.toBeInTheDocument();
  });
});
