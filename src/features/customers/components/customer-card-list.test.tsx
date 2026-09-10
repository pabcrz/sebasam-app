import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CustomerCardList, CustomerCardListItem } from "./customer-card-list";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function buildCustomer(overrides: Partial<CustomerCardListItem> = {}): CustomerCardListItem {
  return {
    id: "cust-1",
    name: "Constructora del Norte",
    email: "contacto@cdn.mx",
    phone: "55 1234 5678",
    status: "ACTIVE",
    ...overrides,
  };
}

describe("CustomerCardList contact display", () => {
  const getCustomerDetail = vi.fn();

  it("opens the customer account from the body while keeping actions menu outside the detail trigger", async () => {
    const user = userEvent.setup();
    getCustomerDetail.mockResolvedValue(null);
    render(<CustomerCardList customers={[buildCustomer()]} getCustomerDetail={getCustomerDetail} />);

    const detailTrigger = screen.getByRole("button", { name: "Ver cuenta de Constructora del Norte" });
    const menuTrigger = screen.getByRole("button", { name: /más acciones de constructora del norte/i });

    expect(detailTrigger).toBeInTheDocument();
    expect(menuTrigger).toBeInTheDocument();
    expect(detailTrigger).not.toContainElement(menuTrigger);

    await user.click(detailTrigger);

    expect(getCustomerDetail).toHaveBeenCalledWith("cust-1");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("navigates to canonical statement page when selecting Ver estado de cuenta from menu", async () => {
    const user = userEvent.setup();
    render(<CustomerCardList customers={[buildCustomer()]} getCustomerDetail={getCustomerDetail} />);

    const menuTrigger = screen.getByRole("button", { name: /más acciones de constructora del norte/i });
    await user.click(menuTrigger);

    const statementAction = screen.getByRole("button", { name: /ver estado de cuenta/i });
    await user.click(statementAction);

    expect(pushMock).toHaveBeenCalledWith("/admin/customers/cust-1/estado-de-cuenta");
  });

  it("renders email and phone when both exist", () => {
    render(<CustomerCardList customers={[buildCustomer()]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("contacto@cdn.mx")).toBeInTheDocument();
    expect(screen.getByText("55 1234 5678")).toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
  });

  it("renders only email when phone is missing", () => {
    render(<CustomerCardList customers={[buildCustomer({ phone: null })]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("contacto@cdn.mx")).toBeInTheDocument();
    expect(screen.queryByText("55 1234 5678")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
  });

  it("renders only phone when email is missing", () => {
    render(<CustomerCardList customers={[buildCustomer({ email: null })]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("55 1234 5678")).toBeInTheDocument();
    expect(screen.queryByText("contacto@cdn.mx")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin contacto")).not.toBeInTheDocument();
  });

  it("renders Sin contacto when neither email nor phone exist", () => {
    render(<CustomerCardList customers={[buildCustomer({ email: null, phone: null })]} getCustomerDetail={getCustomerDetail} />);

    expect(screen.getByText("Sin contacto")).toBeInTheDocument();
    expect(screen.queryByText("contacto@cdn.mx")).not.toBeInTheDocument();
    expect(screen.queryByText("55 1234 5678")).not.toBeInTheDocument();
  });
});

describe("CustomerCardList quick actions and multi-select", () => {
  const getCustomerDetail = vi.fn();
  const onDeleteSingle = vi.fn();
  const onDeleteBatch = vi.fn();
  const onUpdate = vi.fn();

  it("renders actions menu with edit and delete for each customer", async () => {
    const user = userEvent.setup();
    render(
      <CustomerCardList
        customers={[buildCustomer()]}
        getCustomerDetail={getCustomerDetail}
        onDeleteCustomer={onDeleteSingle}
        onUpdateCustomer={onUpdate}
      />,
    );

    const menuTrigger = screen.getByRole("button", { name: /más acciones de constructora del norte/i });
    expect(menuTrigger).toBeInTheDocument();

    await user.click(menuTrigger);
    expect(screen.getByRole("button", { name: /editar datos/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /eliminar cliente/i })).toBeEnabled();
  });

  it("shows disabled delete with inline reason when customer has history", async () => {
    const user = userEvent.setup();
    const customerWithQuotes = buildCustomer({
      _count: { quotes: 2, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
    });

    render(
      <CustomerCardList
        customers={[customerWithQuotes]}
        getCustomerDetail={getCustomerDetail}
      />,
    );

    await user.click(screen.getByRole("button", { name: /más acciones/i }));
    const deleteBtn = screen.getByRole("button", { name: /eliminar cliente/i });
    expect(deleteBtn).toBeDisabled();
    expect(screen.getByText(/tiene 2 cotizaciones asociadas/i)).toBeInTheDocument();
  });

  it("supports entering selection mode, selecting eligible cards, and canceling", async () => {
    const user = userEvent.setup();
    const cust1 = buildCustomer({ id: "c-1", name: "Cliente 1" });
    const cust2 = buildCustomer({
      id: "c-2",
      name: "Cliente 2",
      _count: { quotes: 1, payments: 0, paymentRequests: 0, ledgerEntries: 0 },
    });

    render(
      <CustomerCardList
        customers={[cust1, cust2]}
        getCustomerDetail={getCustomerDetail}
        onDeleteBatch={onDeleteBatch}
      />,
    );

    // Enter selection mode
    const selectBtn = screen.getByRole("button", { name: /^seleccionar$/i });
    await user.click(selectBtn);

    // Checkboxes should appear
    const checkbox1 = screen.getByRole("checkbox", { name: /seleccionar cliente 1/i });
    const checkbox2 = screen.getByRole("checkbox", { name: /seleccionar cliente 2/i });

    expect(checkbox1).toBeEnabled();
    expect(checkbox2).toBeDisabled(); // has quotes, not deletable

    // Select cust1
    await user.click(checkbox1);
    expect(checkbox1).toBeChecked();
    expect(screen.getByText(/1 seleccionado/i)).toBeInTheDocument();

    // Cancel selection mode
    await user.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("triggers batch delete confirmation and executes deletion on confirm", async () => {
    const user = userEvent.setup();
    onDeleteBatch.mockResolvedValue({ success: true, deletedCount: 2 });
    const cust1 = buildCustomer({ id: "c-1", name: "Cliente 1" });
    const cust2 = buildCustomer({ id: "c-2", name: "Cliente 2" });

    render(
      <CustomerCardList
        customers={[cust1, cust2]}
        getCustomerDetail={getCustomerDetail}
        onDeleteBatch={onDeleteBatch}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^seleccionar$/i }));
    await user.click(screen.getByRole("button", { name: /seleccionar todos/i }));

    expect(screen.getByText(/2 seleccionados/i)).toBeInTheDocument();

    const deleteBatchBtn = screen.getByRole("button", { name: /eliminar seleccionados/i });
    await user.click(deleteBatchBtn);

    // Confirmation dialog appears
    expect(screen.getByRole("dialog", { name: /eliminar clientes/i })).toBeInTheDocument();

    // Confirm deletion
    await user.click(screen.getByRole("button", { name: /confirmar eliminación/i }));

    expect(onDeleteBatch).toHaveBeenCalledWith(["c-1", "c-2"]);
  });
});
