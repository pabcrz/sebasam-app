import { PaymentStatus, QuoteStatus, WorkOrderStatus } from "@/generated/prisma/client";
import { describe, expect, it, vi } from "vitest";
import { getCustomerBalanceSummary, getCustomersBalanceSummaries } from "./domain";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

type Q = {
  customerId: string;
  status: QuoteStatus;
  woStatus: WorkOrderStatus | null;
  totalCents: number;
  agreement?: { status: string; base: number; tax: number; total: number };
};
type P = { id: string; customerId: string; amountCents: number; status: PaymentStatus; reversedAt: Date | null };
type A = { paymentId: string; amountCents: number; reversedAt: Date | null };

const ids = (f: unknown): string[] | null => {
  if (typeof f === "string") return [f];
  return (f as { in?: string[] })?.in ?? null;
};

/** In-memory client supporting both the per-customer and the batch query shapes, counting calls. */
function fakeClient(quotes: Q[], payments: P[], applications: A[]) {
  const calls = { count: 0 };
  const paidOf = (customerIds: string[] | null) =>
    payments.filter(
      (p) => (!customerIds || customerIds.includes(p.customerId)) && p.status === PaymentStatus.PAID && !p.reversedAt,
    );
  const client = {
    quote: {
      findMany: async (args: { where: { customerId: unknown } }) => {
        calls.count++;
        const wanted = ids(args.where.customerId)!;
        return quotes
          .filter(
            (q) =>
              wanted.includes(q.customerId) && q.status === QuoteStatus.APPROVED && q.woStatus === WorkOrderStatus.COMPLETED,
          )
          .map((q) => ({
            customerId: q.customerId,
            subtotalCents: q.totalCents,
            discountCents: 0,
            taxCents: 0,
            totalCents: q.totalCents,
            taxEnabled: false,
            items: [],
            settlementAgreement: q.agreement
              ? {
                  id: "ag",
                  status: q.agreement.status,
                  settlementBaseCents: q.agreement.base,
                  settlementTaxCents: q.agreement.tax,
                  settlementTotalCents: q.agreement.total,
                }
              : null,
          }));
      },
    },
    payment: {
      aggregate: async (args: { where: { customerId: unknown } }) => {
        calls.count++;
        const rows = paidOf(ids(args.where.customerId));
        return { _sum: { amountCents: rows.length ? rows.reduce((t, p) => t + p.amountCents, 0) : null } };
      },
      groupBy: async (args: { where: { customerId: unknown } }) => {
        calls.count++;
        const rows = paidOf(ids(args.where.customerId));
        const byCustomer = new Map<string, number>();
        for (const p of rows) byCustomer.set(p.customerId, (byCustomer.get(p.customerId) ?? 0) + p.amountCents);
        return [...byCustomer].map(([customerId, amountCents]) => ({ customerId, _sum: { amountCents } }));
      },
    },
    paymentApplication: {
      aggregate: async (args: { where: { payment: { customerId: unknown } } }) => {
        calls.count++;
        const paid = new Set(paidOf(ids(args.where.payment.customerId)).map((p) => p.id));
        const rows = applications.filter((a) => paid.has(a.paymentId) && !a.reversedAt);
        return { _sum: { amountCents: rows.length ? rows.reduce((t, a) => t + a.amountCents, 0) : null } };
      },
      findMany: async (args: { where: { payment: { customerId: unknown } } }) => {
        calls.count++;
        const paid = paidOf(ids(args.where.payment.customerId));
        return applications
          .filter((a) => !a.reversedAt)
          .flatMap((a) => {
            const p = paid.find((x) => x.id === a.paymentId);
            return p ? [{ amountCents: a.amountCents, payment: { customerId: p.customerId } }] : [];
          });
      },
    },
  };
  return { client: client as unknown as Parameters<typeof getCustomerBalanceSummary>[0], calls };
}

const done = { status: QuoteStatus.APPROVED, woStatus: WorkOrderStatus.COMPLETED };
const reversed = new Date("2026-01-01");

const quotes: Q[] = [
  { customerId: "c-pay", ...done, totalCents: 10_000 },
  { customerId: "c-pay", ...done, totalCents: 5_000 },
  { customerId: "c-pay", status: QuoteStatus.APPROVED, woStatus: WorkOrderStatus.IN_PROGRESS, totalCents: 99_000 },
  { customerId: "c-agree", ...done, totalCents: 20_000, agreement: { status: "ACTIVE", base: 15_000, tax: 0, total: 15_000 } },
  { customerId: "c-agree", ...done, totalCents: 8_000, agreement: { status: "CANCELLED", base: 1, tax: 0, total: 1 } },
  { customerId: "c-rev", ...done, totalCents: 7_000 },
  { customerId: "c-credit", ...done, totalCents: 1_000 },
];
const payments: P[] = [
  { id: "p1", customerId: "c-pay", amountCents: 9_000, status: PaymentStatus.PAID, reversedAt: null },
  { id: "p2", customerId: "c-pay", amountCents: 500, status: PaymentStatus.PENDING, reversedAt: null },
  { id: "p3", customerId: "c-agree", amountCents: 12_000, status: PaymentStatus.PAID, reversedAt: null },
  { id: "p4", customerId: "c-rev", amountCents: 7_000, status: PaymentStatus.PAID, reversedAt: reversed },
  { id: "p5", customerId: "c-credit", amountCents: 6_000, status: PaymentStatus.PAID, reversedAt: null },
];
const applications: A[] = [
  { paymentId: "p1", amountCents: 6_000, reversedAt: null },
  { paymentId: "p1", amountCents: 1_000, reversedAt: reversed },
  { paymentId: "p2", amountCents: 500, reversedAt: null },
  { paymentId: "p3", amountCents: 12_000, reversedAt: null },
  { paymentId: "p4", amountCents: 7_000, reversedAt: null },
  { paymentId: "p5", amountCents: 1_000, reversedAt: null },
];
const customers = ["c-pay", "c-agree", "c-rev", "c-credit", "c-empty"];

describe("getCustomersBalanceSummaries", () => {
  it("matches the per-customer rule for every customer", async () => {
    const { client } = fakeClient(quotes, payments, applications);
    const batch = await getCustomersBalanceSummaries(client, customers);

    for (const id of customers) {
      expect(batch.get(id), id).toEqual(await getCustomerBalanceSummary(client, id));
    }
    expect(batch.get("c-pay")).toMatchObject({ pendingBalanceCents: 9_000, availableCreditCents: 3_000 });
    expect(batch.get("c-agree")).toMatchObject({ totalContractedCents: 23_000, pendingBalanceCents: 11_000 });
    expect(batch.get("c-rev")).toMatchObject({ pendingBalanceCents: 7_000, availableCreditCents: 0 });
    expect(batch.get("c-credit")).toMatchObject({ pendingBalanceCents: 0, availableCreditCents: 5_000 });
    expect(batch.get("c-empty")).toMatchObject({ pendingBalanceCents: 0, availableCreditCents: 0 });
  });

  it("uses a fixed number of queries regardless of how many customers", async () => {
    const few = fakeClient(quotes, payments, applications);
    await getCustomersBalanceSummaries(few.client, ["c-pay"]);
    const many = fakeClient(quotes, payments, applications);
    await getCustomersBalanceSummaries(many.client, [...customers, ...Array.from({ length: 45 }, (_, i) => `x${i}`)]);

    expect(few.calls.count).toBe(3);
    expect(many.calls.count).toBe(3);
  });

  it("makes no queries for an empty list", async () => {
    const { client, calls } = fakeClient(quotes, payments, applications);
    expect((await getCustomersBalanceSummaries(client, [])).size).toBe(0);
    expect(calls.count).toBe(0);
  });
});
