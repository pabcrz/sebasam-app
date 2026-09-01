import { describe, expect, it, vi, beforeEach } from "vitest";

const { getPaymentSettings, getPublicBankAccountByToken, notFound } = vi.hoisted(() => ({
  getPaymentSettings: vi.fn(),
  getPublicBankAccountByToken: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/features/payment-settings/domain", () => ({
  getPaymentSettings,
  getPublicBankAccountByToken,
}));

import PublicBankAccountPage from "./page";

describe("PublicBankAccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders DirectPaymentPage with only the requested bank account", async () => {
    const singleAccount = {
      id: 1,
      accountHolder: "Titular Uno",
      bankName: "BBVA",
      accountNumber: "123456",
      clabe: "012345678901234567",
      isForInvoicing: false,
      isPubliclyShareable: true,
      publicToken: "valid-token",
      sortOrder: 0,
    };

    getPublicBankAccountByToken.mockResolvedValue(singleAccount);
    getPaymentSettings.mockResolvedValue({
      name: "SEBASAM",
      fullName: "Servicio Básico",
      address: "Address",
      mapsUrl: "https://maps.example.com",
      contactPhone: "5555555555",
      contactWhatsapp: "5555555555",
      bankAccounts: [singleAccount],
    });

    const page = await PublicBankAccountPage({
      params: Promise.resolve({ token: "valid-token" }),
    });

    expect(getPublicBankAccountByToken).toHaveBeenCalledWith("valid-token");
    expect(page.props.bankAccounts).toEqual([singleAccount]);
    expect(page.props.business.businessName).toBe("SEBASAM");
    expect(page.props.location).toEqual({ address: "Address", mapsUrl: "https://maps.example.com" });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("calls notFound when the bank account does not exist or is not publicly shareable", async () => {
    getPublicBankAccountByToken.mockResolvedValue(null);
    getPaymentSettings.mockResolvedValue({
      name: "SEBASAM",
      bankAccounts: [],
    });

    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(
      PublicBankAccountPage({
        params: Promise.resolve({ token: "invalid-or-unshared" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
