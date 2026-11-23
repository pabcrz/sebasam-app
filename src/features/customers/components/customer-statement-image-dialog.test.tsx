import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomerDetailedStatement } from "../customer-statement-queries";

const toPngMock = vi.hoisted(() => vi.fn());
vi.mock("html-to-image", () => ({ toPng: toPngMock }));

import { CustomerStatementImageDialog } from "./customer-statement-image-dialog";

const statement = {
  customer: { id: "c1", name: "Transportes del Norte", commercialName: null, legalName: null, email: null, phone: null, address: null, rfc: null },
  emissionDate: new Date("2026-08-15T18:00:00Z"),
  view: "pending",
  period: "month",
  anchor: "2026-08",
  rangeLabel: "Pendientes al 15 de agosto de 2026",
  availableCreditCents: 0,
  availableCreditAtCutoffCents: 0,
  summary: { initialBalanceCents: 0, periodChargesCents: 0, periodPaymentsCents: 0, finalBalanceCents: 0, overdueBalanceCents: 0 },
  notes: [],
  paymentActivity: [],
  business: { name: "SEBASAM", fullName: "SEBASAM completo", address: "Calle 1", contactPhone: "5550001122", contactWhatsapp: "", bankAccounts: [] },
} as unknown as CustomerDetailedStatement;

describe("CustomerStatementImageDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toPngMock.mockResolvedValue("data:image/png;base64,AAAA");
  });

  it("exports the document node that the dialog shows, with a customer-based file name", async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<CustomerStatementImageDialog statement={statement} open onOpenChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /descargar imagen/i }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    const node = toPngMock.mock.calls[0][0] as HTMLElement;
    expect(node.id).toBe("customer-statement-image-document");
    expect(node).toHaveTextContent("Estado de cuenta");
    const link = click.mock.instances[0] as unknown as HTMLAnchorElement;
    expect(link.download).toBe("TransportesdelNorte-EstadoDeCuenta-15082026.png");
    click.mockRestore();
  });

  it("tells the user when the image cannot be generated", async () => {
    const user = userEvent.setup();
    toPngMock.mockRejectedValue(new Error("boom"));
    render(<CustomerStatementImageDialog statement={statement} open onOpenChange={() => {}} />);

    await user.click(screen.getByRole("button", { name: /descargar imagen/i }));

    expect(await screen.findByRole("status")).toHaveTextContent("No se pudo generar la imagen");
  });
});
