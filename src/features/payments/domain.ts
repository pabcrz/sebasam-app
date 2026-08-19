import { LedgerEntryType, PaymentMethod, PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCommercialQuote } from "@/features/quotes/lib/commercial-validation";

const CASH_PAYMENT_QUOTE_STATUSES: QuoteStatus[] = [QuoteStatus.APPROVED];

export class PaymentOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentOperationError";
  }
}

export type RecordCashPaymentInput = {
  amountCents: number;
  operationKey: string;
  method?: PaymentMethod;
  quoteId?: string;
  paymentRequestId?: string;
};

export type PaymentBalance = {
  paidCents: number;
  remainingCents: number;
};

export type RecordedCashPayment = PaymentBalance & {
  payment: {
    id: string;
    amountCents: number;
    method: PaymentMethod;
    status: PaymentStatus;
  };
};

type RecordedPayment = RecordedCashPayment["payment"];

type QuotePaymentBalance = PaymentBalance & {
  customerId: string;
};

type CustomerBalanceClient = Pick<Prisma.TransactionClient, "quote" | "payment">;

export type CustomerBalanceSummary = {
  totalContractedCents: number;
  totalPaidCents: number;
  pendingBalanceCents: number;
};

export function parseCashAmountCents(value: unknown): number {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new PaymentOperationError("Ingresa un monto válido con hasta dos decimales.");
  }

  const [whole, fractional = ""] = value.trim().split(".");
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new PaymentOperationError("El pago debe ser mayor que cero.");
  }

  return cents;
}

function validatePaymentReference(input: RecordCashPaymentInput) {
  const hasQuote = Boolean(input.quoteId);
  const hasPaymentRequest = Boolean(input.paymentRequestId);

  if (hasQuote === hasPaymentRequest) {
    throw new PaymentOperationError("Selecciona una cotización o una solicitud de pago.");
  }

  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PaymentOperationError("El pago debe ser mayor que cero.");
  }

  if (typeof input.operationKey !== "string" || input.operationKey.trim().length === 0) {
    throw new PaymentOperationError("No se pudo identificar la operación de pago.");
  }
}

async function getPaymentBalance(tx: Prisma.TransactionClient, quoteId: string): Promise<QuotePaymentBalance> {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    include: { items: true, sections: { include: { items: true } } },
  });

  if (!quote) {
    throw new PaymentOperationError("La cotización no existe.");
  }

  assertCommercialQuote(quote);

  const paid = await tx.payment.aggregate({
    where: { quoteId, status: PaymentStatus.PAID },
    _sum: { amountCents: true },
  });
  const paidCents = paid._sum.amountCents ?? 0;

  if (paidCents > quote.totalCents!) {
    throw new PaymentOperationError("Los pagos registrados exceden el total de la cotización.");
  }

  return { customerId: quote.customerId!, paidCents, remainingCents: quote.totalCents! - paidCents };
}

export async function getCustomerBalanceSummary(
  client: CustomerBalanceClient,
  customerId: string,
): Promise<CustomerBalanceSummary> {
  const [charges, payments] = await Promise.all([
    client.quote.aggregate({
      where: { customerId, status: QuoteStatus.APPROVED },
      _sum: { totalCents: true },
    }),
    client.payment.aggregate({
      where: {
        status: PaymentStatus.PAID,
        quote: { customerId, status: QuoteStatus.APPROVED },
      },
      _sum: { amountCents: true },
    }),
  ]);

  const totalContractedCents = charges._sum.totalCents ?? 0;
  const totalPaidCents = payments._sum.amountCents ?? 0;

  return {
    totalContractedCents,
    totalPaidCents,
    pendingBalanceCents: totalContractedCents - totalPaidCents,
  };
}

async function getCustomerOutstandingBalance(tx: Prisma.TransactionClient, customerId: string): Promise<number> {
  const summary = await getCustomerBalanceSummary(tx, customerId);

  if (summary.totalPaidCents > summary.totalContractedCents) {
    throw new PaymentOperationError("Los pagos registrados exceden el saldo aprobado del cliente.");
  }

  return summary.pendingBalanceCents;
}

async function ensurePaymentLedgerEntry(
  tx: Prisma.TransactionClient,
  input: {
    paymentId: string;
    customerId: string;
    amountCents: number;
    resultingBalanceCents: number;
  },
) {
  const existingEntry = await tx.ledgerEntry.findUnique({
    where: { paymentId: input.paymentId },
    select: { id: true },
  });

  if (existingEntry) {
    return;
  }

  // Credits stay positive; the balance snapshot is the customer's approved debt after this payment.
  await tx.ledgerEntry.create({
    data: {
      customerId: input.customerId,
      paymentId: input.paymentId,
      type: LedgerEntryType.CREDIT,
      amountCents: input.amountCents,
      resultingBalanceCents: input.resultingBalanceCents,
    },
  });
}

function recordedPaymentResult(payment: RecordedPayment, balance: PaymentBalance): RecordedCashPayment {
  const { paidCents, remainingCents } = balance;

  return {
    payment: {
      id: payment.id,
      amountCents: payment.amountCents,
      method: payment.method,
      status: payment.status,
    },
    paidCents,
    remainingCents,
  };
}

export async function recordCashPayment(input: RecordCashPaymentInput): Promise<RecordedCashPayment> {
  validatePaymentReference(input);

  return prisma.$transaction(async (tx) => {
    // This precedes current quote eligibility so a confirmed operation remains retrievable on retry.
    const existingPayment = await tx.payment.findUnique({
      where: { operationKey: input.operationKey },
      select: { id: true, quoteId: true, amountCents: true, method: true, status: true },
    });

    if (existingPayment) {
      const balance = await getPaymentBalance(tx, existingPayment.quoteId);

      if (existingPayment.status === PaymentStatus.PAID) {
        await ensurePaymentLedgerEntry(tx, {
          paymentId: existingPayment.id,
          customerId: balance.customerId,
          amountCents: existingPayment.amountCents,
          resultingBalanceCents: await getCustomerOutstandingBalance(tx, balance.customerId),
        });
      }

      return recordedPaymentResult(existingPayment, balance);
    }

    let quoteId = input.quoteId;

    if (input.paymentRequestId) {
      const request = await tx.paymentRequest.findUnique({
        where: { id: input.paymentRequestId },
        select: { quoteId: true },
      });

      if (!request) {
        throw new PaymentOperationError("La solicitud de pago no existe.");
      }

      if (!request.quoteId) {
        throw new PaymentOperationError("El pago en efectivo requiere una cotización.");
      }

      quoteId = request.quoteId;
    }

    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, sections: { include: { items: true } } },
    });

    if (!quote) {
      throw new PaymentOperationError("La cotización no existe.");
    }

    assertCommercialQuote(quote);

    if (!CASH_PAYMENT_QUOTE_STATUSES.includes(quote.status)) {
      throw new PaymentOperationError("Solo se pueden registrar pagos en cotizaciones aprobadas.");
    }

    const { paidCents, remainingCents } = await getPaymentBalance(tx, quote.id);

    if (input.amountCents > remainingCents) {
      throw new PaymentOperationError("El pago no puede exceder el saldo pendiente.");
    }

    const payment = await tx.payment.create({
      data: {
        operationKey: input.operationKey,
        quoteId: quote.id,
        paymentRequestId: input.paymentRequestId,
        method: input.method ?? PaymentMethod.CASH,
        amountCents: input.amountCents,
        status: PaymentStatus.PAID,
      },
      select: { id: true, amountCents: true, method: true, status: true },
    });

    const resultingBalance = {
      paidCents: paidCents + payment.amountCents,
      remainingCents: remainingCents - payment.amountCents,
    };

    await ensurePaymentLedgerEntry(tx, {
      paymentId: payment.id,
          customerId: quote.customerId!,
      amountCents: payment.amountCents,
      resultingBalanceCents: await getCustomerOutstandingBalance(tx, quote.customerId!),
    });

    return recordedPaymentResult(payment, resultingBalance);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
