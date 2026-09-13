import { describe, expect, it } from "vitest";
import {
  formatDocumentPdfFilename,
  formatUtcDateDDMMAAAA,
  resolveVehiclePdfSegment,
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

  describe("resolveVehiclePdfSegment", () => {
    it("prioritizes economicNumber over plate and brand/model", () => {
      expect(
        resolveVehiclePdfSegment({
          economicNumber: "Eco 14",
          plate: "ABC-1234",
          brand: "Freightliner",
          model: "Cascadia",
        }),
      ).toBe("Eco14");
    });

    it("prioritizes plate over brand/model when economicNumber is absent", () => {
      expect(
        resolveVehiclePdfSegment({
          plate: "ABC-1234",
          brand: "Freightliner",
          model: "Cascadia",
        }),
      ).toBe("ABC1234");
    });

    it("combines brand and model when economicNumber and plate are absent", () => {
      expect(
        resolveVehiclePdfSegment({
          brand: "Freightliner",
          model: "Cascadia",
        }),
      ).toBe("FreightlinerCascadia");
    });

    it("handles string literal vehicle like Taller", () => {
      expect(resolveVehiclePdfSegment("Taller")).toBe("Taller");
    });

    it("returns empty string when vehicle is null or empty", () => {
      expect(resolveVehiclePdfSegment(null)).toBe("");
      expect(resolveVehiclePdfSegment(undefined)).toBe("");
      expect(resolveVehiclePdfSegment({})).toBe("");
    });
  });

  describe("formatDocumentPdfFilename", () => {
    it("formats {Customer}-{Driver}-{Unit}-{Folio} for a quote with full details", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Transportes Hernandez",
        driverName: "Don Pepe",
        vehicle: { economicNumber: "Eco 14" },
        folio: "C-090926-01",
      });

      expect(filename).toBe("TransportesHernandez-DonPepe-Eco14-C-090926-01");
    });

    it("formats {Customer}-{Unit}-{Folio} when driver is omitted", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Acme Corp",
        vehicle: { plate: "ABC-1234" },
        folio: "C-090926-01",
      });

      expect(filename).toBe("AcmeCorp-ABC1234-C-090926-01");
    });

    it("formats {Customer}-{Driver}-{Folio} when unit is omitted", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Acme Corp",
        driverName: "Juan Perez",
        folio: "C-090926-01",
      });

      expect(filename).toBe("AcmeCorp-JuanPerez-C-090926-01");
    });

    it("formats {Driver}-{Unit}-{Folio} when customer is absent without emitting SinCliente", () => {
      const filename = formatDocumentPdfFilename({
        customerName: null,
        driverName: "Don Pepe",
        vehicle: { economicNumber: "Eco-14" },
        folio: "C-090926-01",
      });

      expect(filename).toBe("DonPepe-Eco14-C-090926-01");
      expect(filename).not.toContain("SinCliente");
      expect(filename).not.toContain("Sincliente");
    });

    it("formats {Unit}-{Folio} when customer and driver are absent", () => {
      const filename = formatDocumentPdfFilename({
        customerName: undefined,
        driverName: null,
        vehicle: { plate: "XYZ-999" },
        folio: "N-090926-01",
      });

      expect(filename).toBe("XYZ999-N-090926-01");
    });

    it("formats only {Folio} when customer, driver, and vehicle are absent", () => {
      const filename = formatDocumentPdfFilename({
        customerName: null,
        driverName: null,
        vehicle: null,
        folio: "C-090926-01",
      });

      expect(filename).toBe("C-090926-01");
    });

    it("formats special workshop note as Taller-{Folio}", () => {
      const filename = formatDocumentPdfFilename({
        customerName: null,
        vehicle: "Taller",
        folio: "N-090926-01",
      });

      expect(filename).toBe("Taller-N-090926-01");
    });

    it("never emits SEBASAM, SinCliente, SinUnidad, Cotizacion, or Nota", () => {
      const filename = formatDocumentPdfFilename({
        customerName: null,
        driverName: null,
        vehicle: null,
        folio: "N-090926-01",
      });

      expect(filename).not.toContain("SEBASAM");
      expect(filename).not.toContain("SinCliente");
      expect(filename).not.toContain("Sincliente");
      expect(filename).not.toContain("SinUnidad");
      expect(filename).not.toContain("SinFecha");
      expect(filename).not.toContain("Cotizacion");
      expect(filename).not.toContain("Nota");
    });

    it("formats historical record using legacy number as folio", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Empresa",
        folio: "0626-001",
      });

      expect(filename).toBe("Empresa-0626-001");
    });
  });
});
