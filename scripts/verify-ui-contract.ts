import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function assertIncludes(source: string, substring: string, message: string) {
  assert(source.includes(substring), message);
}

function assertNoRadix(source: string, context: string) {
  assert(
    !source.includes("@radix-ui"),
    `${context} must import controlled wrappers from @/components/ui, not Radix directly`,
  );
}

function checkQuotesPage() {
  const pagePath = "src/app/admin/(protected)/quotes/page.tsx";
  const pageSource = readFileSync(pagePath, "utf8");
  const builderPath = "src/features/quotes/components/quote-builder.tsx";
  const builderSource = readFileSync(builderPath, "utf8");
  const approvalFormPath = "src/features/quotes/components/quote-approval-form.tsx";
  const approvalFormSource = readFileSync(approvalFormPath, "utf8");
  const tableSource = readFileSync("src/components/ui/table.tsx", "utf8");
  const paymentLinkDialogPath = "src/features/payment-requests/components/payment-request-link-dialog.tsx";
  const paymentLinkDialogSource = readFileSync(paymentLinkDialogPath, "utf8");

  assertNoRadix(pageSource, "Quotes page");
  assertNoRadix(builderSource, "Quote builder");
  assertNoRadix(approvalFormSource, "Quote approval form");

  // Server-action wiring must remain intact.
  assertIncludes(
    pageSource,
    "createQuoteFromForm",
    "Create form must wire to createQuoteFromForm server action",
  );
  assertIncludes(
    pageSource,
    "approveQuoteAndCreateWorkOrderFromForm",
    "Approval form must wire to approveQuoteAndCreateWorkOrderFromForm server action",
  );
  assertIncludes(
    pageSource,
    "getOrCreatePaymentRequestForQuote",
    "Quotes page must wire payment-link server action",
  );
  assertIncludes(
    pageSource,
    "PaymentRequestLinkDialog",
    "Quotes page must render PaymentRequestLinkDialog",
  );
  const recentQuotesStart = pageSource.indexOf('<CardTitle as="h2">Cotizaciones recientes</CardTitle>');
  assert(recentQuotesStart >= 0, "Quotes page must render the recent quotes section");
  const recentQuotesEnd = pageSource.indexOf("{/* Mobile cards */}", recentQuotesStart);
  const recentQuotesSource = pageSource.slice(Math.max(0, recentQuotesStart - 200), recentQuotesEnd);
  assertIncludes(
    recentQuotesSource,
    "min-w-0",
    "Recent quotes desktop table container must be allowed to shrink inside the page container",
  );
  assertIncludes(
    tableSource,
    "overflow-x-auto",
    "Desktop table overflow must stay inside the table scroll wrapper",
  );
  assertIncludes(
    approvalFormSource,
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
    assertIncludes(
      pattern === 'name="quoteId"' ? approvalFormSource : builderSource,
      pattern,
      `Missing required form field pattern: ${pattern}`,
    );
  }

  // Heading hierarchy must not collapse to all h3.
  assertIncludes(pageSource, 'as="h1"', "Page must render a real h1 via CardTitle");
  assertIncludes(pageSource, 'as="h2"', "Section headings must be h2");

  // User-facing copy must stay in Mexican Spanish.
  const spanishLabels = [
    { label: "Cotizaciones en borrador", source: pageSource },
    { label: "Crear cotización en borrador", source: builderSource },
    { label: "Cotizaciones recientes", source: pageSource },
    { label: "Conceptos", source: builderSource },
    { label: "Cliente", source: builderSource },
    { label: "Título", source: builderSource },
    { label: "Descripción", source: builderSource },
    { label: "Aprobar y crear orden de trabajo", source: approvalFormSource },
    { label: "Link de pago", source: paymentLinkDialogSource },
    { label: "Genera o recupera el enlace de pago", source: paymentLinkDialogSource },
    { label: "URL para el cliente", source: paymentLinkDialogSource },
    { label: "Copiar link", source: paymentLinkDialogSource },
    { label: "Generar link", source: paymentLinkDialogSource },
  ];

  for (const { label, source } of spanishLabels) {
    assertIncludes(source, label, `Expected Spanish copy missing: ${label}`);
  }
}

function checkCustomerPages() {
  const createPageSource = readFileSync(
    "src/app/admin/(protected)/customers/page.tsx",
    "utf8",
  );
  const editPageSource = readFileSync(
    "src/app/admin/(protected)/customers/[id]/edit/page.tsx",
    "utf8",
  );
  const createFormSource = readFileSync(
    "src/features/customers/components/customer-create-form.tsx",
    "utf8",
  );
  const editFormSource = readFileSync(
    "src/features/customers/components/customer-edit-form.tsx",
    "utf8",
  );

  assertNoRadix(createPageSource, "Customer create page");
  assertNoRadix(editPageSource, "Customer edit page");

  // Server-action wiring must remain intact.
  assertIncludes(
    createPageSource,
    "createCustomerFromForm",
    "Customer create page must import createCustomerFromForm server action",
  );
  assertIncludes(
    createPageSource,
    "<CustomerCreateForm",
    "Customer create page must render CustomerCreateForm",
  );
  assertIncludes(
    createPageSource,
    "action={createCustomerFromForm}",
    "Customer create form must wire to createCustomerFromForm server action",
  );

  assertIncludes(
    editPageSource,
    "updateCustomerBasicsFromForm",
    "Customer edit page must import updateCustomerBasicsFromForm server action",
  );
  assertIncludes(
    editPageSource,
    "<CustomerEditForm",
    "Customer edit page must render CustomerEditForm",
  );

  // Required create form field names must survive wrapper refactors.
  for (const field of ["name", "email", "phone", "address", "notes"]) {
    assertIncludes(
      createFormSource,
      `name="${field}"`,
      `Customer create form must expose field: ${field}`,
    );
  }

  // Required edit form field names must survive wrapper refactors.
  assertIncludes(
    editFormSource,
    'name="customerId"',
    "Customer edit form must carry hidden customerId field",
  );
  for (const field of ["name", "email", "phone", "address", "notes"]) {
    assertIncludes(
      editFormSource,
      `name="${field}"`,
      `Customer edit form must expose field: ${field}`,
    );
  }

  // Status must be a Radix Select wrapper that still serializes name="status".
  assertIncludes(
    editFormSource,
    '<Select name="status"',
    "Customer edit form must use a Select wrapper named status",
  );
}

function checkLoginPage() {
  const loginSource = readFileSync("src/app/admin/login/page.tsx", "utf8");

  assertNoRadix(loginSource, "Login page");

  // Form wiring must remain intact.
  assertIncludes(loginSource, 'action={loginAdmin}', "Login form must wire to loginAdmin server action");
  assertIncludes(loginSource, 'name="username"', "Login form must expose username field");
  assertIncludes(loginSource, 'name="password"', "Login form must expose password field");
  assertIncludes(loginSource, 'type="submit"', "Login form must have a submit button");

  // Main owns the full screen; the login card caps its own width for this simple centered panel.
  assertIncludes(loginSource, '<main className="flex min-h-dvh w-full', "Login main must occupy full viewport width");
  assertIncludes(loginSource, 'className="w-full md:max-w-100"', "Login card must fill mobile width and cap width on desktop");

  // User-facing copy must stay in Mexican Spanish.
  const spanishLabels = [
    "Iniciar sesión",
    "Usuario",
    "Contraseña",
    "Ingresar",
    "El usuario o la contraseña son incorrectos.",
    "Ingresa tu usuario y contraseña.",
  ];

  for (const label of spanishLabels) {
    assertIncludes(loginSource, label, `Expected Spanish copy missing: ${label}`);
  }
}

function checkRootPage() {
  const rootSource = readFileSync("src/app/page.tsx", "utf8");

  // Root must be an operational entry point, not a generic landing page.
  assertIncludes(rootSource, "getCurrentUser", "Root page must read the current session");
  assertIncludes(rootSource, "redirect", "Root page must redirect based on session");
  assertIncludes(
    rootSource,
    "getRootRedirectPath",
    "Root page must resolve redirect path through auth helper",
  );

  const rootRedirectSource = readFileSync("src/lib/auth/root-redirect.ts", "utf8");
  assertIncludes(
    rootRedirectSource,
    'user ? "/admin" : "/admin/login"',
    "Root redirect must send authenticated users to /admin and anonymous users to /admin/login",
  );
}

function checkPublicPaymentPage() {
  const pageSource = readFileSync("src/app/datos-de-pago/[token]/page.tsx", "utf8");
  const shellSource = readFileSync("src/features/public-payment/components/public-payment-shell.tsx", "utf8");
  const invoiceDecisionSource = readFileSync(
    "src/features/public-payment/components/invoice-decision.tsx",
    "utf8",
  );
  const fiscalFormSource = readFileSync(
    "src/features/public-payment/components/fiscal-data-form.tsx",
    "utf8",
  );
  const bankCardSource = readFileSync(
    "src/features/public-payment/components/bank-data-card.tsx",
    "utf8",
  );

  assertNoRadix(pageSource, "Public payment page");
  assertNoRadix(shellSource, "Public payment shell");
  assertNoRadix(invoiceDecisionSource, "Invoice decision");
  assertNoRadix(fiscalFormSource, "Fiscal data form");

  // Server-action wiring must remain intact.
  assertIncludes(
    pageSource,
    "setPaymentRequestInvoicePreference",
    "Page must wire invoice preference server action",
  );
  assertIncludes(
    pageSource,
    "savePaymentRequestFiscalData",
    "Page must wire fiscal data server action",
  );

  // Required form field names must survive wrapper refactors.
  const requiredFieldPatterns = [
    'name="personType"',
    'name="businessName"',
    'name="taxId"',
    'name="taxRegime"',
    'name="cfdiUse"',
    'name="zipCode"',
  ];

  for (const pattern of requiredFieldPatterns) {
    assertIncludes(
      fiscalFormSource,
      pattern,
      `Missing required fiscal form field pattern: ${pattern}`,
    );
  }

  // User-facing copy must stay in Mexican Spanish.
  const spanishLabels = [
    { label: "¿Qué necesitas compartir?", source: invoiceDecisionSource },
    { label: "Solo datos de pago", source: invoiceDecisionSource },
    { label: "Requiero factura", source: invoiceDecisionSource },
    { label: "Captura de datos fiscales", source: fiscalFormSource },
    { label: "Guardar datos fiscales", source: fiscalFormSource },
    { label: "Datos de pago", source: bankCardSource },
    { label: "Enviar comprobante", source: readFileSync("src/features/public-payment/components/whatsapp-receipt-cta.tsx", "utf8") },
  ];

  for (const { label, source } of spanishLabels) {
    assertIncludes(source, label, `Expected Spanish copy missing: ${label}`);
  }
}

checkQuotesPage();
checkCustomerPages();
checkLoginPage();
checkRootPage();
checkPublicPaymentPage();

console.log(
  "UI contract verified for /, /admin/login, /admin/quotes, /admin/customers, /datos-de-pago/[token] and payment-request link generation.",
);
