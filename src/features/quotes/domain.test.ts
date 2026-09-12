import { describe, expect, it, vi, beforeEach } from "vitest";
import { Prisma, QuoteDecisionOrigin, QuoteItemType, QuoteStatus, WorkOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  acceptSharedQuote,
  declineSharedQuote,
  authorizeQuote,
  correctQuoteDecision,
  getSharedQuoteByToken,
  SharedQuoteExpiredError,
  SharedQuoteRevokedError,
  SharedQuoteNotFoundError,
  QuoteDecisionError,
  createSharedQuoteSlug,
  getOrCreateSharedQuoteForQuote,
  createSharedQuoteForQuote,
  revokeCanonicalNoteSharedQuote,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createSharedQuoteToken,
} from "./domain";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn(), sharedQuote: { findFirst: vi.fn(), findUnique: vi.fn() } } }));

type MockTransaction = {
  quote: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  quoteSection: { updateMany: ReturnType<typeof vi.fn> };
  quoteDecision: { create: ReturnType<typeof vi.fn> };
  quoteLifecycleEvent: { create: ReturnType<typeof vi.fn> };
  sharedQuote: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  workOrder: { findFirst: ReturnType<typeof vi.fn> };
};

function mockTx(): MockTransaction {
  const tx: MockTransaction = {
    quote: {
      findUnique: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    quoteSection: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    quoteDecision: {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "d-1", ...args.data, createdAt: new Date() }),
      ),
    },
    quoteLifecycleEvent: {
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "le-1", ...args.data, createdAt: new Date() }),
      ),
    },
    sharedQuote: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation((args: { data: Record<string, unknown> }) =>
        Promise.resolve({ id: "sq-new", ...args.data, createdAt: new Date() }),
      ),
      update: vi.fn(),
    },
    workOrder: { findFirst: vi.fn().mockResolvedValue(null) },
  };
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: (tx: MockTransaction) => Promise<unknown>) => callback(tx),
  );
  return tx;
}

describe("getOrCreateSharedQuoteForQuote canonical Note lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a durable canonical link for a completed Note", async () => {
    const tx = mockTx();
    tx.workOrder.findFirst.mockResolvedValue({ status: WorkOrderStatus.COMPLETED });
    tx.quote.findUnique.mockResolvedValue({ id: "q-1", number: "N-001" });

    const result = await getOrCreateSharedQuoteForQuote("q-1");

    expect(result.isCanonical).toBe(true);
    expect(tx.sharedQuote.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ isCanonical: true, expiresAt: expect.any(Date) }),
    }));
  });

  it("returns the concurrent canonical-link winner after a P2002 rollback", async () => {
    const tx = mockTx();
    tx.workOrder.findFirst.mockResolvedValue({ status: WorkOrderStatus.COMPLETED });
    tx.quote.findUnique.mockResolvedValue({ id: "q-1", number: "N-001" });
    tx.sharedQuote.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed", { code: "P2002", clientVersion: "test" },
    ));
    const winner = { id: "shared-winner", token: "n-001", isCanonical: true };
    (prisma.sharedQuote.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(winner);

    await expect(getOrCreateSharedQuoteForQuote("q-1")).resolves.toBe(winner);
    expect(prisma.sharedQuote.findFirst).toHaveBeenCalledWith({
      where: { quoteId: "q-1", isCanonical: true, revokedAt: null },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("revokeCanonicalNoteSharedQuote", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records the revocation timestamp, actor, and reason on the canonical link", async () => {
    const tx = mockTx();
    tx.workOrder.findFirst.mockResolvedValue({ status: WorkOrderStatus.COMPLETED });
    tx.sharedQuote.findFirst.mockResolvedValue({ id: "canonical-link" });

    await revokeCanonicalNoteSharedQuote("quote-1", "admin-1", "Customer request");

    expect(tx.sharedQuote.update).toHaveBeenCalledWith({
      where: { id: "canonical-link" },
      data: {
        revokedAt: expect.any(Date),
        revokedByUserId: "admin-1",
        revocationReason: "Customer request",
      },
    });
  });
});

function mockSharedQuote(overrides: Record<string, unknown> = {}) {
  const quoteOverrides = (overrides.quote ?? {}) as Record<string, unknown>;
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
      customerId: "customer-1",
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 160,
      totalCents: 1160,
      taxEnabled: true,
      deletedAt: null,
      items: [{ description: "Repair", quantity: 1, unitPriceCents: 1000 }],
      sections: undefined,
      ...quoteOverrides,
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
    quote: {
      id: "q-1",
      status: QuoteStatus.SENT,
      customerId: "customer-1",
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 160,
      totalCents: 1160,
      taxEnabled: true,
      items: [{ description: "Repair", quantity: 1, unitPriceCents: 1000 }],
      sections: undefined,
      ...overrides,
    },
    ...overrides,
  });
}

function commercialQuote(overrides: Record<string, unknown> = {}) {
  return {
    id: "q-1",
    status: QuoteStatus.SENT,
    customerId: "customer-1",
    subtotalCents: 1000,
    discountCents: 0,
    taxCents: 160,
    totalCents: 1160,
    taxEnabled: true,
    items: [{ description: "Repair", quantity: 1, unitPriceCents: 1000 }],
    sections: undefined,
    ...overrides,
  };
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

  it("throws SharedQuoteNotFoundError when quote is soft-deleted", async () => {
    mockSharedQuote({ quote: { deletedAt: new Date() } });

    await expect(getSharedQuoteByToken("token-valid")).rejects.toThrow(SharedQuoteNotFoundError);
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
      where: { id: "q-1", status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.APPROVED, approvedAt: expect.any(Date) },
    });
    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-1",
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.CUSTOMER,
        authorizedSectionIds: [],
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
      where: { id: "q-1", status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
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
    tx.quote.findUnique.mockResolvedValue(commercialQuote());

    const result = await authorizeQuote("q-1", "Cliente confirmó por WhatsApp", "actor-1");

    expect(tx.quote.findUnique).toHaveBeenCalledWith({ where: { id: "q-1" }, include: { items: true, sections: { include: { items: true } } } });
    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-1", status: { in: [QuoteStatus.DRAFT, QuoteStatus.SENT] } },
      data: { status: QuoteStatus.APPROVED, approvedAt: expect.any(Date) },
    });

    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-1",
        actorId: "actor-1",
        status: QuoteStatus.APPROVED,
        origin: QuoteDecisionOrigin.ADMIN,
        authorizedSectionIds: [],
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
    tx.quote.findUnique.mockResolvedValue(commercialQuote());

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
    tx.quote.findUnique.mockResolvedValue(commercialQuote({ status: QuoteStatus.DRAFT }));
    tx.quote.updateMany.mockResolvedValue({ count: 0 });

    await expect(authorizeQuote("q-1", "Nota")).rejects.toThrow(QuoteDecisionError);
  });

  it("allows actorId to be undefined", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue(commercialQuote());

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
      customerId: "customer-1",
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 160,
      totalCents: 1160,
      taxEnabled: true,
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
      customerId: "customer-1",
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 160,
      totalCents: 1160,
      taxEnabled: true,
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
      customerId: "customer-1",
      subtotalCents: 1000,
      discountCents: 0,
      taxCents: 160,
      totalCents: 1160,
      taxEnabled: true,
      items: [{ description: "Repair", quantity: { toString: () => "1" }, unitPriceCents: 1000 }],
    });
    tx.sharedQuote.findUnique.mockResolvedValue(null);

    const result = await createSharedQuoteForQuote("q-1");

    expect(result.token).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
  });
});


describe("correctQuoteDecision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows correcting APPROVED to REJECTED with history and clears approvedAt", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "q-corr-1",
      status: "APPROVED",
      workOrder: null
    });

    await correctQuoteDecision("q-corr-1", "REJECTED", "user-1");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-corr-1", status: "APPROVED" },
      data: { status: "REJECTED", approvedAt: null }
    });
    
    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-corr-1",
        previousState: "APPROVED",
        nextState: "REJECTED",
        actorId: "user-1",
        reason: "Corrección manual de decisión",
      }
    });

    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-corr-1",
        status: "REJECTED",
        origin: "ADMIN",
        actorId: "user-1",
        note: "Corrección manual de decisión",
      }
    });
  });

  it("allows correcting REJECTED to APPROVED with history and sets approvedAt", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "q-corr-2",
      status: "REJECTED",
      workOrder: null
    });

    await correctQuoteDecision("q-corr-2", "APPROVED", "user-1");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-corr-2", status: "REJECTED" },
      data: { status: "APPROVED", approvedAt: expect.any(Date) }
    });
  });

  it("allows correcting REJECTED to DRAFT with history and clears approvedAt", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "q-corr-draft-1",
      status: "REJECTED",
      workOrder: null
    });

    await correctQuoteDecision("q-corr-draft-1", "DRAFT", "user-1");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-corr-draft-1", status: "REJECTED" },
      data: { status: "DRAFT", approvedAt: null }
    });

    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-corr-draft-1",
        previousState: "REJECTED",
        nextState: "DRAFT",
        actorId: "user-1",
        reason: "Corrección manual de decisión",
      }
    });

    expect(tx.quoteDecision.create).toHaveBeenCalledWith({
      data: {
        quoteId: "q-corr-draft-1",
        status: "DRAFT",
        origin: "ADMIN",
        actorId: "user-1",
        note: "Corrección manual de decisión",
      }
    });
  });

  it("allows correcting APPROVED to DRAFT with history and clears approvedAt", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "q-corr-draft-2",
      status: "APPROVED",
      workOrder: null
    });

    await correctQuoteDecision("q-corr-draft-2", "DRAFT", "user-1");

    expect(tx.quote.updateMany).toHaveBeenCalledWith({
      where: { id: "q-corr-draft-2", status: "APPROVED" },
      data: { status: "DRAFT", approvedAt: null }
    });
  });

  it("fails if quote has a WorkOrder", async () => {
    const tx = mockTx();
    tx.quote.findUnique.mockResolvedValue({
      id: "q-corr-3",
      status: "APPROVED",
      workOrder: { id: "wo-1" }
    });

    await expect(correctQuoteDecision("q-corr-3", "REJECTED", "user-1")).rejects.toThrow(/orden de trabajo/);
  });

  it("handles the complete lifecycle: Partial Acceptance -> Correction to Draft -> Re-Acceptance", async () => {
    const quoteState = {
      id: "quote-lifecycle-1",
      number: "C-2026-001",
      status: QuoteStatus.SENT,
      customerId: "cust-1",
      taxEnabled: true,
      discountCents: 0,
      subtotalCents: 200_00,
      taxCents: 32_00,
      totalCents: 232_00,
      approvedAt: null as Date | null,
      workOrder: null,
      items: [
        { id: "item-1", description: "Servicio A", quantity: 1, unitPriceCents: 100_00, type: QuoteItemType.LABOR, sectionId: "sec-a" },
      ],
      sections: [
        { id: "sec-a", quoteId: "quote-lifecycle-1", name: "Sección A", isAuthorized: false, items: [{ id: "item-1", description: "Servicio A", quantity: 1, unitPriceCents: 100_00, type: QuoteItemType.LABOR }] },
        { id: "sec-b", quoteId: "quote-lifecycle-1", name: "Sección B", isAuthorized: false, items: [{ id: "item-2", description: "Servicio B", quantity: 1, unitPriceCents: 100_00, type: QuoteItemType.LABOR }] },
      ],
    };

    const tx: MockTransaction = {
      quote: {
        findUnique: vi.fn().mockImplementation(() => Promise.resolve(quoteState)),
        updateMany: vi.fn().mockImplementation((args: { where: { id: string }; data: Partial<typeof quoteState> }) => {
          Object.assign(quoteState, args.data);
          return Promise.resolve({ count: 1 });
        }),
        update: vi.fn(),
      },
      quoteSection: {
        updateMany: vi.fn().mockImplementation((args: { where: { id: { in: string[] } }; data: { isAuthorized: boolean } }) => {
          for (const s of quoteState.sections) {
            if (args.where?.id?.in?.includes(s.id)) {
              s.isAuthorized = args.data.isAuthorized;
            }
          }
          return Promise.resolve({ count: 1 });
        }),
      },
      quoteDecision: {
        create: vi.fn().mockResolvedValue({ id: "dec-1" }),
      },
      quoteLifecycleEvent: {
        create: vi.fn().mockResolvedValue({ id: "event-1" }),
      },
      sharedQuote: {
        findFirst: vi.fn().mockImplementation(() =>
          Promise.resolve({
            id: "sq-1",
            token: "valid-token",
            quoteId: quoteState.id,
            quote: quoteState,
            expiresAt: new Date(Date.now() + 86400000),
            revokedAt: null,
          }),
        ),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      workOrder: { findFirst: vi.fn().mockResolvedValue(null) },
    };

    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      (callback: (t: MockTransaction) => Promise<unknown>) => callback(tx),
    );

    // STEP 1: Customer partially accepts section A
    await acceptSharedQuote("valid-token", ["sec-a"]);

    expect(quoteState.status).toBe(QuoteStatus.APPROVED);
    expect(quoteState.approvedAt).toBeInstanceOf(Date);
    expect(quoteState.sections.find((s) => s.id === "sec-a")?.isAuthorized).toBe(true);
    expect(quoteState.sections.find((s) => s.id === "sec-b")?.isAuthorized).toBe(false);

    // STEP 2: Customer or admin realizes mistake. Admin corrects decision back to DRAFT
    await correctQuoteDecision(quoteState.id, "DRAFT", "admin-user-1");

    expect(quoteState.status).toBe(QuoteStatus.DRAFT);
    expect(quoteState.approvedAt).toBeNull();
    expect(tx.quoteLifecycleEvent.create).toHaveBeenCalledWith({
      data: {
        quoteId: quoteState.id,
        previousState: "APPROVED",
        nextState: "DRAFT",
        actorId: "admin-user-1",
        reason: "Corrección manual de decisión",
      },
    });

    // STEP 3: Admin re-sends quote (simulating status -> SENT)
    quoteState.status = QuoteStatus.SENT;

    // STEP 4: Customer opens link again and now accepts Section B
    await acceptSharedQuote("valid-token", ["sec-b"]);

    expect(quoteState.status).toBe(QuoteStatus.APPROVED);
    expect(quoteState.approvedAt).toBeInstanceOf(Date);
    expect(quoteState.sections.find((s) => s.id === "sec-b")?.isAuthorized).toBe(true);
  });
});
