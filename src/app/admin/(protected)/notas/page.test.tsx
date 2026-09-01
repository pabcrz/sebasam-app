import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
const listCompletedWorkOrders = vi.hoisted(() => vi.fn().mockResolvedValue({ workOrders: [], page: 1, hasNextPage: false }));
vi.mock("@/features/work-orders/queries", () => ({ listCompletedWorkOrders }));
vi.mock("@/features/workers/queries", () => ({ listActiveMasters: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/auth/session", () => ({ getCurrentProfile: vi.fn().mockResolvedValue(null), isAdminRole: vi.fn().mockReturnValue(false) }));
vi.mock("@/features/work-orders/components/notas-filters", () => ({ NotasFilters: () => null }));
vi.mock("@/features/work-orders/components/work-order-completed-list", () => ({ WorkOrderCompletedList: () => null }));
vi.mock("@/features/payments/actions", () => ({ recordPaymentAction: vi.fn() }));
vi.mock("@/features/work-orders/actions", () => ({ rollbackWorkOrderAction: vi.fn() }));
import NotasPage from "./page";
describe("NotasPage", () => {
  it("renders the workspace without a redundant page header card", async () => {
    render(await NotasPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByTestId("admin-page-header")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Trabajos completados" })).toBeInTheDocument();
  });
});