import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewQuoteForm } from "./new-quote-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function renderForm() {
  return render(
    <NewQuoteForm
      customers={[{ id: "customer-1", name: "Cliente" }]}
      createAction={vi.fn()}
      searchCustomersAction={vi.fn().mockResolvedValue([])}
    />,
  );
}

describe("NewQuoteForm", () => {
  it("renders the title and the quote builder", () => {
    push.mockClear();
    renderForm();

    expect(screen.getByRole("heading", { name: "Crear cotización" })).toBeInTheDocument();
    expect(screen.getByTestId("quote-builder-form")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
  });

  it("asks for confirmation before leaving", async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));

    expect(screen.getByText("¿Descartar la cotización?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates away when discarding changes", async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));

    expect(push).toHaveBeenCalledWith("/admin/quotes");
  });

  it("stays on the page when continuing to edit", async () => {
    const user = userEvent.setup();
    push.mockClear();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));

    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("quote-builder-form")).toBeInTheDocument();
  });
});
