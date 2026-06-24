"use server";

import { requireOperationalRole } from "@/lib/auth/session";
import {
  cancelPaymentRequest as cancelPaymentRequestDomain,
  createPaymentRequestForQuote as createPaymentRequestForQuoteDomain,
  createPaymentRequestForWorkOrder as createPaymentRequestForWorkOrderDomain,
  getPaymentRequestByToken as getPaymentRequestByTokenDomain,
  savePaymentRequestFiscalData as savePaymentRequestFiscalDataDomain,
  setPaymentRequestInvoicePreference as setPaymentRequestInvoicePreferenceDomain,
} from "./domain";

export {
  PaymentRequestAlreadyExistsError,
  PaymentRequestCancelledError,
  PaymentRequestError,
  PaymentRequestExpiredError,
  PaymentRequestNotFoundError,
  PaymentRequestOperationError,
} from "./domain";

export async function getPaymentRequestByToken(token: string) {
  return getPaymentRequestByTokenDomain(token);
}

export async function createPaymentRequestForQuote(quoteId: string, requiresInvoice = false) {
  await requireOperationalRole();
  return createPaymentRequestForQuoteDomain(quoteId, requiresInvoice);
}

export async function createPaymentRequestForWorkOrder(
  workOrderId: string,
  requiresInvoice = false,
) {
  await requireOperationalRole();
  return createPaymentRequestForWorkOrderDomain(workOrderId, requiresInvoice);
}

export async function setPaymentRequestInvoicePreference(token: string, input: unknown) {
  return setPaymentRequestInvoicePreferenceDomain(token, input);
}

export async function savePaymentRequestFiscalData(token: string, input: unknown) {
  return savePaymentRequestFiscalDataDomain(token, input);
}

export async function cancelPaymentRequest(paymentRequestId: string) {
  await requireOperationalRole();
  return cancelPaymentRequestDomain(paymentRequestId);
}
