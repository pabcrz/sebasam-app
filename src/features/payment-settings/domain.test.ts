import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

const { findMany, create, upsert } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankAccount: { findMany, create },
    paymentSettings: { upsert },
  },
}));

import { addBankAccount, getPaymentSettings } from "./domain";

const storedSettings = {
  name: "SEBASAM",
  fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
  address: "Dirección",
  mapsUrl: "https://maps.example.com",
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
  hours: {
    weekdays: "Lunes a viernes",
    saturday: "Sábado",
    sunday: "",
  },
  services: ["Alineación", "", "  ", "Soldadura"],
  products: ["Bujes"],
  bankAccounts: [],
};

describe("getPaymentSettings", () => {
  it("normalizes persisted public workshop fields", async () => {
    upsert.mockResolvedValue(storedSettings);

    await expect(getPaymentSettings()).resolves.toMatchObject({
      hours: { weekdays: "Lunes a viernes", saturday: "Sábado", sunday: null },
      services: ["Alineación", "Soldadura"],
      products: ["Bujes"],
    });
  });

  it("uses safe hours defaults when persisted JSON is incomplete", async () => {
    upsert.mockResolvedValue({
      ...storedSettings,
      hours: { weekdays: "", saturday: null },
      services: null,
      products: null,
    });

    await expect(getPaymentSettings()).resolves.toMatchObject({
      hours: {
        weekdays: "Lunes a viernes de 9:00 a 18:00",
        saturday: "Sábados de 9:00 a 15:00",
        sunday: null,
      },
      services: [],
      products: [],
    });
  });
});

describe("addBankAccount", () => {
  it("passes the invoicing flag to Prisma", async () => {
    await addBankAccount({
      accountHolder: "Juan Pérez",
      bankName: "BBVA",
      accountNumber: "",
      clabe: "123456789012345678",
      isForInvoicing: false,
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isForInvoicing: false }),
    });
  });

  it("keeps the schema default and migration compatible with existing rows", async () => {
    const [schema, migration] = await Promise.all([
      readFile("prisma/schema.prisma", "utf8"),
      readFile(
        "prisma/migrations/20260711120000_add_bank_account_invoicing_flag/migration.sql",
        "utf8",
      ),
    ]);

    expect(schema).toMatch(/isForInvoicing\s+Boolean\s+@default\(false\)/);
    expect(migration).toMatch(
      /ADD COLUMN "isForInvoicing" BOOLEAN NOT NULL DEFAULT false/,
    );
  });
});
