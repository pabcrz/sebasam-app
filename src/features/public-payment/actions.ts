"use server";

import { revalidatePath } from "next/cache";
import {
  setPaymentRequestInvoicePreference as setPaymentRequestInvoicePreferenceDomain,
  savePaymentRequestFiscalData as savePaymentRequestFiscalDataDomain,
  PaymentRequestNotFoundError,
  PaymentRequestExpiredError,
  PaymentRequestCancelledError,
} from "@/features/payment-requests/domain";

function normalizeError(error: unknown): string {
  if (error instanceof PaymentRequestNotFoundError) {
    return "El enlace de pago no existe o es incorrecto.";
  }

  if (error instanceof PaymentRequestExpiredError) {
    return "El enlace de pago ha vencido.";
  }

  if (error instanceof PaymentRequestCancelledError) {
    return "El enlace de pago fue cancelado.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export async function setPaymentRequestInvoicePreference(token: string, requiresInvoice: boolean) {
  try {
    await setPaymentRequestInvoicePreferenceDomain(token, { requiresInvoice });
    revalidatePath(`/datos-de-pago/${token}`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: normalizeError(error) };
  }
}

export async function savePaymentRequestFiscalData(token: string, formData: FormData) {
  try {
    const data = {
      personType: formData.get("personType") || "INDIVIDUAL",
      businessName: formData.get("businessName"),
      taxId: formData.get("taxId"),
      taxRegime: formData.get("taxRegime"),
      cfdiUse: formData.get("cfdiUse"),
      zipCode: formData.get("zipCode"),
    };

    await savePaymentRequestFiscalDataDomain(token, data);
    revalidatePath(`/datos-de-pago/${token}`);
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: normalizeError(error) };
  }
}
