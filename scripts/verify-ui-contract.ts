import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const pagePath = "src/app/admin/(protected)/quotes/page.tsx";
const pageSource = readFileSync(pagePath, "utf8");

function assertIncludes(substring: string, message: string) {
  assert(pageSource.includes(substring), message);
}

// Wrappers must hide Radix from page code.
assert(
  !pageSource.includes("@radix-ui"),
  "Page must import controlled wrappers from @/components/ui, not Radix directly",
);

// Server-action wiring must remain intact.
assertIncludes(
  "createQuoteFromForm",
  "Create form must wire to createQuoteFromForm server action",
);
assertIncludes(
  "approveQuoteAndCreateWorkOrderFromForm",
  "Approval form must wire to approveQuoteAndCreateWorkOrderFromForm server action",
);
assertIncludes(
  '<input type="hidden" name="quoteId"',
  "Approval form must carry hidden quoteId field",
);

// Required form field names must survive wrapper refactors.
const requiredFieldPatterns = [
  'name="customerId"',
  'name="title"',
  'name="description"',
  'name="plate"',
  'name="brand"',
  'name="model"',
  'name="color"',
  'name="year"',
  'name="administrative"',
  "items.${index}.type",
  "items.${index}.description",
  "items.${index}.quantity",
  "items.${index}.unitPrice",
  'name="quoteId"',
];

for (const pattern of requiredFieldPatterns) {
  assertIncludes(pattern, `Missing required form field pattern: ${pattern}`);
}

// Heading hierarchy must not collapse to all h3.
assertIncludes('as="h1"', "Page must render a real h1 via CardTitle");
assertIncludes('as="h2"', "Section headings must be h2");

// User-facing copy must stay in Mexican Spanish.
const spanishLabels = [
  "Cotizaciones en borrador",
  "Crear cotización en borrador",
  "Cotizaciones recientes",
  "Partidas",
  "Cliente",
  "Título",
  "Descripción",
  "Aprobar y crear orden de trabajo",
];

for (const label of spanishLabels) {
  assertIncludes(label, `Expected Spanish copy missing: ${label}`);
}

console.log("UI contract verified for /admin/quotes.");
