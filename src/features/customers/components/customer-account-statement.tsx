"use client";

import * as React from "react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatCents, formatDate } from "@/features/quotes/lib/format";
import type { CorrectPaymentResult } from "@/features/payments/domain";
import { ReversePaymentDialog } from "@/features/payments/components/reverse-payment-dialog";
import { PaymentCorrectionDialog } from "@/features/payments/components/payment-correction-dialog";
import { reversePaymentCaptureAction } from "@/features/payments/actions";
import type { CustomerAccountStatement as CustomerAccountStatementType } from "../queries";

const movementTypeLabels: Record<string, string> = {
  CREDIT: "Crédito",
  DEBIT: "Cargo",
  NOTE_CHARGE: "Cargo por nota",
  PAYMENT_CAPTURE: "Recepción de pago",
  PAYMENT_APPLICATION: "Aplicación a nota",
  PAYMENT_REVERSAL: "Reversión de pago",
  APPLICATION_REVERSAL: "Reversión de aplicación",
};

const paymentMethodLabels: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CREDIT_CARD: "Tarjeta de crédito",
  DEBIT_CARD: "Tarjeta de débito",
  OTHER: "Otro",
};

type CustomerAccountStatementProps = {
  statement: CustomerAccountStatementType;
  reversePaymentAction?: (paymentId: string, reason: string, operationKey?: string) => Promise<unknown>;
  correctPaymentAction?: (
    paymentId: string,
    amount: string,
    method: string,
    reason: string,
    operationKey: string,
  ) => Promise<CorrectPaymentResult>;
  onPaymentReversed?: () => void;
  onPaymentCorrected?: () => void;
};

export function CustomerAccountStatement({
  statement,
  reversePaymentAction = reversePaymentCaptureAction,
  correctPaymentAction,
  onPaymentReversed,
  onPaymentCorrected,
}: CustomerAccountStatementProps) {
  const isSettled = statement.pendingBalanceCents === 0;

  return (
    <Card data-testid="customer-account-statement">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
          Estado de cuenta
        </p>
        <CardTitle as="h2">Resumen financiero</CardTitle>
        <p className="text-sm text-[var(--color-text-muted)]">
          Cotizaciones aprobadas, notas y pagos confirmados del cliente.
        </p>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 grid-cols-2">
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Total contratado</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-[var(--color-text-main)]">
              {formatCents(statement.totalContractedCents)}
            </dd>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Total pagado</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-[var(--color-text-main)]">
              {formatCents(statement.totalPaidCents)}
            </dd>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Saldo a favor</dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-[var(--color-text-main)]">
              {formatCents(statement.availableCreditCents)}
            </dd>
          </div>
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] bg-[var(--color-bg-soft)] p-3">
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Saldo pendiente</dt>
            <dd className="mt-1 flex flex-wrap items-center justify-between gap-1.5 text-base font-semibold tabular-nums text-[var(--color-text-main)]">
              <span>{formatCents(statement.pendingBalanceCents)}</span>
              <Badge variant={isSettled ? "success" : "warning"} className="shrink-0 font-normal">
                {isSettled ? "Cuenta liquidada" : "Pendiente"}
              </Badge>
            </dd>
          </div>
        </dl>

        <section aria-labelledby="customer-ledger-heading" className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 id="customer-ledger-heading" className="text-base font-semibold text-[var(--color-text-main)]">
              Movimientos
            </h3>
            <span className="text-sm text-[var(--color-text-muted)]">{statement.movements.length} registrados</span>
          </div>

          {statement.movements.length === 0 ? (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border-light)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
              Este cliente todavía no tiene movimientos financieros registrados.
            </p>
          ) : (
            <ol className="mt-3 grid gap-3">
              {statement.movements.map((movement) => {
                const title = movement.workOrder
                  ? `Nota ${movement.workOrder.number}`
                  : movement.payment?.quote
                    ? `Cotización ${movement.payment.quote.number}`
                    : movement.payment
                      ? `Pago ${movement.payment.operationKey}`
                      : "Movimiento";

                const method = movement.payment?.method
                  ? (paymentMethodLabels[movement.payment.method] ?? movement.payment.method)
                  : "—";

                const isPaymentCapture = movement.movementType === "PAYMENT_CAPTURE";
                const isReversed = Boolean(movement.payment?.reversedAt);
                const canReversePayment = isPaymentCapture && movement.payment && !isReversed;

                return (
                  <li key={movement.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border-light)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-[var(--color-text-main)]">{title}</p>
                          {isReversed && (
                            <Badge variant="danger" className="text-xs">
                              Revertido
                            </Badge>
                          )}
                        </div>
                        <time className="text-sm text-[var(--color-text-muted)]" dateTime={movement.createdAt.toISOString()}>
                          {formatDate(movement.createdAt)}
                        </time>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-[var(--color-text-main)]">
                          {movement.type === "DEBIT" ? "-" : "+"}{formatCents(movement.amountCents)}
                        </span>
                        {canReversePayment && movement.payment && (
                          <ReversePaymentDialog
                            paymentId={movement.payment.id}
                            amountCents={movement.amountCents}
                            method={movement.payment.method}
                            paymentDate={movement.createdAt}
                            reference={movement.payment.operationKey}
                            action={reversePaymentAction}
                            triggerLabel="Revertir"
                            triggerSize="sm"
                            triggerVariant="outline"
                            onSuccess={onPaymentReversed}
                          />
                        )}
                        {correctPaymentAction && movement.payment && movement.payment.quote && isPaymentCapture && !isReversed && (
                          <PaymentCorrectionDialog
                            paymentId={movement.payment.id}
                            originalAmountCents={movement.payment.amountCents}
                            originalMethod={movement.payment.method}
                            reference={movement.payment.operationKey}
                            paymentDate={movement.createdAt}
                            quoteNumber={movement.payment.quote.number}
                            action={correctPaymentAction}
                            onSuccess={onPaymentCorrected}
                          />
                        )}
                      </div>
                    </div>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-[var(--color-text-muted)]">Tipo</dt>
                        <dd className="font-medium text-[var(--color-text-main)]">
                          {movementTypeLabels[movement.movementType] ?? movementTypeLabels[movement.type] ?? movement.type}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-muted)]">Método</dt>
                        <dd className="font-medium text-[var(--color-text-main)]">{method}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--color-text-muted)]">Saldo resultante</dt>
                        <dd className="font-medium tabular-nums text-[var(--color-text-main)]">{formatCents(movement.resultingBalanceCents)}</dd>
                      </div>
                    </dl>
                    {movement.reason && (
                      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                        Motivo: <span className="font-medium text-[var(--color-text-main)]">{movement.reason}</span>
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
