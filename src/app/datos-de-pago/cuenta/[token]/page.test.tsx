import { describe, expect, it, vi, beforeEach } from "vitest";

const { getPaymentSettings, getPublicBankAccountByToken, getPublicBankNameByToken, notFound, imageResponseMock } = vi.hoisted(() => ({
  getPaymentSettings: vi.fn(),
  getPublicBankAccountByToken: vi.fn(),
  getPublicBankNameByToken: vi.fn(),
  notFound: vi.fn(),
  imageResponseMock: vi.fn(function ImageResponse(element: unknown) { return { element }; }),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("next/og", () => ({ ImageResponse: imageResponseMock }));
vi.mock("@/features/payment-settings/domain", () => ({
  getPaymentSettings,
  getPublicBankAccountByToken,
  getPublicBankNameByToken,
}));

import PublicBankAccountPage, { generateMetadata } from "./page";
import OpenGraphImage from "./opengraph-image";

describe("PublicBankAccountPage", () => {
  it("includes the bank name in metadata without exposing account data", async () => {
    getPublicBankNameByToken.mockResolvedValue("BBVA");
    const result = await generateMetadata({ params: Promise.resolve({ token: "valid-token" }) });
    const serializedMetadata = JSON.stringify(result);
    expect(serializedMetadata).toContain("Datos de cuenta bancaria");
    expect(serializedMetadata).toContain("BBVA");
    expect(serializedMetadata).toContain("realizar tu pago");
    expect(serializedMetadata).not.toMatch(/pago seguro|secure payment|gateway|accountHolder|accountNumber|clabe|123456|012345678901234567|valid-token/i);
  });

  it("uses generic metadata when the bank name is missing", async () => {
    getPublicBankNameByToken.mockResolvedValue("   ");
    const result = await generateMetadata({ params: Promise.resolve({ token: "valid-token" }) });
    expect(JSON.stringify(result)).toContain("Datos de cuenta bancaria");
    expect(JSON.stringify(result)).not.toContain("|    ");
  });

  it("renders a recognizable payment image with bank name and no sensitive or gateway claims", async () => {
    getPublicBankNameByToken.mockResolvedValue("BBVA");
    await OpenGraphImage({ params: Promise.resolve({ token: "valid-token" }) });
    const image = imageResponseMock.mock.calls.at(-1)?.[0];
    expect(JSON.stringify(image)).toContain("Datos de cuenta bancaria");
    expect(JSON.stringify(image)).toContain("BBVA");
    expect(JSON.stringify(image)).not.toMatch(/pago seguro|gateway|accountHolder|accountNumber|clabe|123456|012345678901234567|valid-token/i);
  });

  it("uses a generic bank label in the image when the name is missing", async () => {
    getPublicBankNameByToken.mockResolvedValue(null);
    await OpenGraphImage({ params: Promise.resolve({ token: "valid-token" }) });
    expect(JSON.stringify(imageResponseMock.mock.calls.at(-1)?.[0])).toContain("Banco");
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
