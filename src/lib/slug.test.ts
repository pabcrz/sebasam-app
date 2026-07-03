import { describe, expect, it } from "vitest";
import { generateSlug, generateUniqueSlug } from "./slug";

describe("generateSlug", () => {
  it("creates a short base62 slug with the provided prefix", () => {
    const slug = generateSlug("C-0726-03");

    expect(slug).toMatch(/^C-0726-03-[0-9A-Za-z]{8}$/);
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
