import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditDraftQuoteForm } from "./edit-draft-quote-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const initialData = {
  customerId: "customer-1",
  vehicle: { plate: "", brand: "", model: "", year: "" },
  title: "Servicio",
  description: "",
  administrative: false,
  taxEnabled: true,
  items: [{ type: "LABOR" as const, description: "Trabajo", quantity: "1", unitPrice: "100" }],
};

describe("EditDraftQuoteForm", () => {
  it("shows the quote folio and cancels without saving", async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn();
    push.mockClear();

    render(
      <EditDraftQuoteForm
        customers={[{ id: "customer-1", name: "Cliente" }]}
        saveAction={saveAction}
        initialData={initialData}
        quoteNumber="COT-122"
        searchCustomersAction={vi.fn().mockResolvedValue([])}
      />,
    );

    expect(screen.getByRole("heading", { name: "Editar cotización COT-122" })).toBeInTheDocument();
    expect(screen.queryByText(/en borrador/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(push).toHaveBeenCalledWith("/admin/quotes");
    expect(saveAction).not.toHaveBeenCalled();
  });
});
