import { describe, expect, it, vi } from "vitest";

const { connection, getPaymentSettings, callOrder } = vi.hoisted(() => ({
  connection: vi.fn(),
  getPaymentSettings: vi.fn(),
  callOrder: [] as string[],
}));

vi.mock("next/server", () => ({ connection }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));

import DatosPagoPage from "./page";

describe("DatosPagoPage", () => {
  it("waits for the request-time boundary before loading payment settings", async () => {
    const bankAccounts = [
      {
        id: 1,
        accountHolder: "Invoice Account",
        bankName: "Invoice Bank",
        accountNumber: "111",
        clabe: "111111111111111111",
        isForInvoicing: true,
        sortOrder: 1,
      },
      {
        id: 2,
        accountHolder: "Payment Account",
        bankName: "Payment Bank",
        accountNumber: "222",
        clabe: "222222222222222222",
        isForInvoicing: false,
        sortOrder: 2,
      },
    ];
    connection.mockImplementation(async () => {
      callOrder.push("connection");
    });
    getPaymentSettings.mockImplementation(async () => {
      callOrder.push("settings");
      return {
        name: "SEBASAM",
        contactPhone: "5555555555",
        contactWhatsapp: "5555555555",
        hours: { weekdays: "Weekdays", saturday: "Saturday" },
        services: [],
        products: [],
        bankAccounts,
      };
    });

    const page = await DatosPagoPage();

    expect(callOrder).toEqual(["connection", "settings"]);
    expect(page.props.bankAccounts).toEqual(bankAccounts);
    expect(page.props.business).toEqual({
      businessName: "SEBASAM",
      phone: "5555555555",
      whatsapp: "5555555555",
    });
  });
});
