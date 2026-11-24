import { beforeEach, describe, expect, it, vi } from "vitest";

const listMock = vi.hoisted(() => vi.fn());
vi.mock("@/features/balance/expenses/queries", () => ({ listExpensesForMonth: listMock }));

import { GET } from "./route";

describe("GET /admin/balance/gastos.csv", () => {
  beforeEach(() => vi.clearAllMocks());

  it("downloads the month's expenses as a CSV file", async () => {
    listMock.mockResolvedValue({ period: { month: "2026-11" }, expenses: [] });
    const response = await GET(new Request("http://x/admin/balance/gastos.csv?month=2026-11"));

    expect(listMock).toHaveBeenCalledWith("2026-11");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="gastos-2026-11.csv"');
    expect(await response.text()).toContain("Fecha,Categoría");
  });

  it("answers 403 and exports nothing for a user who cannot register expenses", async () => {
    listMock.mockRejectedValue(new Error("forbidden"));
    const response = await GET(new Request("http://x/admin/balance/gastos.csv"));
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("Fecha");
  });
});
