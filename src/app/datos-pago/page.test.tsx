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
    connection.mockImplementation(async () => {
      callOrder.push("connection");
    });
    getPaymentSettings.mockImplementation(async () => {
      callOrder.push("settings");
      return {
        name: "SEBASAM",
        fullName: "SEBASAM",
        address: "Address",
        mapsUrl: "https://maps.example.com",
        contactPhone: "5555555555",
        contactWhatsapp: "5555555555",
        hours: { weekdays: "Weekdays", saturday: "Saturday" },
        services: [],
        products: [],
        bankAccounts: [],
      };
    });

    await DatosPagoPage();

    expect(callOrder).toEqual(["connection", "settings"]);
  });
});
