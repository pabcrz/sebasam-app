import { describe, expect, it } from "vitest";
import { formatAmountInWords } from "./amount-in-words";

describe("formatAmountInWords", () => {
  it("throws for invalid inputs", () => {
    expect(() => formatAmountInWords(-1)).toThrow("cents must be a non-negative integer");
    expect(() => formatAmountInWords(1.5)).toThrow("cents must be a non-negative integer");
    expect(() => formatAmountInWords(Number.NaN)).toThrow("cents must be a non-negative integer");
  });

  it("formats zero cents", () => {
    expect(formatAmountInWords(0)).toBe("CERO PESOS 00/100 M.N.");
  });

  it("formats single peso", () => {
    expect(formatAmountInWords(100)).toBe("UN PESO 00/100 M.N.");
  });

  it("formats amounts below one thousand pesos", () => {
    expect(formatAmountInWords(11600)).toBe("CIENTO DIECISÉIS PESOS 00/100 M.N.");
    expect(formatAmountInWords(11699)).toBe("CIENTO DIECISÉIS PESOS 99/100 M.N.");
    expect(formatAmountInWords(2100)).toBe("VEINTIÚN PESOS 00/100 M.N.");
    expect(formatAmountInWords(10100)).toBe("CIENTO UN PESOS 00/100 M.N.");
    expect(formatAmountInWords(2200)).toBe("VEINTIDÓS PESOS 00/100 M.N.");
    expect(formatAmountInWords(22100)).toBe("DOSCIENTOS VEINTIÚN PESOS 00/100 M.N.");
  });

  it("formats thousands with proper apocopation", () => {
    expect(formatAmountInWords(100000)).toBe("MIL PESOS 00/100 M.N.");
    expect(formatAmountInWords(100100)).toBe("MIL UN PESOS 00/100 M.N.");
    expect(formatAmountInWords(2100000)).toBe("VEINTIÚN MIL PESOS 00/100 M.N.");
    expect(formatAmountInWords(3100000)).toBe("TREINTA Y UN MIL PESOS 00/100 M.N.");
  });

  it("formats millions with 'de' prefix", () => {
    expect(formatAmountInWords(100000000)).toBe("UN MILLÓN DE PESOS 00/100 M.N.");
    expect(formatAmountInWords(200000000)).toBe("DOS MILLONES DE PESOS 00/100 M.N.");
  });

  it("formats millions with remainder without 'de' prefix", () => {
    expect(formatAmountInWords(100000100)).toBe("UN MILLÓN UN PESOS 00/100 M.N.");
    expect(formatAmountInWords(100001000)).toBe("UN MILLÓN DIEZ PESOS 00/100 M.N.");
    expect(formatAmountInWords(100100000)).toBe("UN MILLÓN MIL PESOS 00/100 M.N.");
  });
});
