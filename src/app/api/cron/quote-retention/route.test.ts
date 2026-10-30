import { afterEach, describe, expect, it, vi } from "vitest";

const processQuoteRetentionMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/quotes/retention", () => ({ processQuoteRetention: processQuoteRetentionMock }));

import { GET } from "./route";

describe("GET /api/cron/quote-retention", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
    vi.clearAllMocks();
  });

  it("fails closed when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;

    const response = await GET(new Request("http://localhost/api/cron/quote-retention"));

    expect(response.status).toBe(401);
    expect(processQuoteRetentionMock).not.toHaveBeenCalled();
  });

  it("rejects requests without the configured bearer secret", async () => {
    process.env.CRON_SECRET = "configured-test-secret";

    const response = await GET(new Request("http://localhost/api/cron/quote-retention", {
      headers: { authorization: "Bearer wrong-secret" },
    }));

    expect(response.status).toBe(401);
    expect(processQuoteRetentionMock).not.toHaveBeenCalled();
  });

  it("runs retention only for an authenticated request", async () => {
    process.env.CRON_SECRET = "configured-test-secret";
    processQuoteRetentionMock.mockResolvedValue({ archived: 2, trashed: 1, purged: 0, protected: 1 });

    const response = await GET(new Request("http://localhost/api/cron/quote-retention", {
      headers: { authorization: "Bearer configured-test-secret" },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ archived: 2, trashed: 1, purged: 0, protected: 1 });
    expect(processQuoteRetentionMock).toHaveBeenCalledOnce();
  });
});
