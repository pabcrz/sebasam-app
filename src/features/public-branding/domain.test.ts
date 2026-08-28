import { describe, expect, it } from "vitest";
import { toPublicBusinessIdentity } from "./domain";

describe("toPublicBusinessIdentity", () => {
  it("derives one public identity and omits blank configured values", () => {
    const identity = toPublicBusinessIdentity({
      name: "  Taller Norte ",
      fullName: " ",
      address: " Dirección ",
      mapsUrl: "",
      contactPhone: " 555123 ",
      contactWhatsapp: "",
      hours: { weekdays: "", saturday: "" },
      services: [],
      products: [],
      bankAccounts: [],
    });

    expect(identity).toEqual({
      name: "Taller Norte",
      logoSrc: "/logo-white-short.png",
      address: "Dirección",
      contactPhone: "555123",
    });
  });
});
