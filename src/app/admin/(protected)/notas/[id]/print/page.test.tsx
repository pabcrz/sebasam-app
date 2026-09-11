import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  notFound: vi.fn(),
  useSearchParams: () => new URLSearchParams(),
}));

const { getCompletedWorkOrderById, getPaymentSettings } = vi.hoisted(() => ({
  getCompletedWorkOrderById: vi.fn(),
  getPaymentSettings: vi.fn(),
}));

vi.mock("@/features/work-orders/queries", () => ({ getCompletedWorkOrderById }));
vi.mock("@/features/payment-settings/domain", () => ({ getPaymentSettings }));
vi.mock("@/features/quotes/components/print-controls", () => ({ PrintControls: () => <button type="button">Imprimir</button> }));

import WorkOrderPrintPage, { generateMetadata } from "./page";

describe("WorkOrderPrintPage", () => {
  it("identifies legacy special work as Taller in the printed note", async () => {
    getCompletedWorkOrderById.mockResolvedValue({
      number: "T-001",
      isSpecial: true,
      specialAssigneeName: "Nombre heredado",
      completedAt: new Date("2026-08-14T12:00:00Z"),
      assignments: [],
      quote: {
        number: "C-001",
        title: "Servicio general",
        customer: { name: "Cliente Demo", phone: null, email: null },
        vehicle: null,
        administrative: true,
        items: [],
        subtotalCents: 0,
        discountCents: 0,
        taxEnabled: false,
        taxCents: 0,
        totalCents: 0,
        operationalDate: new Date("2026-08-14T00:00:00.000Z"),
      },
    });
    getPaymentSettings.mockResolvedValue({
      name: "SEBASAM",
      fullName: "Servicio y Refacciones para Suspensiones de Aire y Muelles",
      address: "Batalla de Casa Blanca",
      contactPhone: "5555555555",
      contactWhatsapp: "5555555555",
    });

    const { container } = render(await WorkOrderPrintPage({ params: Promise.resolve({ id: "wo-1" }) }));

    expect(screen.getByText("Taller")).toBeInTheDocument();
    expect(screen.queryByText("Nombre heredado")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Servicio general" })).toBeInTheDocument();
    expect(screen.getByText("Nota administrativa")).toBeInTheDocument();
    expect(screen.getByAltText("Logo de SEBASAM")).toHaveAttribute("src", expect.stringContaining("logo-white-short.png"));
    expect(screen.getByText("Servicio y Refacciones para Suspensiones de Aire y Muelles")).toHaveClass("font-mono", "print:text-[10px]");
    expect(screen.getByText("Batalla de Casa Blanca")).not.toHaveAttribute("href");
    expect(screen.queryByRole("link", { name: /Batalla de Casa Blanca/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Cotización/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Imprimir documento" })).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("print:min-h-0");
  });

  describe("generateMetadata", () => {
    it("generates dynamic filename with customer, type and folio for special work orders", async () => {
      getCompletedWorkOrderById.mockResolvedValue({
        number: "T-001",
        folio: "N-140826-01",
        status: "COMPLETED",
        isSpecial: true,
        completedAt: new Date("2026-08-14T12:00:00Z"),
        quote: {
          number: "C-001",
          folio: null,
          customer: { name: "Transportes Del Norte" },
          vehicle: null,
          vehicleSnapshot: null,
          operationalDate: new Date("2026-08-14T00:00:00.000Z"),
        },
      });

      const result = await generateMetadata({ params: Promise.resolve({ id: "wo-1" }) });
      expect(result).toEqual({
        title: "TransportesDelNorte-Nota-N-140826-01",
      });
    });

    it("generates dynamic filename falling back to quote number for historical records", async () => {
      getCompletedWorkOrderById.mockResolvedValue({
        number: "OT-002",
        folio: null,
        status: "COMPLETED",
        isSpecial: false,
        completedAt: new Date("2026-08-14T12:00:00Z"),
        quote: {
          number: "C-002",
          customer: { name: "José Pérez" },
          vehicle: { brand: "Kenworth", model: "T680", plate: "ABC1234" },
          vehicleSnapshot: null,
          operationalDate: new Date("2026-06-18T00:00:00.000Z"),
        },
      });

      const result = await generateMetadata({ params: Promise.resolve({ id: "wo-2" }) });
      expect(result).toEqual({
        title: "JosePerez-Nota-C-002",
      });
    });

    it("generates dynamic filename with customer and folio when operationalDate is missing on the quote", async () => {
      getCompletedWorkOrderById.mockResolvedValue({
        number: "OT-003",
        folio: "N-140826-03",
        status: "COMPLETED",
        isSpecial: false,
        completedAt: new Date("2026-08-14T00:00:00.000Z"),
        quote: {
          number: "C-003",
          customer: { name: "Cliente" },
          vehicle: { brand: "Volvo", model: "VNL", plate: null },
          vehicleSnapshot: null,
          operationalDate: null,
        },
      });

      const result = await generateMetadata({ params: Promise.resolve({ id: "wo-3" }) });
      expect(result).toEqual({
        title: "Cliente-Nota-N-140826-03",
      });
    });

    it("returns fallback title 'Nota' when work order is not found", async () => {
      getCompletedWorkOrderById.mockResolvedValue(null);

      const result = await generateMetadata({ params: Promise.resolve({ id: "wo-missing" }) });
      expect(result).toEqual({
        title: "Nota",
      });
    });
  });
});
