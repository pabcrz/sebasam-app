import type React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getWorkOrderByIdMock = vi.hoisted(() => vi.fn());
const listActiveWorkersMock = vi.hoisted(() => vi.fn());
const listCustomersMock = vi.hoisted(() => vi.fn());
const notFoundMock = vi.hoisted(() => vi.fn());

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({ notFound: notFoundMock }));
vi.mock("@/features/work-orders/queries", () => ({ getWorkOrderById: getWorkOrderByIdMock }));
vi.mock("@/features/workers/queries", () => ({ listActiveWorkers: listActiveWorkersMock }));
vi.mock("@/features/customers/queries", () => ({ listCustomers: listCustomersMock }));
vi.mock("@/features/customers/actions", () => ({ searchCustomersForQuote: vi.fn() }));
vi.mock("@/features/quotes/actions", () => ({ updateDraftQuoteFromWorkspace: vi.fn() }));
vi.mock("@/features/work-orders/actions", () => ({
  createAndAssignWorkOrderAction: vi.fn(),
  completeWorkOrderAction: vi.fn(),
  rollbackWorkOrderAction: vi.fn(),
}));
vi.mock("@/features/quotes/components/quote-builder-dialog", () => ({ QuoteBuilderDialog: () => <div /> }));
vi.mock("@/features/work-orders/components/work-order-operations-dialog", () => ({ WorkOrderOperationsDialog: () => <div /> }));

import WorkOrderDetailPage from "./page";

describe("WorkOrderDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listActiveWorkersMock.mockResolvedValue([]);
    listCustomersMock.mockResolvedValue([]);
  });

  it("keeps non-completed detail-page printing on the quote route", async () => {
    getWorkOrderByIdMock.mockResolvedValue({
      id: "wo-detail-1",
      number: "OT-001",
      status: "ASSIGNED",
      isSpecial: true,
      assignments: [],
      quote: {
        id: "quote-detail-1",
        number: "COT-001",
        status: "APPROVED",
        customer: { name: "Cliente de prueba" },
        vehicle: null,
        totalCents: 12500,
        items: [],
        sections: [],
      },
    });

    render(await WorkOrderDetailPage({ params: Promise.resolve({ id: "wo-detail-1" }) }));

    const print = screen.getByRole("link", { name: /imprimir orden/i });
    expect(print).toHaveAttribute(
      "href",
      "/admin/quotes/quote-detail-1/print?returnTo=/admin/work-orders",
    );
    expect(print.getAttribute("href")).not.toContain("/admin/notas/");
    expect(print).toHaveClass("min-h-11", "min-w-11", "!h-11", "!w-11", "sm:!h-9", "sm:!w-auto");
    expect(screen.getByText("Imprimir orden")).toHaveClass("sr-only", "sm:not-sr-only");
  });

  it("routes completed detail-page printing to the work-order note", async () => {
    getWorkOrderByIdMock.mockResolvedValue({
      id: "wo-detail-completed-1",
      number: "OT-002",
      status: "COMPLETED",
      isSpecial: true,
      assignments: [],
      quote: {
        id: "quote-detail-completed-1",
        number: "COT-002",
        status: "APPROVED",
        customer: { name: "Cliente de prueba" },
        vehicle: null,
        totalCents: 12500,
        items: [],
        sections: [],
      },
    });

    render(await WorkOrderDetailPage({ params: Promise.resolve({ id: "wo-detail-completed-1" }) }));

    const print = screen.getByRole("link", { name: /imprimir orden/i });
    expect(print).toHaveAttribute("href", "/admin/notas/wo-detail-completed-1/print?returnTo=/admin/notas");
    expect(print.getAttribute("href")).not.toContain("/admin/quotes/");
  });
});
