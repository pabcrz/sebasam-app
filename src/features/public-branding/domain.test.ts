import { describe, expect, it } from "vitest";
import { toPublicBusinessIdentity } from "./domain";
const settings = (overrides = {}) => ({ name: "  Taller Norte ", fullName: "Servicio Norte", address: " Dirección ", mapsUrl: "https://maps.example.test", contactPhone: " 555123 ", contactWhatsapp: " 555456 ", hours: { weekdays: "9-18", saturday: "9-15" }, services: [], products: [], bankAccounts: [], ...overrides });
describe("toPublicBusinessIdentity", () => {
  it("maps only v4 identity fields", () => expect(toPublicBusinessIdentity(settings())).toEqual({ businessName: "Taller Norte", phone: "555123", whatsapp: "555456" }));
  it("omits missing or blank fields", () => expect(toPublicBusinessIdentity(settings({ name: "  Taller Norte ", fullName: " ", address: "", mapsUrl: " ", contactPhone: "", contactWhatsapp: "" }))).toEqual({ businessName: "Taller Norte" }));
});
