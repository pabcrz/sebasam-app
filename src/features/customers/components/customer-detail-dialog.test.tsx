import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerDetailDialog } from "./customer-detail-dialog";

const customer = {
  id: "cust-1",
  name: "Constructora del Norte",
  email: "contacto@cdn.mx",
  phone: "55 1234 5678",
  status: "ACTIVE",
};

const detail = {
  customer: {
    ...customer,
    address: "Av. Siempre Viva 123",
    notes: "Cliente frecuente",
  },
  balance: {
    pendingBalanceCents: 7500,
    availableCreditCents: 5000,
  },
};

describe("CustomerDetailDialog", () => {
  it("opens from the customer card, loads the account, and restores focus after Escape or click-away", async () => {
    const user = userEvent.setup();
    let resolveDetail!: (value: typeof detail) => void;
    const getCustomerDetail = vi.fn()
      .mockImplementationOnce(() => new Promise<typeof detail>((resolve) => { resolveDetail = resolve; }))
      .mockResolvedValue(detail);
    render(<CustomerDetailDialog customer={customer} getCustomerDetail={getCustomerDetail} />);

    const trigger = screen.getByRole("button", { name: "Ver cuenta de Constructora del Norte" });
    await user.click(trigger);

    expect(screen.getByRole("dialog", { name: "Cuenta de Constructora del Norte" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Cargando cuenta del cliente...");
    resolveDetail(detail);
    expect(await screen.findByTestId("customer-detail-context")).toHaveTextContent("Av. Siempre Viva 123");
    expect(screen.getByText(/saldo pendiente:/i)).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
    expect(screen.getByText(/saldo a favor:/i)).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    const statementLink = screen.getByRole("link", { name: /ver estado de cuenta completo/i });
    expect(statementLink).toBeInTheDocument();
    expect(statementLink).toHaveAttribute("href", "/admin/customers/cust-1/estado-de-cuenta");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await screen.findByTestId("customer-detail-context");
    await user.click(document.querySelector("[data-dialog-overlay]")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("shows the balance summary and allows opening the edit dialog", async () => {
    const user = userEvent.setup();
    render(
      <CustomerDetailDialog
        customer={customer}
        getCustomerDetail={vi.fn().mockResolvedValue({
          ...detail,
          balance: {
            pendingBalanceCents: 0,
            availableCreditCents: 0,
          },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ver cuenta de Constructora del Norte" }));

    expect(await screen.findByText(/saldo pendiente:/i)).toBeInTheDocument();
    const amounts = screen.getAllByText("$0.00");
    expect(amounts.length).toBeGreaterThanOrEqual(1);
    const editButton = screen.getByRole("button", { name: "Editar datos" });
    expect(editButton).toBeInTheDocument();
    await user.click(editButton);
    expect(await screen.findByRole("dialog", { name: "Editar cliente" })).toBeInTheDocument();
  });

  it("announces a loading failure and allows retrying", async () => {
    const user = userEvent.setup();
    const getCustomerDetail = vi.fn().mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce(detail);
    render(<CustomerDetailDialog customer={customer} getCustomerDetail={getCustomerDetail} />);

    await user.click(screen.getByRole("button", { name: "Ver cuenta de Constructora del Norte" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar la cuenta del cliente.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByTestId("customer-detail-context")).toBeInTheDocument();
    expect(getCustomerDetail).toHaveBeenCalledTimes(2);
  });
});
