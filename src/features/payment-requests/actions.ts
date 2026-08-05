"use server";

import { requireOperationalRole } from "@/lib/auth/session";
import {
  cancelPaymentRequest as cancelPaymentRequestDomain,
  createPaymentRequestForQuote as createPaymentRequestForQuoteDomain,
  createPaymentRequestForWorkOrder as createPaymentRequestForWorkOrderDomain,
  getOrCreatePaymentRequestForQuote as getOrCreatePaymentRequestForQuoteDomain,
  getPaymentRequestByToken as getPaymentRequestByTokenDomain,
  savePaymentRequestFiscalData as savePaymentRequestFiscalDataDomain,
  setPaymentRequestInvoicePreference as setPaymentRequestInvoicePreferenceDomain,
} from "./domain";

export async function getPaymentRequestByToken(token: string) {
  return getPaymentRequestByTokenDomain(token);
}

export async function createPaymentRequestForQuote(quoteId: string) {
  await requireOperationalRole();
  return createPaymentRequestForQuoteDomain(quoteId);
}

export async function getOrCreatePaymentRequestForQuote(quoteId: string) {
  await requireOperationalRole();
  return getOrCreatePaymentRequestForQuoteDomain(quoteId);
}

export async function createPaymentRequestForWorkOrder(workOrderId: string) {
  await requireOperationalRole();
  return createPaymentRequestForWorkOrderDomain(workOrderId);
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
