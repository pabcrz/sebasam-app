import { describe, expect, it, vi, beforeEach } from "vitest";
import { QuoteDecisionOrigin, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  acceptSharedQuote,
  declineSharedQuote,
  authorizeQuote,
  getSharedQuoteByToken,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
  SharedQuoteNotFoundError,
  QuoteDecisionError,
  createSharedQuoteSlug,
  getOrCreateSharedQuoteForQuote,
  createSharedQuoteForQuote,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createSharedQuoteToken,
} from "./domain";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), sharedQuote: { findUnique: vi.fn() } } }));

type MockTransaction = {
  quote: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  quoteDecision: { create: ReturnType<typeof vi.fn> };
  sharedQuote: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
};

function mockTx(): MockTransaction {
  const tx: MockTransaction = {
    quote: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    quoteDecision: {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "d-1", ...args.data, createdAt: new Date() }),
      ),
    },
    sharedQuote: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "sq-new", ...args.data, createdAt: new Date() }),
      ),
    },
  };
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: (tx: MockTransaction) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

function mockSharedQuote(overrides: Record<string, unknown> = {}) {
  const mock = {
    id: "sq-1",
    token: "token-valid",
    quoteId: "q-1",
    expiresAt: new Date(Date.now() + ONE_DAY_MS),
    revokedAt: null,
    createdAt: new Date(),
    quote: {
      id: "q-1",
      status: QuoteStatus.SENT,
    },
    ...overrides,
  };

  const sharedQuoteModule = prisma.sharedQuote as unknown as { findUnique: ReturnType<typeof vi.fn> };
  sharedQuoteModule.findUnique.mockResolvedValue(mock);
  return mock;
}

function stubTxSharedQuote(tx: MockTransaction, overrides: Record<string, unknown> = {}) {
  tx.sharedQuote.findFirst.mockResolvedValue({
    id: "sq-1",
    token: "token-valid",
    quoteId: "q-1",
    quote: { id: "q-1", status: QuoteStatus.SENT, ...overrides },
    ...overrides,
  });
}

describe("getSharedQuoteByToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the shared quote when token is valid", async () => {
    mockSharedQuote();
    const result = await getSharedQuoteByToken("token-valid");

    expect(result.id).toBe("sq-1");
    expect(result.quote.status).toBe(QuoteStatus.SENT);
  });

  it("looks up shared quotes by the stored short slug", async () => {
    const slug = "C-0726-03-a1B2c3D4";
    mockSharedQuote({ token: slug });

    const result = await getSharedQuoteByToken(slug);

    expect(result.token).toBe(slug);
    expect(prisma.sharedQuote.findUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { token: slug },
    }));
  });

  it("throws SharedQuoteNotFoundError when token doesn't exist", async () => {
    const sharedQuoteModule = prisma.sharedQuote as unknown as { findUnique: ReturnType<typeof vi.fn> };
    sharedQuoteModule.findUnique.mockResolvedValue(null);

    await expect(getSharedQuoteByToken("token-unknown")).rejects.toThrow(SharedQuoteNotFoundError);
  });

  it("throws SharedQuoteExpiredError when token has expired", async () => {
    mockSharedQuote({ expiresAt: new Date(Date.now() - ONE_DAY_MS) });

    await expect(getSharedQuoteByToken("token-valid")).rejects.toThrow(SharedQuoteExpiredError);
  });

  it("throws SharedQuoteRevokedError when token has been revoked", async () => {
    mockSharedQuote({ revokedAt: new Date() });

    await expect(getSharedQuoteByToken("token-valid")).rejects.toThrow(SharedQuoteRevokedError);
  });
});

describe("acceptSharedQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates quote status to APPROVED and creates a CUSTOMER decision", async () => {
    mockSharedQuote();
    const tx = mockTx();
    stubTxSharedQuote(tx);

    const result = await acceptSharedQuote("token-valid");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1", status: QuoteStatus.SENT },
      data: { status: QuoteStatus.APPROVED, approvedAt: expect.any(Date) },
    });
    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-1",
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.CUSTOMER,
      },
    });
    expect(result.status).toBe(QuoteStatus.APPROVED);
    expect(result.origin).toBe(QuoteDecisionOrigin.CUSTOMER);
  });

  it("only uses quote and quoteDecision inside the transaction — no work order or payment request", async () => {
    mockSharedQuote();
    const tx = mockTx();
    stubTxSharedQuote(tx);

    await acceptSharedQuote("token-valid");

    // Only quote.updateMany + quoteDecision.create were invoked inside the tx.
    // The mock has no workOrder / paymentRequest methods at all,
    // so this test confirms those domains are not reached from this path.
    expect(tx.quote.updateMany).toHaveBeenCalledTimes(1);
    expect(tx.quoteDecision.create).toHaveBeenCalledTimes(1);
    expect(tx.quoteDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ origin: QuoteDecisionOrigin.CUSTOMER }) }),
    );
  });

  it("throws QuoteDecisionError when quote status is not SENT", async () => {
    mockSharedQuote({ quote: { id: "q-1", status: QuoteStatus.APPROVED } });
    const tx = mockTx();
    stubTxSharedQuote(tx, { status: QuoteStatus.APPROVED });
    tx.quote.updateMany.mockResolvedValue({ count: 0 });

    await expect(acceptSharedQuote("token-valid")).rejects.toThrow(QuoteDecisionError);
    await expect(acceptSharedQuote("token-valid")).rejects.toThrow("Solo se puede aceptar");
  });

  it("expired token cannot be used to accept", async () => {
    const tx = mockTx();
    tx.sharedQuote.findUnique.mockResolvedValue({
      id: "sq-1",
      token: "token-expired",
      quoteId: "q-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - ONE_DAY_MS),
    });

    await expect(acceptSharedQuote("token-expired")).rejects.toThrow(SharedQuoteExpiredError);
  });

  it("revoked token cannot be used to accept", async () => {
    const tx = mockTx();
    tx.sharedQuote.findUnique.mockResolvedValue({
      id: "sq-1",
      token: "token-revoked",
      quoteId: "q-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + ONE_DAY_MS),
    });

    await expect(acceptSharedQuote("token-revoked")).rejects.toThrow(SharedQuoteRevokedError);
  });
});

describe("declineSharedQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates quote status to REJECTED and creates a CUSTOMER decision", async () => {
    mockSharedQuote();
    const tx = mockTx();
    stubTxSharedQuote(tx);

    const result = await declineSharedQuote("token-valid");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1", status: QuoteStatus.SENT },
      data: { status: QuoteStatus.REJECTED },
    });
    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-1",
        status: QuoteStatus.REJECTED,
        origin: QuoteDecisionOrigin.CUSTOMER,
      },
    });
    expect(result.status).toBe(QuoteStatus.REJECTED);
    expect(result.origin).toBe(QuoteDecisionOrigin.CUSTOMER);
  });

  it("throws QuoteDecisionError when quote status is not SENT", async () => {
    mockSharedQuote({ quote: { id: "q-1", status: QuoteStatus.REJECTED } });
    const tx = mockTx();
    stubTxSharedQuote(tx, { status: QuoteStatus.REJECTED });
    tx.quote.updateMany.mockResolvedValue({ count: 0 });

    await expect(declineSharedQuote("token-valid")).rejects.toThrow(QuoteDecisionError);
  });

  it("expired token cannot be used to decline", async () => {
    const tx = mockTx();
    tx.sharedQuote.findUnique.mockResolvedValue({
      id: "sq-1",
      token: "token-expired",
      quoteId: "q-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() - ONE_DAY_MS),
    });

    await expect(declineSharedQuote("token-expired")).rejects.toThrow(SharedQuoteExpiredError);
  });

  it("revoked token cannot be used to decline", async () => {
    const tx = mockTx();
    tx.sharedQuote.findUnique.mockResolvedValue({
      id: "sq-1",
      token: "token-revoked",
      quoteId: "q-1",
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + ONE_DAY_MS),
    });

    await expect(declineSharedQuote("token-revoked")).rejects.toThrow(SharedQuoteRevokedError);
  });
});

describe("authorizeQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates quote to APPROVED and creates an ADMIN decision with note and actorId", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({ id: "q-1", status: QuoteStatus.SENT });

    const result = await authorizeQuote("q-1", "Cliente confirmó por WhatsApp", "actor-1");

    expect(tx.quote.findUnique).toHaveBeenCalledWith({ where: { id: "q-1" } });
    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1", status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.APPROVED, approvedAt: expect.any(Date) },
    });

    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-1",
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.ADMIN,
        actorId: "actor-1",
        note: "Cliente confirmó por WhatsApp",
      },
    });
    expect(result.status).toBe(QuoteStatus.APPROVED);
    expect(result.origin).toBe(QuoteDecisionOrigin.ADMIN);
    expect(result.note).toBe("Cliente confirmó por WhatsApp");
    expect(result.actorId).toBe("actor-1");
  });

  it("decision audit captures status, origin, actor, note, and date", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({ id: "q-1", status: QuoteStatus.SENT });

    const result = await authorizeQuote("q-1", "Nota de auditoría", "actor-audit");

    // Verify the decision record includes all required audit fields
    const decisionCall = tx.quoteDecision.create.mock.calls[0][0].data;
    expect(decisionCall.status).toBe(QuoteStatus.APPROVED); // resulting status
    expect(decisionCall.origin).toBe(QuoteDecisionOrigin.ADMIN); // origin
    expect(decisionCall.actorId).toBe("actor-audit"); // actor
    expect(decisionCall.note).toBe("Nota de auditoría"); // note/channel

    // Verify the returned decision object carries the date
    expect(result.status).toBe(QuoteStatus.APPROVED);
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("throws QuoteDecisionError when note is empty or whitespace-only", async () => {
    await expect(authorizeQuote("q-1", "")).rejects.toThrow(QuoteDecisionError);
    await expect(authorizeQuote("q-1", "   ")).rejects.toThrow(QuoteDecisionError);
    await expect(authorizeQuote("q-1", "   ")).rejects.toThrow("La nota de autorización es obligatoria.");
  });

  it("throws QuoteDecisionError when quote is not found", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue(null);

    await expect(authorizeQuote("q-1", "Nota")).rejects.toThrow(QuoteDecisionError);
    await expect(authorizeQuote("q-1", "Nota")).rejects.toThrow("Cotización no encontrada.");
  });

  it("throws QuoteDecisionError when quote status is not SENT", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({ id: "q-1", status: QuoteStatus.DRAFT });
    tx.quote.updateMany.mockResolvedValue({ count: 0 });

    await expect(authorizeQuote("q-1", "Nota")).rejects.toThrow(QuoteDecisionError);
  });

  it("allows actorId to be undefined", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({ id: "q-1", status: QuoteStatus.SENT });

    const result = await authorizeQuote("q-1", "Nota sin actor");

    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ actorId: null }),
    });
    expect(result.actorId).toBeNull();
  });
});

describe("createSharedQuoteSlug", () => {
  it("generates a slug with format {quoteNumber}-{8 base62 chars}", () => {
    const slug = createSharedQuoteSlug("C-0726-03");

    expect(slug).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
  });
});

describe("getOrCreateSharedQuoteForQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing active shared quote unchanged", async () => {
    const tx = mockTx();
    const existingToken = "C-0726-03-a1B2c3D4";
    tx.sharedQuote.findFirst.mockResolvedValue({
      id: "sq-existing",
      token: existingToken,
      quoteId: "q-1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + ONE_DAY_MS),
      createdAt: new Date(),
    });

    const result = await getOrCreateSharedQuoteForQuote("q-1");

    expect(result.id).toBe("sq-existing");
    expect(result.token).toBe(existingToken);
    // Must not call create
    expect(tx.sharedQuote.create).not.toHaveBeenCalled();
  });

  it("creates a new shared quote with slug format when no active exists", async () => {
    const tx = mockTx();
    // No existing active
    tx.sharedQuote.findFirst.mockResolvedValue(null);
    // Quote is found and valid
    tx.quote.findUnique.mockResolvedValue({
      id: "q-1",
      number: "C-0726-03",
      status: QuoteStatus.SENT,
      items: [{ description: "Repair", quantity: { toString: () => "1" }, unitPriceCents: 1000 }],
    });
    // No slug collision
    tx.sharedQuote.findUnique.mockResolvedValue(null);

    const result = await getOrCreateSharedQuoteForQuote("q-1");

    expect(result.token).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
    expect(tx.sharedQuote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          token: expect.stringMatching(/^C-0726-03-[0-9A-Za-z]{8}$/),
          quoteId: "q-1",
        }),
      }),
    );
  });

  it("retries slug generation on collision", async () => {
    const tx = mockTx();
    // No existing active
    tx.sharedQuote.findFirst.mockResolvedValue(null);
    // Quote is found and valid
    tx.quote.findUnique.mockResolvedValue({
      id: "q-1",
      number: "C-0726-03",
      status: QuoteStatus.SENT,
      items: [{ description: "Repair", quantity: { toString: () => "1" }, unitPriceCents: 1000 }],
    });
    // First slug collides, second is free
    tx.sharedQuote.findUnique
      .mockResolvedValueOnce({ id: "sq-collision" }) // first attempt → collision
      .mockResolvedValueOnce(null); // second attempt → free

    const result = await getOrCreateSharedQuoteForQuote("q-1");

    expect(result.token).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
    // findUnique called twice: one for collision, one for free slug
    expect(tx.sharedQuote.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe("createSharedQuoteForQuote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a shared quote with slug format", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "q-1",
      number: "C-0726-03",
      status: QuoteStatus.SENT,
      items: [{ description: "Repair", quantity: { toString: () => "1" }, unitPriceCents: 1000 }],
    });
    tx.sharedQuote.findUnique.mockResolvedValue(null);

    const result = await createSharedQuoteForQuote("q-1");

    expect(result.token).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
  });
});
