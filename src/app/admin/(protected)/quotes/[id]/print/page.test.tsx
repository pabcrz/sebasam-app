import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

const { getQuoteById, getPaymentSettings } = vi.hoisted(() => ({
  getQuoteById: vi.fn(),
  getPaymentSettings: vi.fn(),
}));

vi.mock("@/features/quotes/queries", () => ({ getQuoteById }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));
vi.mock("@/features/quotes/components/print-controls", () => ({ PrintControls: () => <button type="button">Imprimir</button> }));

import QuotePrintPage from "./page";

describe("QuotePrintPage", () => {
  it("renders the approved public brand contract for printed quotes", async () => {
    getQuoteById.mockResolvedValue({
      number: "C-001",
      title: "Servicio general",
      customer: { name: "Cliente Demo", phone: null, email: null },
      vehicle: null,
      vehicleSnapshot: null,
      workOrder: null,
      administrative: false,
      items: [],
      subtotalCents: 0,
      discountCents: 0,
      taxEnabled: false,
      taxCents: 0,
      totalCents: 0,
      operationalDate: new Date("2026-08-14T00:00:00.000Z"),
    });
    getPaymentSettings.mockResolvedValue({
      name: "SEBASAM",
      fullName: "Servicio y Refacciones para Suspensiones de Aire y Muelles",
      address: "Batalla de Casa Blanca",
      mapsUrl: "not a URL",
      contactPhone: "5555555555",
      contactWhatsapp: "5555555555",
    });

    const { container } = render(await QuotePrintPage({ params: Promise.resolve({ id: "quote-1" }) }));

    expect(screen.getByAltText("Logo de SEBASAM")).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByText("Servicio y Refacciones para Suspensiones de Aire y Muelles")).toHaveClass("font-mono", "print:text-[10px]");
    expect(screen.getByText("Batalla de Casa Blanca")).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: /Batalla de Casa Blanca/i })).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("print:min-h-0");
  });
});
