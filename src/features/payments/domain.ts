import {
  LedgerEntryType,
  LedgerMovementType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  QuoteStatus,
  WorkOrderStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertCommercialQuote } from "@/features/quotes/lib/commercial-validation";

const CASH_PAYMENT_QUOTE_STATUSES: QuoteStatus[] = [QuoteStatus.APPROVED];

export class PaymentOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentOperationError";
  }
}

export type RecordPaymentInput = {
  amountCents: number;
  operationKey: string;
  method?: PaymentMethod;
  customerId?: string;
  quoteId?: string;
  workOrderId?: string;
  paymentRequestId?: string;
  actorId?: string;
};

export type RecordCashPaymentInput = RecordPaymentInput;

export type ApplyCreditInput = {
  customerId: string;
  workOrderId: string;
  amountCents: number;
  operationKey: string;
  actorId?: string;
};

export type ReversePaymentInput = {
  paymentId: string;
  reason: string;
  actorId: string;
  operationKey?: string;
};

export type NoteFinancialSummary = {
  workOrderId: string;
  quoteId: string;
  customerId: string;
  chargedCents: number;
  appliedCents: number;
  pendingBalanceCents: number;
  isSettled: boolean;
};

export type CustomerCreditSummary = {
  customerId: string;
  totalCapturedCents: number;
  totalAppliedCents: number;
  availableCreditCents: number;
};

export type CustomerBalanceSummary = {
  totalContractedCents: number;
  totalPaidCents: number;
  pendingBalanceCents: number;
  availableCreditCents: number;
};

export type RecordedPaymentResult = {
  payment: {
    id: string;
    amountCents: number;
    method: PaymentMethod;
    status: PaymentStatus;
    customerId: string;
    quoteId: string | null;
    reversedAt: Date | null;
  };
  appliedToNoteCents: number;
  customerCreditRemainingCents: number;
  notePendingBalanceCents: number | null;
  paymentApplicationId: string | null;
  // Compatibility fields
  paidCents: number;
  remainingCents: number;
};

export type RecordedCashPayment = RecordedPaymentResult;

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

export async function getNoteFinancialSummary(
  tx: Prisma.TransactionClient,
  workOrderId: string,
): Promise<NoteFinancialSummary> {
  const workOrder = await tx.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      quote: {
        include: { items: true, sections: { include: { items: true } } },
      },
    },
  });

  if (!workOrder) {
    throw new PaymentOperationError("La orden de trabajo no existe.");
  }

  if (!workOrder.quote.customerId) {
    throw new PaymentOperationError("La cotización no tiene cliente asignado.");
  }

  assertCommercialQuote(workOrder.quote);

  const chargedCents = workOrder.quote.totalCents ?? 0;

  const applications = await tx.paymentApplication.aggregate({
    where: {
      workOrderId,
      reversedAt: null,
    },
    _sum: { amountCents: true },
  });

  const appliedCents = applications._sum.amountCents ?? 0;
  const pendingBalanceCents = Math.max(0, chargedCents - appliedCents);

  return {
    workOrderId,
    quoteId: workOrder.quoteId,
    customerId: workOrder.quote.customerId,
    chargedCents,
    appliedCents,
    pendingBalanceCents,
    isSettled: pendingBalanceCents === 0,
  };
}

export async function getCustomerCreditSummary(
  tx: Prisma.TransactionClient,
  customerId: string,
): Promise<CustomerCreditSummary> {
  const captures = await tx.payment.aggregate({
    where: {
      customerId,
      status: PaymentStatus.PAID,
      reversedAt: null,
    },
    _sum: { amountCents: true },
  });

  const applications = await tx.paymentApplication.aggregate({
    where: {
      payment: { customerId },
      reversedAt: null,
    },
    _sum: { amountCents: true },
  });

  const totalCapturedCents = captures._sum.amountCents ?? 0;
  const totalAppliedCents = applications._sum.amountCents ?? 0;
  const availableCreditCents = Math.max(0, totalCapturedCents - totalAppliedCents);

  return {
    customerId,
    totalCapturedCents,
    totalAppliedCents,
    availableCreditCents,
  };
}

export async function getCustomerBalanceSummary(
  client: Pick<Prisma.TransactionClient, "quote" | "payment" | "paymentApplication">,
  customerId: string,
): Promise<CustomerBalanceSummary> {
  const [charges, captures, applications] = await Promise.all([
    client.quote.aggregate({
      where: { customerId, status: QuoteStatus.APPROVED },
      _sum: { totalCents: true },
    }),
    client.payment.aggregate({
      where: {
        customerId,
        status: PaymentStatus.PAID,
        reversedAt: null,
      },
      _sum: { amountCents: true },
    }),
    client.paymentApplication?.aggregate
      ? client.paymentApplication.aggregate({
          where: {
            payment: { customerId },
            reversedAt: null,
          },
          _sum: { amountCents: true },
        })
      : Promise.resolve({ _sum: { amountCents: 0 } }),
  ]);

  const totalContractedCents = charges._sum.totalCents ?? 0;
  const totalPaidCents = captures._sum.amountCents ?? 0;
  const totalAppliedCents = applications._sum.amountCents ?? 0;
  const availableCreditCents = Math.max(0, totalPaidCents - totalAppliedCents);
  const pendingBalanceCents = Math.max(0, totalContractedCents - totalAppliedCents);

  return {
    totalContractedCents,
    totalPaidCents,
    pendingBalanceCents,
    availableCreditCents,
  };
}

function validatePaymentInput(input: RecordPaymentInput) {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PaymentOperationError("El pago debe ser mayor que cero.");
  }

  if (typeof input.operationKey !== "string" || input.operationKey.trim().length === 0) {
    throw new PaymentOperationError("No se pudo identificar la operación de pago.");
  }

  const targets = [input.quoteId, input.workOrderId, input.paymentRequestId, input.customerId].filter(Boolean);
  if (targets.length === 0) {
    throw new PaymentOperationError("Selecciona un destino para el pago.");
  }
}

export async function recordPayment(input: RecordPaymentInput): Promise<RecordedPaymentResult> {
  validatePaymentInput(input);

  return prisma.$transaction(
    async (tx) => {
      // Idempotency check
      const existingPayment = await tx.payment.findUnique({
        where: { operationKey: input.operationKey },
        include: {
          applications: {
            where: { reversedAt: null },
          },
        },
      });

      if (existingPayment) {
        const creditSummary = await getCustomerCreditSummary(tx, existingPayment.customerId);
        let noteSummary: NoteFinancialSummary | null = null;
        let appliedToNoteCents = 0;
        let paymentApplicationId: string | null = null;

        const firstApp = existingPayment.applications[0];
        if (firstApp) {
          appliedToNoteCents = firstApp.amountCents;
          paymentApplicationId = firstApp.id;
          noteSummary = await getNoteFinancialSummary(tx, firstApp.workOrderId);
        } else if (existingPayment.quoteId) {
          const wo = await tx.workOrder.findUnique({ where: { quoteId: existingPayment.quoteId } });
          if (wo) {
            noteSummary = await getNoteFinancialSummary(tx, wo.id);
          }
        }

        const paidCents = appliedToNoteCents;
        const remainingCents = noteSummary ? noteSummary.pendingBalanceCents : 0;

        return {
          payment: {
            id: existingPayment.id,
            amountCents: existingPayment.amountCents,
            method: existingPayment.method,
            status: existingPayment.status,
            customerId: existingPayment.customerId,
            quoteId: existingPayment.quoteId,
            reversedAt: existingPayment.reversedAt,
          },
          appliedToNoteCents,
          customerCreditRemainingCents: creditSummary.availableCreditCents,
          notePendingBalanceCents: noteSummary ? noteSummary.pendingBalanceCents : null,
          paymentApplicationId,
          paidCents,
          remainingCents,
        };
      }

      // Resolve targets
      let customerId = input.customerId;
      let quoteId = input.quoteId;
      let targetWorkOrder: { id: string; quoteId: string; status: WorkOrderStatus; quote: { customerId: string | null; totalCents: number | null } } | null = null;

      if (input.workOrderId) {
        const wo = await tx.workOrder.findUnique({
          where: { id: input.workOrderId },
          include: { quote: true },
        });
        if (!wo) {
          throw new PaymentOperationError("La orden de trabajo no existe.");
        }
        targetWorkOrder = wo;
        quoteId = wo.quoteId;
        customerId = wo.quote.customerId ?? undefined;
      }

      if (input.paymentRequestId) {
        const request = await tx.paymentRequest.findUnique({
          where: { id: input.paymentRequestId },
        });
        if (!request) {
          throw new PaymentOperationError("La solicitud de pago no existe.");
        }
        customerId = request.customerId;
        if (request.workOrderId && !targetWorkOrder) {
          const wo = await tx.workOrder.findUnique({
            where: { id: request.workOrderId },
            include: { quote: true },
          });
          if (wo) {
            targetWorkOrder = wo;
            quoteId = wo.quoteId;
          }
        } else if (request.quoteId && !quoteId) {
          quoteId = request.quoteId;
        }
      }

      if (quoteId && !targetWorkOrder) {
        const wo = await tx.workOrder.findUnique({
          where: { quoteId },
          include: { quote: true },
        });
        if (wo) {
          targetWorkOrder = wo;
          customerId = wo.quote.customerId ?? undefined;
        }
      }

      if (quoteId) {
        const quote = await tx.quote.findUnique({
          where: { id: quoteId },
          include: { items: true, sections: { include: { items: true } } },
        });
        if (!quote) {
          throw new PaymentOperationError("La cotización no existe.");
        }
        assertCommercialQuote(quote);

        if (!targetWorkOrder || targetWorkOrder.status !== WorkOrderStatus.COMPLETED) {
          if (!CASH_PAYMENT_QUOTE_STATUSES.includes(quote.status)) {
            throw new PaymentOperationError("Solo se pueden registrar pagos en cotizaciones aprobadas.");
          }
        }

        if (!customerId) {
          customerId = quote.customerId ?? undefined;
        }
      }

      if (!customerId) {
        throw new PaymentOperationError("No se pudo determinar el cliente para el pago.");
      }

      // 1. Record immutable Payment capture
      const payment = await tx.payment.create({
        data: {
          operationKey: input.operationKey,
          customerId,
          quoteId: quoteId ?? null,
          paymentRequestId: input.paymentRequestId ?? null,
          method: input.method ?? PaymentMethod.CASH,
          amountCents: input.amountCents,
          status: PaymentStatus.PAID,
        },
      });

      // 2. Record PAYMENT_CAPTURE in LedgerEntry
      await tx.ledgerEntry.create({
        data: {
          customerId,
          type: LedgerEntryType.CREDIT,
          movementType: LedgerMovementType.PAYMENT_CAPTURE,
          amountCents: input.amountCents,
          paymentId: payment.id,
          actorId: input.actorId ?? null,
        },
      });

      // 3. If target is a completed Note (WorkOrder), apply up to Note pending balance
      let appliedToNoteCents = 0;
      let paymentApplicationId: string | null = null;
      let notePendingBalanceCents: number | null = null;

      if (targetWorkOrder && targetWorkOrder.status === WorkOrderStatus.COMPLETED) {
        const noteSummary = await getNoteFinancialSummary(tx, targetWorkOrder.id);
        const applyAmount = Math.min(input.amountCents, noteSummary.pendingBalanceCents);

        if (applyAmount > 0) {
          const application = await tx.paymentApplication.create({
            data: {
              operationKey: `${input.operationKey}:app`,
              paymentId: payment.id,
              workOrderId: targetWorkOrder.id,
              amountCents: applyAmount,
              actorId: input.actorId ?? null,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              customerId,
              type: LedgerEntryType.CREDIT,
              movementType: LedgerMovementType.PAYMENT_APPLICATION,
              amountCents: applyAmount,
              paymentId: payment.id,
              paymentApplicationId: application.id,
              workOrderId: targetWorkOrder.id,
              actorId: input.actorId ?? null,
            },
          });

          appliedToNoteCents = applyAmount;
          paymentApplicationId = application.id;
          notePendingBalanceCents = noteSummary.pendingBalanceCents - applyAmount;
        } else {
          notePendingBalanceCents = noteSummary.pendingBalanceCents;
        }
      }

      const creditSummary = await getCustomerCreditSummary(tx, customerId);

      return {
        payment: {
          id: payment.id,
          amountCents: payment.amountCents,
          method: payment.method,
          status: payment.status,
          customerId: payment.customerId,
          quoteId: payment.quoteId,
          reversedAt: payment.reversedAt,
        },
        appliedToNoteCents,
        customerCreditRemainingCents: creditSummary.availableCreditCents,
        notePendingBalanceCents,
        paymentApplicationId,
        paidCents: appliedToNoteCents,
        remainingCents: notePendingBalanceCents ?? 0,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function recordCashPayment(input: RecordCashPaymentInput): Promise<RecordedCashPayment> {
  return recordPayment(input);
}

export async function applyCustomerCredit(input: ApplyCreditInput): Promise<{
  application: {
    id: string;
    amountCents: number;
    workOrderId: string;
    paymentId: string;
  };
  notePendingBalanceCents: number;
  customerCreditRemainingCents: number;
}> {
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PaymentOperationError("El monto a aplicar debe ser mayor que cero.");
  }

  if (typeof input.operationKey !== "string" || input.operationKey.trim().length === 0) {
    throw new PaymentOperationError("No se pudo identificar la operación.");
  }

  return prisma.$transaction(
    async (tx) => {
      // Idempotency check
      const existingApplication = await tx.paymentApplication.findUnique({
        where: { operationKey: input.operationKey },
        include: { workOrder: { include: { quote: true } } },
      });

      if (existingApplication) {
        const [noteSummary, creditSummary] = await Promise.all([
          getNoteFinancialSummary(tx, existingApplication.workOrderId),
          getCustomerCreditSummary(tx, input.customerId),
        ]);

        return {
          application: {
            id: existingApplication.id,
            amountCents: existingApplication.amountCents,
            workOrderId: existingApplication.workOrderId,
            paymentId: existingApplication.paymentId,
          },
          notePendingBalanceCents: noteSummary.pendingBalanceCents,
          customerCreditRemainingCents: creditSummary.availableCreditCents,
        };
      }

      // 1. Validate WorkOrder
      const workOrder = await tx.workOrder.findUnique({
        where: { id: input.workOrderId },
        include: { quote: true },
      });

      if (!workOrder) {
        throw new PaymentOperationError("La orden de trabajo no existe.");
      }

      if (workOrder.status !== WorkOrderStatus.COMPLETED) {
        throw new PaymentOperationError("Solo se puede aplicar saldo a favor a notas completadas.");
      }

      if (workOrder.quote.customerId !== input.customerId) {
        throw new PaymentOperationError("La nota no pertenece a este cliente.");
      }

      // 2. Validate Note pending balance
      const noteSummary = await getNoteFinancialSummary(tx, input.workOrderId);
      if (input.amountCents > noteSummary.pendingBalanceCents) {
        throw new PaymentOperationError("El monto excede el saldo pendiente de la nota.");
      }

      // 3. Validate customer available credit
      const creditSummary = await getCustomerCreditSummary(tx, input.customerId);
      if (input.amountCents > creditSummary.availableCreditCents) {
        throw new PaymentOperationError("El cliente no cuenta con saldo a favor suficiente.");
      }

      // 4. Find customer's active payments with unapplied credit
      const activePayments = await tx.payment.findMany({
        where: {
          customerId: input.customerId,
          status: PaymentStatus.PAID,
          reversedAt: null,
        },
        include: {
          applications: {
            where: { reversedAt: null },
          },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      });

      let backingPayment: (typeof activePayments)[number] | null = null;
      for (const p of activePayments) {
        const applied = p.applications.reduce((acc, app) => acc + app.amountCents, 0);
        const unapplied = p.amountCents - applied;
        if (unapplied >= input.amountCents) {
          backingPayment = p;
          break;
        }
      }

      // Fallback: pick earliest payment with any unapplied credit
      if (!backingPayment) {
        for (const p of activePayments) {
          const applied = p.applications.reduce((acc, app) => acc + app.amountCents, 0);
          if (p.amountCents - applied > 0) {
            backingPayment = p;
            break;
          }
        }
      }

      if (!backingPayment) {
        throw new PaymentOperationError("No se encontró un pago activo para respaldar la aplicación.");
      }

      // 5. Create PaymentApplication
      const application = await tx.paymentApplication.create({
        data: {
          operationKey: input.operationKey,
          paymentId: backingPayment.id,
          workOrderId: input.workOrderId,
          amountCents: input.amountCents,
          actorId: input.actorId ?? null,
        },
      });

      // 6. Record PAYMENT_APPLICATION movement
      await tx.ledgerEntry.create({
        data: {
          customerId: input.customerId,
          type: LedgerEntryType.CREDIT,
          movementType: LedgerMovementType.PAYMENT_APPLICATION,
          amountCents: input.amountCents,
          paymentId: backingPayment.id,
          paymentApplicationId: application.id,
          workOrderId: input.workOrderId,
          actorId: input.actorId ?? null,
        },
      });

      const remainingNoteBalance = noteSummary.pendingBalanceCents - input.amountCents;
      const remainingCredit = creditSummary.availableCreditCents - input.amountCents;

      return {
        application: {
          id: application.id,
          amountCents: application.amountCents,
          workOrderId: application.workOrderId,
          paymentId: application.paymentId,
        },
        notePendingBalanceCents: remainingNoteBalance,
        customerCreditRemainingCents: remainingCredit,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function reversePaymentCapture(input: ReversePaymentInput): Promise<{
  paymentId: string;
  reversedApplicationsCount: number;
  restoredCustomerCreditCents: number;
}> {
  if (!input.reason || input.reason.trim().length === 0) {
    throw new PaymentOperationError("El motivo de la reversión es obligatorio.");
  }

  if (!input.actorId || input.actorId.trim().length === 0) {
    throw new PaymentOperationError("El usuario responsable de la reversión es obligatorio.");
  }

  return prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: input.paymentId },
        include: {
          applications: {
            where: { reversedAt: null },
          },
        },
      });

      if (!payment) {
        throw new PaymentOperationError("El pago no existe.");
      }

      if (payment.reversedAt) {
        const credit = await getCustomerCreditSummary(tx, payment.customerId);
        return {
          paymentId: payment.id,
          reversedApplicationsCount: 0,
          restoredCustomerCreditCents: credit.availableCreditCents,
        };
      }

      const now = new Date();
      const reason = input.reason.trim();

      // 1. Mark Payment as reversed
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          reversedAt: now,
          reversalReason: reason,
          reversedById: input.actorId,
        },
      });

      // 2. Record PAYMENT_REVERSAL counter-movement (DEBIT)
      await tx.ledgerEntry.create({
        data: {
          customerId: payment.customerId,
          type: LedgerEntryType.DEBIT,
          movementType: LedgerMovementType.PAYMENT_REVERSAL,
          amountCents: payment.amountCents,
          paymentId: payment.id,
          actorId: input.actorId,
          reason,
        },
      });

      // 3. Atomically reverse all active applications tied to this payment
      for (const app of payment.applications) {
        await tx.paymentApplication.update({
          where: { id: app.id },
          data: {
            reversedAt: now,
            reversalReason: reason,
            reversedById: input.actorId,
          },
        });

        await tx.ledgerEntry.create({
          data: {
            customerId: payment.customerId,
            type: LedgerEntryType.DEBIT,
            movementType: LedgerMovementType.APPLICATION_REVERSAL,
            amountCents: app.amountCents,
            paymentId: payment.id,
            paymentApplicationId: app.id,
            workOrderId: app.workOrderId,
            actorId: input.actorId,
            reason,
          },
        });
      }

      const updatedCredit = await getCustomerCreditSummary(tx, payment.customerId);

      return {
        paymentId: payment.id,
        reversedApplicationsCount: payment.applications.length,
        restoredCustomerCreditCents: updatedCredit.availableCreditCents,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
