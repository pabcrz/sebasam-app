import { describe, expect, it } from "vitest";
import { formatUnitIdentity } from "./unit-identity";

describe("formatUnitIdentity", () => {
  it("shows the economic number with the model when both exist", () => {
    expect(formatUnitIdentity({ economicNumber: "E-12", plates: "ABC-123", model: "Ford F-150" })).toBe("ECO E-12 · Ford F-150");
  });

  it("falls back to plates with the model when there is no economic number", () => {
    expect(formatUnitIdentity({ economicNumber: null, plates: "ABC-123", model: "Ford F-150" })).toBe("ABC-123 · Ford F-150");
  });

  it("shows only the model when there is neither economic number nor plates", () => {
    expect(formatUnitIdentity({ economicNumber: null, plates: null, model: "Ford F-150" })).toBe("Ford F-150");
  });

  it("treats empty strings and whitespace as missing", () => {
    expect(formatUnitIdentity({ economicNumber: "   ", plates: "", model: "Ford F-150" })).toBe("Ford F-150");
    expect(formatUnitIdentity({ economicNumber: "  E-12  ", plates: "  ", model: "  " })).toBe("ECO E-12");
    expect(formatUnitIdentity({ economicNumber: "", plates: " ABC-123 ", model: "" })).toBe("ABC-123");
  });

  it("returns null when no identifying data exists instead of placeholder text", () => {
    expect(formatUnitIdentity({ economicNumber: null, plates: null, model: null })).toBeNull();
    expect(formatUnitIdentity({ economicNumber: " ", plates: "", model: "\t" })).toBeNull();
  });

  it("never includes a placeholder such as 'Sin ECO'", () => {
    const identity = formatUnitIdentity({ economicNumber: null, plates: "ABC-123", model: null });

    expect(identity).toBe("ABC-123");
    expect(identity).not.toMatch(/sin eco/i);
  });

  it("never includes the driver, since the driver is shown on its own line", () => {
    expect(formatUnitIdentity({ economicNumber: "E-12", plates: "ABC-123", model: "Ford F-150" })).not.toMatch(/chofer|driver/i);
  });
});
