import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const getBalanceSnapshotMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    generatedAt: new Date("2026-08-19T14:00:00.000Z"),
    collected: {
      week: { period: "week", rangeLabel: "semana", totalCents: 0, paymentsCount: 0 },
      month: { period: "month", rangeLabel: "mes", totalCents: 0, paymentsCount: 0 },
      year: { period: "year", rangeLabel: "año", totalCents: 0, paymentsCount: 0 },
    },
    receivables: { totalCents: 0, overdueCents: 0, customers: [] },
  }),
);
vi.mock("@/features/balance/queries", () => ({ getBalanceSnapshot: getBalanceSnapshotMock }));

import BalancePage from "./page";

describe("BalancePage", () => {
  it("renders the balance with its two sections", async () => {
    render(await BalancePage());

    expect(screen.getByRole("heading", { level: 1, name: "Balance" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cobrado" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Por cobrar" })).toBeInTheDocument();
    expect(getBalanceSnapshotMock).toHaveBeenCalledTimes(1);
  });
});
