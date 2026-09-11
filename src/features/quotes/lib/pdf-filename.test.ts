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
    it("formats {Customer}-{Type}-{Folio} for a quote with customer", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Acme Corp",
        documentType: "Cotización",
        folio: "C-090926-01",
      });

      expect(filename).toBe("AcmeCorp-Cotizacion-C-090926-01");
    });

    it("formats {Customer}-{Type}-{Folio} for a completed note with customer", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Acme",
        documentType: "Nota",
        folio: "N-090926-01",
      });

      expect(filename).toBe("Acme-Nota-N-090926-01");
    });

    it("omits empty customer without placeholder text", () => {
      const filenameNull = formatDocumentPdfFilename({
        customerName: null,
        documentType: "Nota",
        folio: "N-090926-01",
      });
      expect(filenameNull).toBe("Nota-N-090926-01");

      const filenameEmpty = formatDocumentPdfFilename({
        customerName: "   ",
        documentType: "Nota",
        folio: "N-090926-01",
      });
      expect(filenameEmpty).toBe("Nota-N-090926-01");

      const filenameUndefined = formatDocumentPdfFilename({
        documentType: "Nota",
        folio: "N-090926-01",
      });
      expect(filenameUndefined).toBe("Nota-N-090926-01");
    });

    it("normalizes diacritics and removes filename-invalid characters in customer and type", () => {
      const filename = formatDocumentPdfFilename({
        customerName: 'José Pérez / Transportes : * ? " < > |',
        documentType: "Cotización",
        folio: "C-090926-42",
      });

      expect(filename).toBe("JosePerezTransportes-Cotizacion-C-090926-42");
    });

    it("never emits SEBASAM, SinCliente, or SinUnidad", () => {
      const filename = formatDocumentPdfFilename({
        customerName: null,
        documentType: "Nota",
        folio: "N-090926-01",
      });

      expect(filename).not.toContain("SEBASAM");
      expect(filename).not.toContain("SinCliente");
      expect(filename).not.toContain("SinUnidad");
      expect(filename).not.toContain("SinFecha");
    });

    it("supports fallbackType when documentType is omitted", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Cliente Test",
        fallbackType: "Nota",
        folio: "N-090926-05",
      });

      expect(filename).toBe("ClienteTest-Nota-N-090926-05");
    });

    it("formats historical record using legacy number as folio", () => {
      const filename = formatDocumentPdfFilename({
        customerName: "Empresa",
        documentType: "Cotización",
        folio: "0626-001",
      });

      expect(filename).toBe("Empresa-Cotizacion-0626-001");
    });
  });
});
