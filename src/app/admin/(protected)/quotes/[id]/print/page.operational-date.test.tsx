import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const getQuoteByIdMock = vi.hoisted(() => vi.fn());
const getPaymentSettingsMock = vi.hoisted(() => vi.fn());
const publicQuoteShellMock = vi.hoisted(() => vi.fn(({ date }: { date: Date }) => <div data-testid="public-quote-date">{date.toISOString()}</div>));

vi.mock("@/features/quotes/queries", () => ({ getQuoteById: getQuoteByIdMock }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings: getPaymentSettingsMock }));
vi.mock("@/features/public-quotes/components/public-quote-shell", () => ({ PublicQuoteShell: publicQuoteShellMock }));
vi.mock("@/features/public-quotes/components/shared-quote-view", () => ({ SharedQuoteView: () => null }));
vi.mock("@/features/quotes/components/print-controls", () => ({ PrintControls: () => null }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useSearchParams: () => new URLSearchParams() }));

import QuotePrintPage from "./page";

describe("QuotePrintPage operational date", () => {
  it("passes the operational date, not the audit creation timestamp, to the print shell", async () => {
    const operationalDate = new Date("2026-06-15T00:00:00.000Z");
    getQuoteByIdMock.mockResolvedValue({
      id: "quote-1",
      number: "C-001",
      title: "Servicio",
      customer: { name: "Cliente" },
      vehicle: null,
      vehicleSnapshot: null,
      items: [],
      sections: [],
      workOrder: null,
      operationalDate,
      createdAt: new Date("2026-07-01T12:00:00.000Z"),
    });
    getPaymentSettingsMock.mockResolvedValue({});

    render(await QuotePrintPage({ params: Promise.resolve({ id: "quote-1" }) }));

    expect(screen.getByTestId("public-quote-date")).toHaveTextContent("2026-06-15T00:00:00.000Z");
    expect(publicQuoteShellMock).toHaveBeenCalledWith(expect.objectContaining({ date: operationalDate }), undefined);
  });
});
