import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

const { findMany, create, findUnique, findFirst, updateMany, update, upsert } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankAccount: { findMany, findFirst, updateMany, create },
    paymentSettings: { findUnique, update, upsert },
  },
}));

import {
  addBankAccount,
  getPaymentSettings,
  updatePaymentSettings,
  getPublicBankAccountByToken,
  setBankAccountPublicSharing,
} from "./domain";

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
  it("reads the singleton with ordered accounts and normalizes persisted fields", async () => {
    findUnique.mockResolvedValue({
      ...storedSettings,
      bankAccounts: [
        { id: 1, sortOrder: 0 },
        { id: 2, sortOrder: 1 },
      ],
    });

    await expect(getPaymentSettings()).resolves.toMatchObject({
      hours: { weekdays: "Lunes a viernes", saturday: "Sábado", sunday: null },
      services: ["Alineación", "Soldadura"],
      products: ["Bujes"],
      bankAccounts: [{ id: 1 }, { id: 2 }],
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { bankAccounts: { orderBy: { sortOrder: "asc" } } },
    });
  });

  it("uses safe hours defaults when persisted JSON is incomplete", async () => {
    findUnique.mockResolvedValue({
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

  it("returns schema defaults without writing when the singleton is missing", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getPaymentSettings()).resolves.toEqual({
      name: "SEBASAM",
      fullName: "Servicio Básico a Suspensiones y Aire y Muelles",
      address: "Batalla de Casa Blanca 1719B, Leyes de Reforma, Iztapalapa, 09310 Ciudad de México, CDMX",
      mapsUrl: "https://maps.app.goo.gl/MYuGBKwabPGbea7y7",
      contactPhone: "5556007675",
      contactWhatsapp: "5536239346",
      hours: {
        weekdays: "Lunes a viernes de 9:00 a 18:00",
        saturday: "Sábados de 9:00 a 15:00",
      },
      services: ["Alineación de ejes", "Brio a muelles", "Refuerzos", "Soldadura"],
      products: ["Abrazaderas", "Bujes", "Perchas", "Columpios", "Tensores", "Balancines"],
      bankAccounts: [],
    });
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("propagates database read failures", async () => {
    const error = new Error("database unavailable");
    findUnique.mockRejectedValue(error);

    await expect(getPaymentSettings()).rejects.toBe(error);
  });

  it("only queries explicitly shareable, complete accounts by stable token", async () => {
    findFirst.mockResolvedValue(null);

    await expect(getPublicBankAccountByToken("stable-token")).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        publicToken: "stable-token",
        paymentSettingsId: 1,
        isPubliclyShareable: true,
        accountHolder: { not: "" },
        bankName: { not: "" },
        OR: [{ accountNumber: { not: "" } }, { clabe: { not: "" } }],
      },
    });
  });

  it("toggles sharing only for accounts owned by the payment settings singleton", async () => {
    await setBankAccountPublicSharing(7, true);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 7, paymentSettingsId: 1 },
      data: { isPubliclyShareable: true },
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
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      update: {},
      create: { id: 1 },
    });
  });

  it("keeps the schema default and migration compatible with existing rows", async () => {
    const [schema, migration, publicMigration] = await Promise.all([
      readFile("prisma/schema.prisma", "utf8"),
      readFile(
        "prisma/migrations/20260711120000_add_bank_account_invoicing_flag/migration.sql",
        "utf8",
      ),
      readFile(
        "prisma/migrations/20260831000000_add_public_bank_account_links/migration.sql",
        "utf8",
      ),
    ]);

    expect(schema).toMatch(/isForInvoicing\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/isPubliclyShareable\s+Boolean\s+@default\(false\)/);
    expect(schema).toMatch(/publicToken\s+String\s+@unique\s+@default\(uuid\(\)\)/);
    expect(migration).toMatch(
      /ADD COLUMN "isForInvoicing" BOOLEAN NOT NULL DEFAULT false/,
    );
    expect(publicMigration).toMatch(/"isPubliclyShareable" BOOLEAN NOT NULL DEFAULT false/);
    expect(publicMigration).toMatch(/"publicToken" TEXT NOT NULL DEFAULT gen_random_uuid\(\)/);
  });
});

describe("updatePaymentSettings", () => {
  it("owns singleton creation in the explicit admin write path", async () => {
    upsert.mockResolvedValue(storedSettings);

    await updatePaymentSettings({ name: "Updated name" });

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      update: { name: "Updated name" },
      create: { id: 1, name: "Updated name" },
      include: { bankAccounts: { orderBy: { sortOrder: "asc" } } },
    });
  });
});
