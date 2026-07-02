import { describe, expect, it, vi, beforeEach } from "vitest";
import { savePaymentSettingsAction } from "./actions";

vi.mock("@/lib/auth/session", () => ({
  requireOperationalRole: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./domain", () => ({
  updatePaymentSettings: vi.fn().mockResolvedValue(undefined),
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
