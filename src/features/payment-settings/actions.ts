"use server";

import { revalidatePath } from "next/cache";
import { requireOperationalRole } from "@/lib/auth/session";
import { updatePaymentSettings, addBankAccount, removeBankAccount, setBankAccountPublicSharing } from "./domain";

function isValidUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

export async function savePaymentSettingsAction(formData: FormData) {
  await requireOperationalRole();

  const mapsUrl = (formData.get("mapsUrl") as string) ?? "";

  if (!isValidUrl(mapsUrl)) {
    return { success: false as const, error: "La URL de Google Maps debe comenzar con http:// o https://." };
  }

  const data = {
    name: formData.get("name") as string,
    fullName: formData.get("fullName") as string,
    address: formData.get("address") as string,
    mapsUrl,
    contactPhone: formData.get("contactPhone") as string,
    contactWhatsapp: formData.get("contactWhatsapp") as string,
  };

  await updatePaymentSettings(data);

  revalidatePath("/datos-pago");
  revalidatePath("/admin/configuracion-pago");

  return { success: true as const };
}

export async function addBankAccountAction(formData: FormData) {
  await requireOperationalRole();

  const accountHolder = ((formData.get("accountHolder") as string) ?? "").trim();
  const bankName = ((formData.get("bankName") as string) ?? "").trim();
  const accountNumber = ((formData.get("accountNumber") as string) ?? "").trim();
  const clabe = ((formData.get("clabe") as string) ?? "").trim();
  const isForInvoicing = formData.get("isForInvoicing") === "on";

  if (!accountHolder || !bankName) {
    return { success: false as const, error: "Titular y banco son requeridos." };
  }

  if (!accountNumber && !clabe) {
    return { success: false as const, error: "Ingresa No. de cuenta o CLABE." };
  }

  await addBankAccount({ accountHolder, bankName, accountNumber, clabe, isForInvoicing });

  revalidatePath("/admin/configuracion-pago");

  return { success: true as const };
}

export async function removeBankAccountAction(accountId: number) {
  await requireOperationalRole();

  await removeBankAccount(accountId);

  revalidatePath("/admin/configuracion-pago");

  return { success: true as const };
}

export async function setBankAccountPublicSharingAction(accountId: number, enabled: boolean) {
  await requireOperationalRole();
  await setBankAccountPublicSharing(accountId, enabled);
  revalidatePath("/admin/configuracion-pago");
  revalidatePath("/datos-de-pago/cuenta/[token]", "page");
  return { success: true as const };
}

/** Form-action wrapper that reads accountId from FormData. */
export async function removeBankAccountFormAction(formData: FormData): Promise<void> {
  const accountId = parseInt(formData.get("accountId") as string, 10);
  if (Number.isNaN(accountId)) {
    return;
  }
  await removeBankAccountAction(accountId);
}
