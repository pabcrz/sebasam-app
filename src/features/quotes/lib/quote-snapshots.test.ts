import { describe, expect, it, vi } from "vitest";
import { resolveCustomerDisplayIdentity, resolveQuoteSnapshots } from "./quote-snapshots";

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
});
