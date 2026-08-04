import { PaymentMethod, PaymentStatus, Prisma, QuoteStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const CASH_PAYMENT_QUOTE_STATUSES: QuoteStatus[] = [QuoteStatus.SENT, QuoteStatus.APPROVED];

export class PaymentOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentOperationError";
  }
}

export type RecordCashPaymentInput = {
  amountCents: number;
  operationKey: string;
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

async function getPaymentBalance(tx: Prisma.TransactionClient, quoteId: string): Promise<PaymentBalance> {
  const quote = await tx.quote.findUnique({
    where: { id: quoteId },
    select: { totalCents: true },
  });

  if (!quote) {
    throw new PaymentOperationError("La cotización no existe.");
  }

  const paid = await tx.payment.aggregate({
    where: { quoteId, status: PaymentStatus.PAID },
    _sum: { amountCents: true },
  });
  const paidCents = paid._sum.amountCents ?? 0;

  if (paidCents > quote.totalCents) {
    throw new PaymentOperationError("Los pagos registrados exceden el total de la cotización.");
  }

  return { paidCents, remainingCents: quote.totalCents - paidCents };
}

function recordedPaymentResult(payment: RecordedPayment, balance: PaymentBalance): RecordedCashPayment {
  return {
    payment: {
      id: payment.id,
      amountCents: payment.amountCents,
      method: payment.method,
      status: payment.status,
    },
    ...balance,
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
      return recordedPaymentResult(existingPayment, await getPaymentBalance(tx, existingPayment.quoteId));
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
      select: { id: true, status: true, totalCents: true },
    });

    if (!quote) {
      throw new PaymentOperationError("La cotización no existe.");
    }

    if (!CASH_PAYMENT_QUOTE_STATUSES.includes(quote.status)) {
      throw new PaymentOperationError("Solo se pueden registrar pagos en cotizaciones enviadas o aprobadas.");
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
        method: PaymentMethod.CASH,
        amountCents: input.amountCents,
        status: PaymentStatus.PAID,
      },
      select: { id: true, amountCents: true, method: true, status: true },
    });

    return recordedPaymentResult(payment, {
      paidCents: paidCents + payment.amountCents,
      remainingCents: remainingCents - payment.amountCents,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
