import { describe, expect, it, vi } from "vitest";
import {
  formatQuoteContactRole,
  resolveCustomerDisplayIdentity,
  resolveQuotePreviewContact,
  resolveQuotePreviewCustomer,
  resolveQuoteSnapshots,
} from "./quote-snapshots";

describe("resolveCustomerDisplayIdentity", () => {
  it("prefers commercialName and formats driver contact in subtitle", () => {
    const identity = resolveCustomerDisplayIdentity({
      customer: {
        name: "Constructora del Norte",
        commercialName: "ConstruNorte",
        legalName: "ConstruNorte S.A. de C.V.",
      },
      customerContact: {
        name: "Juan Chofer",
        phone: "5512345678",
        role: "DRIVER",
      },
    });

    expect(identity.displayName).toBe("ConstruNorte");
    expect(identity.subtitle).toBe("Razón social: ConstruNorte S.A. de C.V. · Chofer: Juan Chofer");
    expect(identity.operatorName).toBe("Juan Chofer");
    expect(identity.operatorRole).toBe("Chofer");
  });

  it("prioritizes snapshots over live records", () => {
    const identity = resolveCustomerDisplayIdentity({
      customer: { name: "Antiguo Nombre" },
      customerSnapshot: {
        commercialName: "Comercial Snapshot",
        legalName: "Legal Snapshot",
      },
      contactSnapshot: {
        name: "Operador Snapshot",
        phone: "5599998888",
        role: "CONTACT",
      },
    });

    expect(identity.displayName).toBe("Comercial Snapshot");
    expect(identity.subtitle).toBe("Razón social: Legal Snapshot · Contacto: Operador Snapshot");
    expect(identity.operatorName).toBe("Operador Snapshot");
    expect(identity.operatorRole).toBe("Contacto");
  });

  it("handles missing customer and contacts cleanly", () => {
    const identity = resolveCustomerDisplayIdentity({});

    expect(identity.displayName).toBe("Sin cliente");
    expect(identity.subtitle).toBeUndefined();
    expect(identity.operatorName).toBeNull();
  });
});

describe("resolveQuoteSnapshots", () => {
  it("resolves both customer and contact snapshots from transaction client", async () => {
    const tx = {
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          id: "c-1",
          name: "Empresa Uno",
          commercialName: "Comercial Uno",
          legalName: "Empresa Uno S.A.",
          email: "uno@example.com",
          phone: "5511223344",
          address: "Calle 1",
          fiscalProfiles: [{ businessName: "Fiscal Uno", taxId: "RFC123" }],
        }),
      },
      customerContact: {
        findUnique: vi.fn().mockResolvedValue({
          id: "contact-1",
          name: "Pedro Chofer",
          phone: "5522334455",
          role: "DRIVER",
        }),
      },
    };

    const result = await resolveQuoteSnapshots(tx as never, "c-1", "contact-1");

    expect(result.customerSnapshot).toEqual({
      customerId: "c-1",
      name: "Empresa Uno",
      commercialName: "Comercial Uno",
      legalName: "Fiscal Uno",
      taxId: "RFC123",
      email: "uno@example.com",
      phone: "5511223344",
      address: "Calle 1",
    });
    expect(result.contactSnapshot).toEqual({
      id: "contact-1",
      name: "Pedro Chofer",
      phone: "5522334455",
      role: "DRIVER",
    });
  });

  it("handles contact with null phone", async () => {
    const tx = {
      customerContact: {
        findUnique: vi.fn().mockResolvedValue({
          id: "contact-2",
          name: "Chofer Sin Teléfono",
          phone: null,
          role: "DRIVER",
        }),
      },
    };

    const result = await resolveQuoteSnapshots(tx as never, null, "contact-2");

    expect(result.contactSnapshot).toEqual({
      id: "contact-2",
      name: "Chofer Sin Teléfono",
      phone: null,
      role: "DRIVER",
    });
  });
});

describe("formatQuoteContactRole", () => {
  it("formats DRIVER as Chofer", () => {
    expect(formatQuoteContactRole("DRIVER")).toBe("Chofer");
    expect(formatQuoteContactRole("driver")).toBe("Chofer");
    expect(formatQuoteContactRole(" CHOFER ")).toBe("Chofer");
  });

  it("formats CONTACT as Contacto responsable", () => {
    expect(formatQuoteContactRole("CONTACT")).toBe("Contacto responsable");
    expect(formatQuoteContactRole("contact")).toBe("Contacto responsable");
    expect(formatQuoteContactRole("CONTACTO")).toBe("Contacto responsable");
  });

  it("formats BILLING as Contacto de facturación", () => {
    expect(formatQuoteContactRole("BILLING")).toBe("Contacto de facturación");
    expect(formatQuoteContactRole("billing")).toBe("Contacto de facturación");
    expect(formatQuoteContactRole("Facturación")).toBe("Contacto de facturación");
  });

  it("returns null for empty or null inputs", () => {
    expect(formatQuoteContactRole(null)).toBeNull();
    expect(formatQuoteContactRole(undefined)).toBeNull();
    expect(formatQuoteContactRole("")).toBeNull();
    expect(formatQuoteContactRole("   ")).toBeNull();
  });

  it("preserves unmapped custom roles trimmed", () => {
    expect(formatQuoteContactRole("Supervisor")).toBe("Supervisor");
  });
});

describe("resolveQuotePreviewContact", () => {
  it("prioritizes valid snapshot over live customer contact", () => {
    const result = resolveQuotePreviewContact({
      contactSnapshot: {
        id: "snap-1",
        name: "Carlos Snapshot",
        role: "DRIVER",
      },
      customerContact: {
        name: "Maria Modificada",
        role: "CONTACT",
      },
    });

    expect(result).toEqual({
      contactName: "Carlos Snapshot",
      contactRole: "Chofer",
    });
  });

  it("maps CONTACT and BILLING snapshot roles accurately", () => {
    expect(
      resolveQuotePreviewContact({
        contactSnapshot: { name: "Laura Responsable", role: "CONTACT" },
      }),
    ).toEqual({
      contactName: "Laura Responsable",
      contactRole: "Contacto responsable",
    });

    expect(
      resolveQuotePreviewContact({
        contactSnapshot: { name: "Esteban Pagos", role: "BILLING" },
      }),
    ).toEqual({
      contactName: "Esteban Pagos",
      contactRole: "Contacto de facturación",
    });
  });

  it("falls back to live contact when snapshot is null or undefined", () => {
    const result = resolveQuotePreviewContact({
      contactSnapshot: null,
      customerContact: {
        name: "Juan Vivo",
        role: "DRIVER",
      },
    });

    expect(result).toEqual({
      contactName: "Juan Vivo",
      contactRole: "Chofer",
    });
  });

  it("gracefully falls back to live contact when snapshot is malformed or has empty name", () => {
    expect(
      resolveQuotePreviewContact({
        contactSnapshot: { name: "", role: "DRIVER" },
        customerContact: { name: "Fallback Chofer", role: "DRIVER" },
      }),
    ).toEqual({
      contactName: "Fallback Chofer",
      contactRole: "Chofer",
    });

    expect(
      resolveQuotePreviewContact({
        contactSnapshot: "corrupted json" as unknown,
        customerContact: { name: "Fallback Contact", role: "CONTACT" },
      }),
    ).toEqual({
      contactName: "Fallback Contact",
      contactRole: "Contacto responsable",
    });

    expect(
      resolveQuotePreviewContact({
        contactSnapshot: 12345 as unknown,
        customerContact: { name: "Fallback Contact", role: "CONTACT" },
      }),
    ).toEqual({
      contactName: "Fallback Contact",
      contactRole: "Contacto responsable",
    });
  });

  it("returns null when no contact is selected (never invents driver or contact)", () => {
    expect(resolveQuotePreviewContact({})).toEqual({
      contactName: null,
      contactRole: null,
    });

    expect(
      resolveQuotePreviewContact({
        contactSnapshot: null,
        customerContact: null,
      }),
    ).toEqual({
      contactName: null,
      contactRole: null,
    });
  });
});

describe("resolveQuotePreviewCustomer", () => {
  it("prioritizes valid snapshot over live customer data using legalName", () => {
    const result = resolveQuotePreviewCustomer({
      customerSnapshot: {
        commercialName: "Comercial Snapshot",
        legalName: "Fiscal Snapshot S.A.",
      },
      customer: {
        name: "Nombre Vivo",
        commercialName: "Comercial Vivo",
        legalName: "Legal Vivo S.A.",
      },
    });

    expect(result).toEqual({
      customerName: "Comercial Snapshot",
      legalName: "Fiscal Snapshot S.A.",
    });
  });

  it("falls back to live customer when snapshot is null or empty", () => {
    const result = resolveQuotePreviewCustomer({
      customerSnapshot: null,
      customer: {
        name: "Constructora del Norte",
        legalName: "Constructora del Norte S.A. de C.V.",
      },
    });

    expect(result).toEqual({
      customerName: "Constructora del Norte",
      legalName: "Constructora del Norte S.A. de C.V.",
    });
  });

  it("returns Sin cliente and null legalName when neither is provided", () => {
    expect(resolveQuotePreviewCustomer({})).toEqual({
      customerName: "Sin cliente",
      legalName: null,
    });
  });
});
