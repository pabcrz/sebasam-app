import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";

const { findMany, create } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockImplementation(async ({ data }) => ({ id: 1, ...data })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bankAccount: { findMany, create },
  },
}));

import { addBankAccount } from "./domain";

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
