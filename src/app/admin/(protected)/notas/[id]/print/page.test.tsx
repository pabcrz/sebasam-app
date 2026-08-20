import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(),
}));

const { getCompletedWorkOrderById, getPaymentSettings } = vi.hoisted(() => ({
  getCompletedWorkOrderById: vi.fn(),
  getPaymentSettings: vi.fn(),
}));

vi.mock("@/features/work-orders/queries", () => ({ getCompletedWorkOrderById }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));
vi.mock("./print-button", () => ({ PrintButton: () => <button type="button">Imprimir</button> }));

import WorkOrderPrintPage from "./page";

describe("WorkOrderPrintPage", () => {
  it("identifies legacy special work as Taller in the printed note", async () => {
    getCompletedWorkOrderById.mockResolvedValue({
      number: "T-001",
      isSpecial: true,
      specialAssigneeName: "Nombre heredado",
      completedAt: new Date("2026-08-14T12:00:00Z"),
      assignments: [],
      quote: {
        number: "C-001",
        title: "Servicio general",
        customer: { name: "Cliente Demo", phone: null, email: null },
        vehicle: null,
        items: [],
        subtotalCents: 0,
        discountCents: 0,
        taxEnabled: false,
        taxCents: 0,
        totalCents: 0,
        operationalDate: new Date("2026-08-14T00:00:00.000Z"),
      },
    });
    getPaymentSettings.mockResolvedValue({
      name: "SEBASAM",
      fullName: "SEBASAM Taller",
      address: "Dirección",
      contactPhone: "5555555555",
      contactWhatsapp: "5555555555",
    });

    render(await WorkOrderPrintPage({ params: Promise.resolve({ id: "wo-1" }) }));

    expect(screen.getAllByText(/Taller/)).toHaveLength(2);
    expect(screen.queryByText("Nombre heredado")).not.toBeInTheDocument();
  });
});
