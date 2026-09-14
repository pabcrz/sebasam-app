import { describe, expect, it } from "vitest";
import {
  DOCUMENT_SLUG_SUFFIX_LENGTH,
  generateBankAccountSlug,
  generateDocumentSlug,
  generatePaymentSlugFromNumber,
  generateSlug,
  generateUniqueSlug,
  normalizeSlugPrefix,
} from "./slug";

describe("generateSlug", () => {
  it("creates a short base62 slug with the provided prefix", () => {
    const slug = generateSlug("C-0726-03");

    expect(slug).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
  });

  it("supports custom suffix length such as 6 for document slugs", () => {
    const slug = generateSlug("C-090926-01", DOCUMENT_SLUG_SUFFIX_LENGTH);

    expect(slug).toMatch(/^C-090926-01-[0-9A-Za-z]{6}$/);
  });
});

describe("generateDocumentSlug", () => {
  it("creates a 6-character slug for C and N folios", () => {
    const quoteSlug = generateDocumentSlug("C-090926-01");
    expect(quoteSlug).toMatch(/^C-090926-01-[0-9A-Za-z]{6}$/);

    const noteSlug = generateDocumentSlug("N-090926-01");
    expect(noteSlug).toMatch(/^N-090926-01-[0-9A-Za-z]{6}$/);
  });
});

describe("normalizeSlugPrefix", () => {
  it("normalizes spaces, uppercase and accents into clean hyphenated strings", () => {
    expect(normalizeSlugPrefix("Banco Azteca")).toBe("banco-azteca");
    expect(normalizeSlugPrefix("Débito BBVA")).toBe("debito-bbva");
    expect(normalizeSlugPrefix("Santander #1")).toBe("santander-1");
    expect(normalizeSlugPrefix("---")).toBe("");
  });
});

describe("generateBankAccountSlug", () => {
  it("generates a slug starting with the normalized bank name", () => {
    const slug = generateBankAccountSlug("Mercado Pago");
    expect(slug).toMatch(/^mercado-pago-[0-9A-Za-z]{8}$/);
  });

  it("uses fallback 'cuenta' when bank name contains only symbols", () => {
    const slug = generateBankAccountSlug("$$$");
    expect(slug).toMatch(/^cuenta-[0-9A-Za-z]{8}$/);
  });
});

describe("generatePaymentSlugFromNumber", () => {
  it("generates payment slug replacing C/T prefix with P", () => {
    const slug = generatePaymentSlugFromNumber("C-0726-03");
    expect(slug).toMatch(/^P-0726-03-[0-9A-Za-z]{8}$/);
  });
});

describe("generateUniqueSlug", () => {
  it("retries while generated slugs already exist", async () => {
    let calls = 0;

    const slug = await generateUniqueSlug("C-0726-03", async () => {
      calls += 1;
      return calls === 1;
    });

    expect(slug).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
    expect(calls).toBe(2);
  });

  it("throws after the configured retry budget is exhausted", async () => {
    await expect(generateUniqueSlug("C-0726-03", async () => true, 2)).rejects.toThrow(
      'Failed to generate unique slug after 2 attempts for prefix "C-0726-03".',
    );
  });
});
