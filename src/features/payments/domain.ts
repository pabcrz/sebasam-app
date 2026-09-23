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
import { getEffectiveSettlementTotals } from "@/features/settlement-agreements/domain";

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

export type CorrectPaymentInput = {
  originalPaymentId: string;
  amountCents: number;
  method: PaymentMethod;
  reason: string;
  operationKey: string;
  actorId: string;
};

export type CorrectPaymentResult = {
  correctionId: string;
  originalPaymentId: string;
  replacementPaymentId: string;
  replacementAmountCents: number;
  method: PaymentMethod;
  reversedApplicationsCount: number;
  appliedApplicationsCount: number;
  totalShortfallCents: number;
  excessCreditCents: number;
  reason: string;
  actorId: string;
  actorName: string | null;
  createdAt: Date;
  applications: Array<{
    workOrderId: string;
    originalAmountCents: number;
    replacementAmountCents: number;
    shortfallCents: number;
  }>;
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
  nominalContractedCents: number;
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
    createdAt: Date;
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
        include: { items: true, sections: { include: { items: true } }, settlementAgreement: true },
      },
    },
  });

  if (!workOrder) {
    throw new PaymentOperationError("La orden de trabajo no existe.");
  }

  if (!workOrder.quote.customerId) {
    throw new PaymentOperationError("La cotización no tiene cliente asignado.");
  }

  assertCommercialQuote(workOrder.quote, { allowStaleTotals: true });

  const chargedCents = getEffectiveSettlementTotals(workOrder.quote, workOrder.quote.settlementAgreement).totalCents;

  const applications = await tx.paymentApplication.aggregate({
    where: {
      workOrderId,
      reversedAt: null,
      payment: { status: PaymentStatus.PAID, reversedAt: null },
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
      payment: { customerId, status: PaymentStatus.PAID, reversedAt: null },
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
    client.quote.findMany({
      where: {
        customerId,
        status: QuoteStatus.APPROVED,
        workOrder: { status: WorkOrderStatus.COMPLETED },
      },
      select: {
        subtotalCents: true,
        discountCents: true,
        taxCents: true,
        totalCents: true,
        taxEnabled: true,
        items: { select: { quantity: true, unitPriceCents: true } },
        settlementAgreement: true,
      },
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
            payment: { customerId, status: PaymentStatus.PAID, reversedAt: null },
            reversedAt: null,
          },
          _sum: { amountCents: true },
        })
      : Promise.resolve({ _sum: { amountCents: 0 } }),
  ]);

  const nominalContractedCents = charges.reduce((total, quote) => total + (quote.totalCents ?? 0), 0);
  const totalContractedCents = charges.reduce(
    (total, quote) => total + getEffectiveSettlementTotals(quote, quote.settlementAgreement).totalCents,
    0,
  );
  const totalPaidCents = captures._sum.amountCents ?? 0;
  const totalAppliedCents = applications._sum.amountCents ?? 0;
  const availableCreditCents = Math.max(0, totalPaidCents - totalAppliedCents);
  const pendingBalanceCents = Math.max(0, totalContractedCents - totalAppliedCents);

  return {
    nominalContractedCents,
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
          noteSummary = await getNoteFinancialSummary(tx, firstApp.workOrderId!);
        } else if (existingPayment.quoteId) {
          const wo = await tx.workOrder.findUnique({ where: { quoteId: existingPayment.quoteId } });
          if (wo) {
            noteSummary = await getNoteFinancialSummary(tx, wo.id);
          }
        }

        const paidCents = noteSummary?.appliedCents ?? appliedToNoteCents;
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
            createdAt: existingPayment.createdAt,
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

        if (quoteId) {
          const requestQuote = await tx.quote.findUnique({
            where: { id: quoteId },
            include: { items: true, sections: { include: { items: true } }, settlementAgreement: true },
          });
          if (!requestQuote) throw new PaymentOperationError("La cotización de la solicitud no existe.");
          assertCommercialQuote(requestQuote, { allowStaleTotals: true });
          const currentPayable = getEffectiveSettlementTotals(requestQuote, requestQuote.settlementAgreement);
          if (
            request.payableSubtotalCents !== currentPayable.subtotalCents ||
            request.payableTaxCents !== currentPayable.taxCents ||
            request.payableTotalCents !== currentPayable.totalCents ||
            request.settlementAgreementId !== currentPayable.agreementId
          ) {
            throw new PaymentOperationError("El importe de esta solicitud cambió. Actualiza o vuelve a abrir el enlace de pago antes de cobrar.");
          }
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

      if (!customerId && quoteId) {
        const quoteForCustomer = await tx.quote.findUnique({
          where: { id: quoteId },
          select: { customerId: true },
        });
        customerId = quoteForCustomer?.customerId ?? undefined;
      }

      if (!customerId) {
        throw new PaymentOperationError("No se pudo determinar el cliente para el pago.");
      }

      await lockPaymentMutationScope(tx, { quoteIds: quoteId ? [quoteId] : [] });

      // Re-read the locked quote and enforce commercial validation after locking.
      if (quoteId) {
        const quote = await tx.quote.findUnique({
          where: { id: quoteId },
          include: { items: true, sections: { include: { items: true } } },
        });
        if (!quote) {
          throw new PaymentOperationError("La cotización no existe.");
        }
        assertCommercialQuote(quote, { allowStaleTotals: true });

        if (!targetWorkOrder || targetWorkOrder.status !== WorkOrderStatus.COMPLETED) {
          if (!CASH_PAYMENT_QUOTE_STATUSES.includes(quote.status)) {
            throw new PaymentOperationError("Solo se pueden registrar pagos en cotizaciones aprobadas.");
          }
        }
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
      let cumulativePaidCents = 0;
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
              payableNoteId: targetWorkOrder.id,
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
              payableNoteId: targetWorkOrder.id,
              actorId: input.actorId ?? null,
            },
          });

          appliedToNoteCents = applyAmount;
          cumulativePaidCents = noteSummary.appliedCents + applyAmount;
          paymentApplicationId = application.id;
          notePendingBalanceCents = noteSummary.pendingBalanceCents - applyAmount;
        } else {
          notePendingBalanceCents = noteSummary.pendingBalanceCents;
          cumulativePaidCents = noteSummary.appliedCents;
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
          createdAt: payment.createdAt,
        },
        appliedToNoteCents,
        customerCreditRemainingCents: creditSummary.availableCreditCents,
        notePendingBalanceCents,
        paymentApplicationId,
        paidCents: targetWorkOrder?.status === WorkOrderStatus.COMPLETED ? cumulativePaidCents : appliedToNoteCents,
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
          getNoteFinancialSummary(tx, existingApplication.workOrderId!),
          getCustomerCreditSummary(tx, input.customerId),
        ]);

        return {
          application: {
            id: existingApplication.id,
            amountCents: existingApplication.amountCents,
            workOrderId: existingApplication.workOrderId!,
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

      // 2. Pre-scan candidate payment ids so we can lock all candidates in canonical order.
      const candidatePaymentIds = (
        await tx.payment.findMany({
          where: {
            customerId: input.customerId,
            status: PaymentStatus.PAID,
            reversedAt: null,
          },
          orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          select: { id: true },
        })
      ).map((p) => p.id);

      // 3. Lock candidates and the target quote, then re-read the locked payments.
      const lock = await lockPaymentMutationScope(tx, {
        paymentIds: candidatePaymentIds,
        quoteIds: [workOrder.quoteId],
      });

      // 4. Validate Note pending balance and customer credit after locking.
      const noteSummary = await getNoteFinancialSummary(tx, input.workOrderId);
      if (input.amountCents > noteSummary.pendingBalanceCents) {
        throw new PaymentOperationError("El monto excede el saldo pendiente de la nota.");
      }

      const creditSummary = await getCustomerCreditSummary(tx, input.customerId);
      if (input.amountCents > creditSummary.availableCreditCents) {
        throw new PaymentOperationError("El cliente no cuenta con saldo a favor suficiente.");
      }

      // 5. Select a backing payment from the post-lock set.
      let backingPayment: (typeof lock.lockedPayments)[number] | null = null;
      for (const p of lock.lockedPayments) {
        const applied = lock.activeApplications
          .filter((a) => a.paymentId === p.id)
          .reduce((acc, app) => acc + app.amountCents, 0);
        const unapplied = p.amountCents - applied;
        if (unapplied >= input.amountCents) {
          backingPayment = p;
          break;
        }
      }

      if (!backingPayment) {
        for (const p of lock.lockedPayments) {
          const applied = lock.activeApplications
            .filter((a) => a.paymentId === p.id)
            .reduce((acc, app) => acc + app.amountCents, 0);
          if (p.amountCents - applied > 0) {
            backingPayment = p;
            break;
          }
        }
      }

      if (!backingPayment || backingPayment.reversedAt) {
        throw new PaymentOperationError("No se encontró un pago activo para respaldar la aplicación.");
      }

      const lockedApplied = lock.activeApplications
        .filter((a) => a.paymentId === backingPayment.id)
        .reduce((acc, app) => acc + app.amountCents, 0);
      const lockedUnapplied = backingPayment.amountCents - lockedApplied;
      if (lockedUnapplied < input.amountCents) {
        throw new PaymentOperationError("El pago seleccionado ya no tiene saldo suficiente. Recarga e intenta de nuevo.");
      }

      // 6. Create PaymentApplication
      const application = await tx.paymentApplication.create({
        data: {
          operationKey: input.operationKey,
          paymentId: backingPayment.id,
          workOrderId: input.workOrderId,
          payableNoteId: input.workOrderId,
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
          payableNoteId: input.workOrderId,
          actorId: input.actorId ?? null,
        },
      });

      const remainingNoteBalance = noteSummary.pendingBalanceCents - input.amountCents;
      const remainingCredit = creditSummary.availableCreditCents - input.amountCents;

      return {
        application: {
          id: application.id,
          amountCents: application.amountCents,
          workOrderId: application.workOrderId!,
          paymentId: application.paymentId,
        },
        notePendingBalanceCents: remainingNoteBalance,
        customerCreditRemainingCents: remainingCredit,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export type PaymentMutationScope = {
  paymentIds?: string[];
  quoteIds?: string[];
};

export async function lockPaymentMutationScope(
  tx: Prisma.TransactionClient,
  scope: PaymentMutationScope,
) {
  const paymentIds = scope.paymentIds ?? [];
  const quoteIds = scope.quoteIds ?? [];

  // Canonical lock order: source payments by id, then quotes by id.
  // This uses explicit row-level FOR UPDATE locks so concurrent mutations
  // of the same scope block or abort instead of committing interleaved state.
  if (paymentIds.length > 0) {
    await tx.$queryRawUnsafe(
      `SELECT id FROM "Payment" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
      paymentIds,
    );
  }

  if (quoteIds.length > 0) {
    await tx.$queryRawUnsafe(
      `SELECT id FROM "Quote" WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE`,
      quoteIds,
    );
  }

  // Re-read the locked rows and active applications after acquiring locks.
  const lockedPayments = paymentIds.length > 0
    ? await tx.payment.findMany({
        where: { id: { in: paymentIds } },
        orderBy: [{ id: "asc" }],
      })
    : [];

  const lockedQuotes = quoteIds.length > 0
    ? await tx.quote.findMany({
        where: { id: { in: quoteIds } },
        orderBy: [{ id: "asc" }],
      })
    : [];

  const activeApplications = paymentIds.length > 0
    ? await tx.paymentApplication.findMany({
        where: {
          paymentId: { in: paymentIds },
          reversedAt: null,
          payment: { status: PaymentStatus.PAID, reversedAt: null },
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      })
    : [];

  return { lockedPayments, lockedQuotes, activeApplications };
}

function validateCorrectPaymentInput(input: CorrectPaymentInput) {
  if (!input.originalPaymentId) {
    throw new PaymentOperationError("Selecciona el pago original a corregir.");
  }
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) {
    throw new PaymentOperationError("El monto de corrección debe ser mayor que cero.");
  }
  if (!Object.values(PaymentMethod).includes(input.method)) {
    throw new PaymentOperationError("El método de pago no es válido.");
  }
  if (typeof input.reason !== "string" || input.reason.trim().length === 0) {
    throw new PaymentOperationError("El motivo de la corrección es obligatorio.");
  }
  if (typeof input.actorId !== "string" || input.actorId.trim().length === 0) {
    throw new PaymentOperationError("El usuario responsable de la corrección es obligatorio.");
  }
  if (typeof input.operationKey !== "string" || input.operationKey.trim().length === 0) {
    throw new PaymentOperationError("No se pudo identificar la operación de corrección.");
  }
}

async function buildCorrectPaymentResult(
  tx: Prisma.TransactionClient,
  correction: { id: string; originalPaymentId: string; replacementPaymentId: string; operationKey: string; reason: string; actorId: string; actorName: string | null; createdAt: Date },
): Promise<CorrectPaymentResult> {
  const replacement = await tx.payment.findUnique({ where: { id: correction.replacementPaymentId } });
  const mappings = await tx.paymentCorrectionApplication.findMany({
    where: { paymentCorrectionId: correction.id },
    orderBy: [{ sortOrder: "asc" }],
  });
  const totalShortfallCents = mappings.reduce((sum, m) => sum + m.shortfallCents, 0);
  const appliedApplicationsCount = mappings.filter((m) => m.replacementApplicationId !== null).length;
  const replacementAmountCents = replacement?.amountCents ?? 0;
  const appliedTotal = mappings.reduce((sum, m) => sum + m.replacementAmountCents, 0);
  const excessCreditCents = Math.max(0, replacementAmountCents - appliedTotal);

  return {
    correctionId: correction.id,
    originalPaymentId: correction.originalPaymentId,
    replacementPaymentId: correction.replacementPaymentId,
    replacementAmountCents,
    method: replacement?.method ?? PaymentMethod.CASH,
    reversedApplicationsCount: mappings.length,
    appliedApplicationsCount,
    totalShortfallCents,
    excessCreditCents,
    reason: correction.reason,
    actorId: correction.actorId,
    actorName: correction.actorName,
    createdAt: correction.createdAt,
    applications: mappings.map((m) => ({
      workOrderId: m.workOrderId!,
      originalAmountCents: m.originalAmountCents,
      replacementAmountCents: m.replacementAmountCents,
      shortfallCents: m.shortfallCents,
    })),
  };
}

export async function correctPayment(input: CorrectPaymentInput): Promise<CorrectPaymentResult> {
  validateCorrectPaymentInput(input);

  return prisma.$transaction(
    async (tx) => {
      // 1. Lock the original payment first so idempotency/corrected checks are
      // evaluated against the post-lock state.
      await lockPaymentMutationScope(tx, { paymentIds: [input.originalPaymentId] });

      const existingCorrection = await tx.paymentCorrection.findUnique({
        where: { operationKey: input.operationKey },
        include: { actor: { select: { id: true, displayName: true } } },
      });
      if (existingCorrection) {
        return buildCorrectPaymentResult(tx, {
          ...existingCorrection,
          actorName: existingCorrection.actor?.displayName ?? null,
        });
      }

      const original = await tx.payment.findUnique({
        where: { id: input.originalPaymentId },
        include: {
          applications: {
            where: { reversedAt: null },
            include: { workOrder: true },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
        },
      });

      if (!original) {
        throw new PaymentOperationError("El pago original no existe.");
      }
      if (original.reversedAt) {
        throw new PaymentOperationError("El pago original ya fue reversado.");
      }

      const alreadyCorrected = await tx.paymentCorrection.findFirst({
        where: { originalPaymentId: original.id },
      });
      if (alreadyCorrected) {
        throw new PaymentOperationError("Este pago ya fue corregido.");
      }

      // 2. Lock affected quote rows in canonical order, then re-read active apps.
      const preLockQuoteIds = Array.from(
        new Set(original.applications.map((app) => app.workOrder?.quoteId).filter(Boolean) as string[]),
      );
      const lock = await lockPaymentMutationScope(tx, { paymentIds: [original.id], quoteIds: preLockQuoteIds });
      const activeApplications = lock.activeApplications;

      const now = new Date();
      const reason = input.reason.trim();
      const actorId = input.actorId;

      // 1. Reverse original payment
      await tx.payment.update({
        where: { id: original.id },
        data: {
          reversedAt: now,
          reversalReason: reason,
          reversedById: actorId,
        },
      });

      // 2. Reverse original capture ledger entry
      const originalCaptureEntries = await tx.ledgerEntry.findMany({
        where: { movementType: LedgerMovementType.PAYMENT_CAPTURE, paymentId: original.id },
      });
      const originalCapture = originalCaptureEntries[0];
      await tx.ledgerEntry.create({
        data: {
          customerId: original.customerId,
          type: LedgerEntryType.DEBIT,
          movementType: LedgerMovementType.PAYMENT_REVERSAL,
          amountCents: original.amountCents,
          paymentId: original.id,
          actorId,
          reason,
          reversedMovementId: originalCapture?.id ?? null,
        },
      });

      // 3. Reverse each active application (re-read after locking)
      for (const app of activeApplications) {
        await tx.paymentApplication.update({
          where: { id: app.id },
          data: {
            reversedAt: now,
            reversalReason: reason,
            reversedById: actorId,
          },
        });

        const originalApplicationEntries = await tx.ledgerEntry.findMany({
          where: { movementType: LedgerMovementType.PAYMENT_APPLICATION, paymentApplicationId: app.id },
        });
        const originalApplicationEntry = originalApplicationEntries[0];
        await tx.ledgerEntry.create({
          data: {
            customerId: original.customerId,
            type: LedgerEntryType.DEBIT,
            movementType: LedgerMovementType.APPLICATION_REVERSAL,
            amountCents: app.amountCents,
            paymentId: original.id,
            paymentApplicationId: app.id,
            workOrderId: app.workOrderId,
            payableNoteId: app.payableNoteId,
            actorId,
            reason,
            reversedMovementId: originalApplicationEntry?.id ?? null,
          },
        });
      }

      // 4. Create replacement payment capture
      const replacement = await tx.payment.create({
        data: {
          operationKey: `${input.operationKey}:payment`,
          customerId: original.customerId,
          quoteId: original.quoteId,
          paymentRequestId: original.paymentRequestId,
          method: input.method,
          amountCents: input.amountCents,
          status: PaymentStatus.PAID,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          customerId: original.customerId,
          type: LedgerEntryType.CREDIT,
          movementType: LedgerMovementType.PAYMENT_CAPTURE,
          amountCents: input.amountCents,
          paymentId: replacement.id,
          actorId,
          reason,
        },
      });

      // 5. Persist durable correction linkage up front
      const correction = await tx.paymentCorrection.create({
        data: {
          operationKey: input.operationKey,
          originalPaymentId: original.id,
          replacementPaymentId: replacement.id,
          reason,
          actorId,
        },
      });

      // 6. Replay applications in original createdAt,id order
      let remainingCents = input.amountCents;
      let totalShortfallCents = 0;
      let appliedApplicationsCount = 0;
      const applications: CorrectPaymentResult["applications"] = [];

      for (let index = 0; index < activeApplications.length; index++) {
        const app = activeApplications[index];
        const noteSummary = await getNoteFinancialSummary(tx, app.workOrderId!);
        const applyAmount = Math.min(app.amountCents, remainingCents, noteSummary.pendingBalanceCents);

        let replacementApplicationId: string | null = null;
        if (applyAmount > 0) {
          const replacementApplication = await tx.paymentApplication.create({
            data: {
              operationKey: `${input.operationKey}:app:${index}`,
              paymentId: replacement.id,
              workOrderId: app.workOrderId,
              payableNoteId: app.payableNoteId,
              amountCents: applyAmount,
              actorId,
            },
          });

          await tx.ledgerEntry.create({
            data: {
              customerId: original.customerId,
              type: LedgerEntryType.CREDIT,
              movementType: LedgerMovementType.PAYMENT_APPLICATION,
              amountCents: applyAmount,
              paymentId: replacement.id,
              paymentApplicationId: replacementApplication.id,
              workOrderId: app.workOrderId,
              payableNoteId: app.payableNoteId,
              actorId,
              reason,
            },
          });

          replacementApplicationId = replacementApplication.id;
          remainingCents -= applyAmount;
          appliedApplicationsCount += 1;
        }

        const shortfallCents = app.amountCents - applyAmount;
        totalShortfallCents += shortfallCents;

        applications.push({
          workOrderId: app.workOrderId!,
          originalAmountCents: app.amountCents,
          replacementAmountCents: applyAmount,
          shortfallCents,
        });

        await tx.paymentCorrectionApplication.create({
          data: {
            paymentCorrectionId: correction.id,
            originalApplicationId: app.id,
            replacementApplicationId,
            workOrderId: app.workOrderId!,
            payableNoteId: app.payableNoteId,
            originalAmountCents: app.amountCents,
            replacementAmountCents: applyAmount,
            shortfallCents,
            sortOrder: index,
          },
        });
      }

      const excessCreditCents = remainingCents;

      const actor = await tx.userProfile.findUnique({
        where: { id: correction.actorId },
        select: { displayName: true },
      });

      return {
        correctionId: correction.id,
        originalPaymentId: original.id,
        replacementPaymentId: replacement.id,
        replacementAmountCents: replacement.amountCents,
        method: replacement.method,
        reversedApplicationsCount: activeApplications.length,
        appliedApplicationsCount,
        totalShortfallCents,
        excessCreditCents,
        reason: correction.reason,
        actorId: correction.actorId,
        actorName: actor?.displayName ?? null,
        createdAt: correction.createdAt,
        applications,
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
      // Lock the payment first, then re-read it to evaluate idempotency/reversal state.
      await lockPaymentMutationScope(tx, { paymentIds: [input.paymentId] });

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

      const lock = await lockPaymentMutationScope(tx, { paymentIds: [payment.id] });
      const activeApplications = lock.activeApplications;

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
      for (const app of activeApplications) {
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
            payableNoteId: app.payableNoteId,
            actorId: input.actorId,
            reason,
          },
        });
      }

      const updatedCredit = await getCustomerCreditSummary(tx, payment.customerId);

      return {
        paymentId: payment.id,
        reversedApplicationsCount: activeApplications.length,
        restoredCustomerCreditCents: updatedCredit.availableCreditCents,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
