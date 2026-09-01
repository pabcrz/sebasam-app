import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  addBankAccountAction,
  savePaymentSettingsAction,
  setBankAccountPublicSharingAction,
} from "./actions";

const { addBankAccount, setBankAccountPublicSharing, revalidatePath } = vi.hoisted(() => ({
  addBankAccount: vi.fn().mockResolvedValue(undefined),
  setBankAccountPublicSharing: vi.fn().mockResolvedValue(undefined),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("./domain", () => ({
  updatePaymentSettings: vi.fn().mockResolvedValue(undefined),
  addBankAccount,
  removeBankAccount: vi.fn(),
  setBankAccountPublicSharing,
}));

function formDataWithMapsUrl(mapsUrl: string): FormData {
  const fd = new FormData();
  fd.set("name", "SEBASAM");
  fd.set("fullName", "Test Full Name");
  fd.set("address", "Test Address");
  fd.set("mapsUrl", mapsUrl);
  fd.set("contactPhone", "5555555555");
  fd.set("contactWhatsapp", "5555555555");
  return fd;
}

describe("savePaymentSettingsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success for a valid https URL", async () => {
    const result = await savePaymentSettingsAction(
      formDataWithMapsUrl("https://maps.app.goo.gl/test"),
    );

    expect(result).toEqual({ success: true });
  });

  it("returns success for a valid http URL", async () => {
    const result = await savePaymentSettingsAction(
      formDataWithMapsUrl("http://maps.example.com/test"),
    );

    expect(result).toEqual({ success: true });
  });

  it("returns error for a URL without scheme", async () => {
    const result = await savePaymentSettingsAction(
      formDataWithMapsUrl("maps.app.goo.gl/test"),
    );

    expect(result).toEqual({
      success: false,
      error: "La URL de Google Maps debe comenzar con http:// o https://.",
    });
  });

  it("returns error for javascript: URL", async () => {
    const result = await savePaymentSettingsAction(
      formDataWithMapsUrl("javascript:alert(1)"),
    );

    expect(result).toEqual({
      success: false,
      error: "La URL de Google Maps debe comenzar con http:// o https://.",
    });
  });

  it("returns error for data: URL", async () => {
    const result = await savePaymentSettingsAction(
      formDataWithMapsUrl("data:text/html,<script>alert(1)</script>"),
    );

    expect(result).toEqual({
      success: false,
      error: "La URL de Google Maps debe comenzar con http:// o https://.",
    });
  });

  it("returns error for empty mapsUrl", async () => {
    const result = await savePaymentSettingsAction(formDataWithMapsUrl(""));

    expect(result).toEqual({
      success: false,
      error: "La URL de Google Maps debe comenzar con http:// o https://.",
    });
  });
});

it("maps the invoicing checkbox when adding a bank account", async () => {
  const formData = new FormData();
  formData.set("accountHolder", "Juan Pérez");
  formData.set("bankName", "BBVA");
  formData.set("clabe", "123456789012345678");
  formData.set("isForInvoicing", "on");

  await addBankAccountAction(formData);

  expect(addBankAccount).toHaveBeenCalledWith(expect.objectContaining({ isForInvoicing: true }));
});

it("maps an unchecked invoicing checkbox to false", async () => {
  const formData = new FormData();
  formData.set("accountHolder", "Juan Pérez");
  formData.set("bankName", "BBVA");
  formData.set("clabe", "123456789012345678");

  await addBankAccountAction(formData);

  expect(addBankAccount).toHaveBeenCalledWith(
    expect.objectContaining({ isForInvoicing: false }),
  );
});

describe("setBankAccountPublicSharingAction", () => {
  it("persists the flag and revalidates relevant public and admin routes", async () => {
    const result = await setBankAccountPublicSharingAction(3, true);

    expect(result).toEqual({ success: true });
    expect(setBankAccountPublicSharing).toHaveBeenCalledWith(3, true);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/configuracion-pago");
    expect(revalidatePath).toHaveBeenCalledWith("/datos-de-pago/cuenta/[token]", "page");
  });
});
