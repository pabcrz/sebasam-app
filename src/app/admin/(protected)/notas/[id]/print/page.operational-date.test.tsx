import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getWorkOrderByIdMock = vi.hoisted(() => vi.fn());
const getPaymentSettingsMock = vi.hoisted(() => vi.fn());
const publicQuoteShellMock = vi.hoisted(() => vi.fn(({ date }: { date: Date }) => <div data-testid="public-note-date">{date.toISOString()}</div>));

vi.mock("@/features/work-orders/queries", () => ({ getWorkOrderById: getWorkOrderByIdMock }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings: getPaymentSettingsMock }));
vi.mock("@/features/public-quotes/components/public-quote-shell", () => ({ PublicQuoteShell: publicQuoteShellMock }));
vi.mock("@/features/public-quotes/components/shared-quote-view", () => ({ SharedQuoteView: () => null }));
vi.mock("./print-controls", () => ({ PrintControls: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

import WorkOrderPrintPage from "./page";

describe("WorkOrderPrintPage operational date", () => {
  it("passes the quote operational date to the note print shell", async () => {
    const operationalDate = new Date("2026-06-15T00:00:00.000Z");
    getWorkOrderByIdMock.mockResolvedValue({
      id: "work-order-1",
      status: "COMPLETED",
      quote: {
        id: "quote-1",
        number: "C-001",
        title: "Servicio",
        customer: { name: "Cliente" },
        vehicle: null,
        vehicleSnapshot: null,
        items: [],
        sections: [],
        operationalDate,
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
      },
    });
    getPaymentSettingsMock.mockResolvedValue({});

    render(await WorkOrderPrintPage({ params: Promise.resolve({ id: "work-order-1" }) }));

    expect(screen.getByTestId("public-note-date")).toHaveTextContent("2026-06-15T00:00:00.000Z");
    expect(publicQuoteShellMock).toHaveBeenCalledWith(expect.objectContaining({ date: operationalDate }), undefined);
  });
});
