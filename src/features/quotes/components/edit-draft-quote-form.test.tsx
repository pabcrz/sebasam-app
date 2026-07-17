import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

function renderForm(saveAction = vi.fn()) {
  return render(
    <EditDraftQuoteForm
      customers={[{ id: "customer-1", name: "Cliente" }]}
      saveAction={saveAction}
      initialData={initialData}
      quoteNumber="COT-122"
      searchCustomersAction={vi.fn().mockResolvedValue([])}
    />,
  );
}

describe("EditDraftQuoteForm", () => {
  it("shows the quote folio and renders the builder", () => {
    push.mockClear();
    renderForm();

    expect(screen.getByRole("heading", { name: "Editar cotización COT-122" })).toBeInTheDocument();
    expect(screen.queryByText(/en borrador/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("quote-builder-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar edición" })).toBeInTheDocument();
  });

  it("asks for confirmation before leaving", async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cerrar edición" }));

    expect(screen.getByText("¿Descartar los cambios?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates away when discarding changes", async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cerrar edición" }));
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));

    expect(push).toHaveBeenCalledWith("/admin/quotes");
  });

  it("stays on the page when continuing to edit", async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cerrar edición" }));
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("quote-builder-form")).toBeInTheDocument();
  });

  it("returns to the quote list with visible success state after saving", async () => {
    const user = userEvent.setup();
    const saveAction = vi.fn().mockResolvedValue({ success: true });
    push.mockClear();
    renderForm(saveAction);

    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Siguiente" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/quotes?updated=1"));
    expect(saveAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Guardar cambios" })).not.toBeDisabled();
  });
});
