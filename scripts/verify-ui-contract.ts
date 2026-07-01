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
  const builderComponentPaths = [
    builderPath,
    "src/features/quotes/components/quote-builder-stepper.tsx",
    "src/features/quotes/components/quote-builder-items-step.tsx",
    "src/features/quotes/components/quote-summary-card.tsx",
    "src/features/quotes/components/quote-preview-card.tsx",
    "src/features/quotes/components/quote-totals-card.tsx",
  ];
  const combinedBuilderSource = builderComponentPaths
    .map((path) => readFileSync(path, "utf8"))
    .join("\n");
  const builderDialogPath = "src/features/quotes/components/quote-builder-dialog.tsx";
  const builderDialogSource = readFileSync(builderDialogPath, "utf8");
  const approvalFormPath = "src/features/quotes/components/quote-approval-form.tsx";
  const approvalFormSource = readFileSync(approvalFormPath, "utf8");
  const tableSource = readFileSync("src/components/ui/table.tsx", "utf8");
  const paymentLinkDialogPath = "src/features/payment-requests/components/payment-request-link-dialog.tsx";
  const paymentLinkDialogSource = readFileSync(paymentLinkDialogPath, "utf8");

  assertNoRadix(pageSource, "Quotes page");
  for (const path of builderComponentPaths) {
    assertNoRadix(readFileSync(path, "utf8"), `Quote builder component ${path}`);
  }
  assertNoRadix(builderDialogSource, "Quote builder dialog");
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
  assertIncludes(
    pageSource,
    "QuoteBuilderDialog",
    "Quotes page must render QuoteBuilderDialog",
  );
  assertIncludes(
    builderDialogSource,
    "Nueva cotización",
    "Quote builder dialog launch button must read Nueva cotización",
  );
  assertIncludes(
    builderDialogSource,
    "<QuoteBuilder",
    "Quote builder dialog must render the QuoteBuilder component",
  );
  assertIncludes(
    builderDialogSource,
    "if (nextOpen) setOpen(true)",
    "Quote builder dialog must ignore outside/Escape-driven close requests",
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
  // Approval no longer uses a hidden form/requestSubmit; it calls the server
  // action directly with a FormData containing the quoteId.
  assertIncludes(
    approvalFormSource,
    "new FormData()",
    "Approval form must build a FormData for the server action",
  );
  assertIncludes(
    approvalFormSource,
    'formData.set("quoteId"',
    "Approval form must set quoteId in the FormData",
  );
  assertIncludes(
    approvalFormSource,
    "useTransition",
    "Approval form must use a transition for the async server action",
  );

  // Required form field names must survive wrapper refactors.
  // Vehicle fields are optional; only customer is required to create a quote.
  const requiredFieldPatterns = [
    'name="customerId"',
    'name="title"',
    'name="description"',
    'name="plate"',
    'name="brand"',
    'name="model"',
    'name="year"',
    'name="administrative"',
    "items.${index}.type",
    "items.${index}.description",
    "items.${index}.quantity",
    "items.${index}.unitPrice",
  ];

  for (const pattern of requiredFieldPatterns) {
    assertIncludes(
      combinedBuilderSource,
      pattern,
      `Missing required form field pattern: ${pattern}`,
    );
  }

  const sequenceSource = readFileSync("src/features/quotes/lib/sequence.ts", "utf8");
  assertIncludes(
    sequenceSource,
    'getNextNumber("quote", "C")',
    "Quote numbering must use C- prefix for sequential numbers",
  );
  assertIncludes(
    sequenceSource,
    'getNextNumber("workOrder", "T")',
    "Work order numbering must use T- prefix for sequential numbers",
  );

  // Dynamic concepts: builder must allow adding and removing items.
  assertIncludes(
    combinedBuilderSource,
    "addItem",
    "Quote builder must support adding a new concept",
  );
  assertIncludes(
    combinedBuilderSource,
    "removeItem",
    "Quote builder must support removing a concept",
  );
  assertIncludes(
    combinedBuilderSource,
    "Agregar concepto",
    "Quote builder must offer an explicit add-concept action in Spanish",
  );

  // Vehicle fields are optional and color is no longer collected in the builder.
  assert(
    !combinedBuilderSource.includes('name="color"'),
    "Quote builder must not render a color field",
  );

  // Select wrapper must follow Radix docs for popper positioning.
  const selectSource = readFileSync("src/components/ui/select.tsx", "utf8");
  assertIncludes(
    selectSource,
    "min-w-[var(--radix-select-trigger-width)]",
    "Select viewport must match trigger width",
  );
  assertIncludes(
    selectSource,
    "max-h-[var(--radix-select-content-available-height)]",
    "Select viewport must constrain height to available space",
  );
  assert(
    !selectSource.includes("h-[var(--radix-select-trigger-height)]"),
    "Select viewport must not lock height to trigger height",
  );
  assertIncludes(
    selectSource,
    "data-select-content",
    "Select content must be marked so dialogs can ignore outside interactions on it",
  );
  assertIncludes(
    selectSource,
    "stopImmediatePropagation",
    "Select content must stop pointerdown propagation so portaled items are not seen as outside the dialog",
  );

  // Dialog must ignore outside interactions that target portaled Select content.
  const dialogSource = readFileSync("src/components/ui/dialog.tsx", "utf8");
  const confirmDialogSource = readFileSync("src/components/ui/confirm-dialog.tsx", "utf8");
  assertIncludes(
    dialogSource,
    "data-select-content",
    "Dialog must detect select-content markers to ignore outside interactions",
  );
  assertIncludes(
    dialogSource,
    "onInteractOutside",
    "Dialog must hook into outside interactions to protect select content",
  );
  assertIncludes(
    dialogSource,
    "onPointerDownOutside",
    "Dialog must hook into pointer-down-outside events to protect select content",
  );
  assertIncludes(
    dialogSource,
    "onFocusOutside",
    "Dialog must hook into focus-outside events to protect select content",
  );

  assertIncludes(
    confirmDialogSource,
    "max-w-2xl",
    "Confirm dialog must have a reasonable desktop width",
  );

  // Toast feedback replaces inline status messages for quote actions.
  assertIncludes(
    pageSource,
    "QuotePageToasts",
    "Quotes page must render the QuotePageToasts client component",
  );

  const quotePageToastsSource = readFileSync(
    "src/features/quotes/components/quote-page-toasts.tsx",
    "utf8",
  );
  assertIncludes(
    quotePageToastsSource,
    'params.get("updated")',
    "Quote page toasts must handle updated quotes",
  );
  assertIncludes(
    quotePageToastsSource,
    'params.get("cancelled")',
    "Quote page toasts must handle cancelled quotes",
  );

  const layoutSource = readFileSync("src/app/layout.tsx", "utf8");
  assertIncludes(
    layoutSource,
    "ToasterProvider",
    "Root layout must mount the react-hot-toast provider",
  );

  // Desktop table must not render a concepts column; preview is shown in a dialog.
  const desktopTableEnd = pageSource.indexOf("{/* Mobile cards */}");
  const desktopTableSource = pageSource.slice(0, desktopTableEnd);
  assert(
    !desktopTableSource.includes("<TableHead>Conceptos</TableHead>"),
    "Desktop quotes table must not include a concepts column",
  );
  assertIncludes(
    pageSource,
    "QuotePreviewDialog",
    "Quotes page must render a preview dialog for each quote",
  );

  const previewDialogSource = readFileSync(
    "src/features/quotes/components/quote-preview-dialog.tsx",
    "utf8",
  );
  assert(
    !previewDialogSource.includes("({itemTypeLabels[item.type] ?? item.type})"),
    "Quote preview dialog must not show item type as parenthetical text",
  );
  assertIncludes(
    previewDialogSource,
    '<Badge variant="default">{itemTypeLabels[item.type] ?? item.type}</Badge>',
    "Quote preview dialog must render item type as a badge",
  );
  assertIncludes(
    previewDialogSource,
    'aria-label="Cerrar"',
    "Quote preview dialog must expose an explicit close button",
  );

  // Builder concept rows must not show visible "Concepto N" headings.
  assert(
    !combinedBuilderSource.includes("Concepto {index + 1}"),
    "Quote builder must not render visible Concepto N headings",
  );
  assertIncludes(
    combinedBuilderSource,
    'inputMode="numeric"',
    "Quote builder quantity input must use a numeric input mode",
  );
  assertIncludes(
    combinedBuilderSource,
    'pattern="[0-9]*"',
    "Quote builder quantity input must restrict input to digits",
  );

  assertIncludes(
    paymentLinkDialogSource,
    "max-w-2xl",
    "Payment link dialog must cap its width like other dialogs",
  );

  assertIncludes(
    readFileSync("src/components/ui/toaster.tsx", "utf8"),
    'position="bottom-center"',
    "Global toast provider must be positioned at the bottom center",
  );

  // Heading hierarchy must not collapse to all h3.
  assertIncludes(pageSource, 'as="h1"', "Page must render a real h1 via CardTitle");
  assertIncludes(pageSource, 'as="h2"', "Section headings must be h2");

  // User-facing copy must stay in Mexican Spanish.
  const spanishLabels = [
    { label: "Cotizaciones en borrador", source: pageSource },
    { label: "Nueva cotización", source: builderDialogSource },
    { label: "Crear cotización en borrador", source: combinedBuilderSource },
    { label: "Conceptos", source: combinedBuilderSource },
    { label: "Cliente", source: combinedBuilderSource },
    { label: "Título", source: combinedBuilderSource },
    { label: "Descripción", source: combinedBuilderSource },
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
