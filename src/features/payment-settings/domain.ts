import { prisma } from "@/lib/prisma";

export const PAYMENT_SETTINGS_ID = 1;

export type BankAccountData = {
  id: number;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  clabe: string;
  isForInvoicing: boolean;
  sortOrder: number;
};

export type WorkshopHours = {
  weekdays: string;
  saturday: string;
  sunday?: string | null;
};

export type PaymentSettingsData = {
  name: string;
  fullName: string;
  address: string;
  mapsUrl: string;
  contactPhone: string;
  contactWhatsapp: string;
  hours: WorkshopHours;
  services: string[];
  products: string[];
  bankAccounts: BankAccountData[];
};

/** Editable fields via the main save action (no bank accounts). */
export type PaymentSettingsEditableData = Omit<PaymentSettingsData, "bankAccounts">;

const DEFAULT_HOURS: WorkshopHours = {
  weekdays: "Lunes a viernes de 9:00 a 18:00",
  saturday: "Sábados de 9:00 a 15:00",
};

export function normalizeStringArray(value: string[] | null | undefined): string[] {
  if (!value) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

export function deserializeHours(raw: unknown): WorkshopHours {
  if (!raw || typeof raw !== "object") return DEFAULT_HOURS;
  const hours = raw as Record<string, unknown>;
  return {
    weekdays:
      typeof hours.weekdays === "string" && hours.weekdays.trim() !== ""
        ? hours.weekdays
        : DEFAULT_HOURS.weekdays,
    saturday:
      typeof hours.saturday === "string" && hours.saturday.trim() !== ""
        ? hours.saturday
        : DEFAULT_HOURS.saturday,
    sunday:
      typeof hours.sunday === "string" && hours.sunday.trim() !== "" ? hours.sunday : null,
  };
}

function toSerializable(
  settings: Omit<PaymentSettingsData, "hours" | "services" | "products"> & {
    hours: unknown;
    services: string[] | null;
    products: string[] | null;
    bankAccounts: BankAccountData[];
  },
): PaymentSettingsData {
  return {
    ...settings,
    hours: deserializeHours(settings.hours),
    services: normalizeStringArray(settings.services),
    products: normalizeStringArray(settings.products),
  };
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
  isForInvoicing: boolean;
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
      isForInvoicing: data.isForInvoicing,
      sortOrder: nextSortOrder,
    },
  });

  return {
    id: account.id,
    accountHolder: account.accountHolder,
    bankName: account.bankName,
    accountNumber: account.accountNumber,
    clabe: account.clabe,
    isForInvoicing: account.isForInvoicing,
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
