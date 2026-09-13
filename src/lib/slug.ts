import crypto from "node:crypto";

const SLUG_SUFFIX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const DEFAULT_SLUG_SUFFIX_LENGTH = 8;
export const DOCUMENT_SLUG_SUFFIX_LENGTH = 6;

/**
 * Generate a short random base62 suffix.
 */
export function randomSuffix(length = DEFAULT_SLUG_SUFFIX_LENGTH): string {
  return Array.from({ length }, () =>
    SLUG_SUFFIX_ALPHABET[crypto.randomInt(SLUG_SUFFIX_ALPHABET.length)],
  ).join("");
}

/**
 * Build a short human-readable slug: `{prefix}-{random_base62}`.
 */
export function generateSlug(prefix: string, suffixLength = DEFAULT_SLUG_SUFFIX_LENGTH): string {
  return `${prefix}-${randomSuffix(suffixLength)}`;
}

/**
 * Build a document slug with 6 random base62 characters.
 */
export function generateDocumentSlug(prefix: string): string {
  return generateSlug(prefix, DOCUMENT_SLUG_SUFFIX_LENGTH);
}

/**
 * Normalize text into a clean URL slug prefix (lowercase, alphanumeric + hyphens, unaccented).
 */
export function normalizeSlugPrefix(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a payment slug from a reference number (quote or work order):
 * Replaces the first letter with "P" and appends a random suffix.
 * "C-0726-03" → "P-0726-03-a1B2c3D4"
 * "T-0726-03" → "P-0726-03-a1B2c3D4"
 */
export function generatePaymentSlugFromNumber(referenceNumber: string): string {
  const base = referenceNumber.slice(1); // Drop leading C/T prefix

  return generateSlug(`P${base}`);
}

/**
 * Build a short human-readable slug for a bank account:
 * "Santander" → "santander-a1B2c3D4"
 * "Mercado Pago" → "mercado-pago-a1B2c3D4"
 */
export function generateBankAccountSlug(bankName: string): string {
  const prefix = normalizeSlugPrefix(bankName) || "cuenta";
  return generateSlug(prefix);
}

/** Max attempts before throwing when trying to generate a unique slug. */
const MAX_SLUG_RETRIES = 5;

/**
 * Try generating a unique slug via the provided exists checker.
 * Useful inside a transaction to avoid Prisma P2002 rollback.
 */
export async function generateUniqueSlug(
  prefix: string,
  exists: (slug: string) => Promise<boolean>,
  maxRetries = MAX_SLUG_RETRIES,
  suffixLength = DEFAULT_SLUG_SUFFIX_LENGTH,
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const slug = generateSlug(prefix, suffixLength);

    if (!(await exists(slug))) {
      return slug;
    }
  }

  throw new Error(
    `Failed to generate unique slug after ${maxRetries} attempts for prefix "${prefix}".`,
  );
}
