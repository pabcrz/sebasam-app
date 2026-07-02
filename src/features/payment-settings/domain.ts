import { prisma } from "@/lib/prisma";

export const PAYMENT_SETTINGS_ID = 1;

export type BankAccountData = {
  id: number;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
  sortOrder: number;
};

export type PaymentSettingsData = {
  name: string;
  fullName: string;
  address: string;
  mapsUrl: string;
  contactPhone: string;
  contactWhatsapp: string;
  bankAccounts: BankAccountData[];
};

/** Editable fields via the main save action (no bank accounts). */
export type PaymentSettingsEditableData = Omit<PaymentSettingsData, "bankAccounts">;

function toSerializable(
  settings: PaymentSettingsEditableData & { bankAccounts: BankAccountData[] },
): PaymentSettingsData {
  return { ...settings };
}

/**
 * Returns the singleton payment settings row with bank accounts ordered by
 * sortOrder, creating it with defaults if it doesn't exist yet.
 */
export async function getPaymentSettings(): Promise<PaymentSettingsData> {
  const settings = await prisma.paymentSettings.upsert({
    where: { id: PAYMENT_SETTINGS_ID },
    update: {},
    create: { id: PAYMENT_SETTINGS_ID },
    include: {
      bankAccounts: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toSerializable(settings);
}

export async function updatePaymentSettings(
  data: Partial<PaymentSettingsEditableData>,
): Promise<PaymentSettingsData> {
  const settings = await prisma.paymentSettings.update({
    where: { id: PAYMENT_SETTINGS_ID },
    data,
    include: {
      bankAccounts: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  return toSerializable(settings);
}

/**
 * Adds a new bank account for the singleton payment settings.
 * The new account gets sortOrder = max existing + 1.
 */
export async function addBankAccount(data: {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
}): Promise<BankAccountData> {
  const current = await prisma.bankAccount.findMany({
    where: { paymentSettingsId: PAYMENT_SETTINGS_ID },
    orderBy: { sortOrder: "desc" },
    take: 1,
  });

  const nextSortOrder = current.length > 0 ? current[0].sortOrder + 1 : 0;

  const account = await prisma.bankAccount.create({
    data: {
      paymentSettingsId: PAYMENT_SETTINGS_ID,
      accountHolder: data.accountHolder.trim(),
      bankName: data.bankName.trim(),
      accountNumber: data.accountNumber.trim(),
      clabe: data.clabe.trim(),
      sortOrder: nextSortOrder,
    },
  });

  return {
    id: account.id,
    accountHolder: account.accountHolder,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    clabe: account.clabe,
    sortOrder: account.sortOrder,
  };
}

/**
 * Removes a bank account by ID. Only accounts belonging to paymentSettingsId=1
 * can be removed.
 */
export async function removeBankAccount(accountId: number): Promise<void> {
  await prisma.bankAccount.delete({
    where: { id: accountId, paymentSettingsId: PAYMENT_SETTINGS_ID },
  });
}
