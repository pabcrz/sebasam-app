import { describe, expect, it, vi, beforeEach } from "vitest";

const { getPaymentSettings, getPublicBankAccountByToken, notFound, imageResponseMock } = vi.hoisted(() => ({
  getPaymentSettings: vi.fn(),
  getPublicBankAccountByToken: vi.fn(),
  notFound: vi.fn(),
  imageResponseMock: vi.fn(function ImageResponse(element: unknown) { return { element }; }),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("next/og", () => ({ ImageResponse: imageResponseMock }));
vi.mock("@/features/payment-settings/domain", () => ({
  getPaymentSettings,
  getPublicBankAccountByToken,
}));

import PublicBankAccountPage, { metadata } from "./page";
import OpenGraphImage from "./opengraph-image";

describe("PublicBankAccountPage", () => {
  it("describes payment account details without exposing account data", () => {
    const serializedMetadata = JSON.stringify(metadata);
    expect(serializedMetadata).toContain("Datos de cuenta bancaria");
    expect(serializedMetadata).toContain("realizar tu pago");
    expect(serializedMetadata).not.toMatch(/accountNumber|clabe|123456|012345678901234567/i);
  });

  it("renders a recognizable payment image without account details", () => {
    OpenGraphImage();
    const image = imageResponseMock.mock.calls.at(-1)?.[0];
    expect(JSON.stringify(image)).toContain("Datos de cuenta bancaria");
    expect(JSON.stringify(image)).toContain("PAGO SEGURO");
    expect(JSON.stringify(image)).not.toMatch(/accountNumber|clabe|123456|012345678901234567/i);
  });

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
