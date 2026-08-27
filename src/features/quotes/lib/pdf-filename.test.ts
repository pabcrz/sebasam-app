import { describe, expect, it } from "vitest";
import {
  formatDocumentPdfFilename,
  formatUtcDateDDMMAAAA,
  sanitizeFilenameSegment,
} from "./pdf-filename";

describe("pdf-filename", () => {
  describe("sanitizeFilenameSegment", () => {
    it("normalizes unicode diacritics and removes accents", () => {
      expect(sanitizeFilenameSegment("José Pérez")).toBe("JosePerez");
      expect(sanitizeFilenameSegment("Álvaro Peña")).toBe("AlvaroPena");
      expect(sanitizeFilenameSegment("CAMIÓN")).toBe("CAMION");
    });

    it("removes invalid filename characters and whitespace", () => {
      expect(sanitizeFilenameSegment('Cliente / Test : * ? " < > |')).toBe("ClienteTest");
      expect(sanitizeFilenameSegment("  Transportes   Norte  ")).toBe("TransportesNorte");
    });
  });

  describe("formatUtcDateDDMMAAAA", () => {
    it("formats date in UTC DDMMAAAA components avoiding timezone shifts", () => {
      const utcDate = new Date("2026-06-18T00:00:00.000Z");
      expect(formatUtcDateDDMMAAAA(utcDate)).toBe("18062026");

      const utcLateDate = new Date("2026-06-18T23:59:59.999Z");
      expect(formatUtcDateDDMMAAAA(utcLateDate)).toBe("18062026");

      const beginningOfYear = new Date("2026-01-05T02:00:00.000Z");
      expect(formatUtcDateDDMMAAAA(beginningOfYear)).toBe("05012026");
    });

    it("returns SinFecha when date is missing or invalid", () => {
      expect(formatUtcDateDDMMAAAA(null)).toBe("SinFecha");
      expect(formatUtcDateDDMMAAAA(undefined)).toBe("SinFecha");
      expect(formatUtcDateDDMMAAAA("not-a-date")).toBe("SinFecha");
    });
  });

  describe("formatDocumentPdfFilename", () => {
    it("formats complete filename with customer, vehicle brand, and operational date", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Cristian Del Toro",
        vehicle: { brand: "freightliner", model: null, plate: null },
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(filename).toBe("CristianDelToro-freightliner-18062026");
    });

    it("normalizes diacritics and strips special characters in customer and vehicle", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "José Pérez / Transportes",
        vehicle: { brand: "Camión", model: "Tracto / Especial", plate: null },
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(filename).toBe("JosePerezTransportes-CamionTractoEspecial-18062026");
    });

    it("prioritizes plates over brand/model when plate is present", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Juan",
        vehicle: { brand: "Freightliner", model: "Cascadia", plate: "ABC1234" },
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(filename).toBe("Juan-ABC1234-18062026");
    });

    it("uses brand/model when plate is missing or placeholder 'Sin placas'", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Logística Express",
        vehicle: { brand: "Kenworth", model: "T680", plate: "Sin placas" },
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(filename).toBe("LogisticaExpress-KenworthT680-18062026");
    });

    it("handles string vehicle directly (e.g. special workshop note 'Taller')", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Mantenimiento Interno",
        vehicle: "Taller",
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(filename).toBe("MantenimientoInterno-Taller-18062026");
    });

    it("applies fallbacks SinCliente and SinUnidad when customer or vehicle are null/empty", () => {
      const filename = formatDocumentPdfFilename({
        customerName: null,
        vehicle: null,
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(filename).toBe("SinCliente-SinUnidad-18062026");

      const whitespaceFilename = formatDocumentPdfFilename({
        customerName: "   ",
        vehicle: { brand: "", model: "", plate: "" },
        operationalDate: new Date("2026-06-18T00:00:00.000Z"),
      });

      expect(whitespaceFilename).toBe("SinCliente-SinUnidad-18062026");
    });

    it("preserves UTC date regardless of system timezone", () => {
      const date = new Date("2026-06-18T23:45:00.000Z");
      const filename = formatDocumentPdfFilename({
        customerName: "Cliente",
        vehicle: "Unidad1",
        operationalDate: date,
      });

      expect(filename).toBe("Cliente-Unidad1-18062026");
    });
  });
});
