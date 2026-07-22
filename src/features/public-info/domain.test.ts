import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicInfoDefaults } from "@/config/public-info";

const { findUnique } = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentSettings: { findUnique },
  },
}));

import {
  getPublicInfoSettings,
  PUBLIC_INFO_SLOW_QUERY_THRESHOLD_MS,
} from "./domain";

const storedSettings = {
  name: "Taller público",
  fullName: "Taller público de suspensiones",
  address: "Dirección pública",
  mapsUrl: "https://maps.example.com/public",
  contactPhone: "5556007675",
  contactWhatsapp: "5536239346",
  hours: {
    weekdays: "Lunes a viernes",
    saturday: "Sábado",
    sunday: "",
  },
  services: ["Alineación", "", "  ", "Soldadura"],
  products: ["Bujes"],
};

describe("getPublicInfoSettings", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    findUnique.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("selects and normalizes only public singleton fields", async () => {
    findUnique.mockResolvedValue(storedSettings);

    await expect(getPublicInfoSettings()).resolves.toEqual({
      ...storedSettings,
      hours: { ...storedSettings.hours, sunday: null },
      services: ["Alineación", "Soldadura"],
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        name: true,
        fullName: true,
        address: true,
        mapsUrl: true,
        contactPhone: true,
        contactWhatsapp: true,
        hours: true,
        services: true,
        products: true,
      },
    });

    const select = findUnique.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("bankAccounts");
    expect(select).not.toHaveProperty("updatedAt");
  });

  it("returns central defaults when the singleton is missing", async () => {
    findUnique.mockResolvedValue(null);

    await expect(getPublicInfoSettings()).resolves.toBe(publicInfoDefaults);
  });

  it("returns defaults and logs no error details when Prisma fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    findUnique.mockRejectedValue(
      new Error("postgres://secret-user:secret-password@private-host/database"),
    );

    await expect(getPublicInfoSettings()).resolves.toBe(publicInfoDefaults);
    expect(consoleError).toHaveBeenCalledOnce();
    expect(consoleError).toHaveBeenCalledWith(
      "[public-info] settings query failed; using defaults",
    );
  });

  it("warns only after the slow-query threshold", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    findUnique
      .mockImplementationOnce(async () => {
        vi.advanceTimersByTime(PUBLIC_INFO_SLOW_QUERY_THRESHOLD_MS);
        return storedSettings;
      })
      .mockImplementationOnce(async () => {
        vi.advanceTimersByTime(PUBLIC_INFO_SLOW_QUERY_THRESHOLD_MS + 1);
        return storedSettings;
      });

    await getPublicInfoSettings();
    expect(consoleWarn).not.toHaveBeenCalled();

    await getPublicInfoSettings();
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(consoleWarn).toHaveBeenCalledWith(
      `[public-info] settings query slow: ${(
        PUBLIC_INFO_SLOW_QUERY_THRESHOLD_MS + 1
      ).toFixed(1)}ms`,
    );
  });
});
