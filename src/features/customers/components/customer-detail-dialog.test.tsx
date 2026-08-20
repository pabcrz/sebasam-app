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
  statement: {
    totalContractedCents: 25000,
    totalPaidCents: 17500,
    pendingBalanceCents: 7500,
    movements: [
      {
        id: "ledger-1",
        createdAt: new Date("2026-08-01T10:00:00.000Z"),
        type: "CREDIT",
        amountCents: 5000,
        resultingBalanceCents: 20000,
        payment: { method: "CASH", quote: { id: "quote-1", number: "COT-001" } },
      },
    ],
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
    expect(screen.getByTestId("customer-account-statement")).toHaveTextContent("Total contratado$250.00");
    expect(screen.getByText("Cotización COT-001")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await screen.findByTestId("customer-detail-context");
    await user.click(document.querySelector("[data-dialog-overlay]")!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("shows the empty account state and keeps Edit as an explicit secondary action", async () => {
    const user = userEvent.setup();
    render(
      <CustomerDetailDialog
        customer={customer}
        getCustomerDetail={vi.fn().mockResolvedValue({
          ...detail,
          statement: {
            totalContractedCents: 0,
            totalPaidCents: 0,
            pendingBalanceCents: 0,
            movements: [],
          },
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Ver cuenta de Constructora del Norte" }));

    expect(await screen.findByText("Este cliente todavía no tiene movimientos financieros registrados.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar" })).toHaveAttribute("href", "/admin/customers/cust-1/edit");
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
