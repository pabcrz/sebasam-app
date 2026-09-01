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
  const cancelFormPath = "src/features/quotes/components/quote-cancel-form.tsx";
  const cancelFormSource = readFileSync(cancelFormPath, "utf8");
  const listRowPath = "src/features/quotes/components/quote-list-row.tsx";
  const listRowSource = readFileSync(listRowPath, "utf8");
  const mobileCardPath = "src/features/quotes/components/quote-mobile-card.tsx";
  const mobileCardSource = readFileSync(mobileCardPath, "utf8");
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
    "createAction={createQuoteFromWorkspace}",
    "Quote builder must wire to createQuoteFromWorkspace server action",
  );
  assertIncludes(
    pageSource,
    "approveQuoteAndCreateWorkOrderFromForm",
    "Approval form must wire to approveQuoteAndCreateWorkOrderFromForm server action",
  );
  assertIncludes(
    pageSource,
    "cancelQuoteFromForm",
    "Quotes page must wire cancelQuoteFromForm server action",
  );
  assertIncludes(
    pageSource,
    "getOrCreatePaymentRequestForQuote",
    "Quotes page must wire payment-link server action",
  );
  assertIncludes(
    listRowSource,
    "PaymentRequestLinkDialog",
    "Desktop quote list row must render PaymentRequestLinkDialog",
  );
  assertIncludes(
    mobileCardSource,
    "PaymentRequestLinkDialog",
    "Mobile quote card must render PaymentRequestLinkDialog",
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
    "if (nextOpen) {",
    "Quote builder dialog must distinguish explicit open requests from outside/Escape close requests",
  );
  assertIncludes(
    builderDialogSource,
    "setOpen(true);",
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

  // Draft quotes must expose a visible cancel action.
  assertIncludes(
    listRowSource,
    "QuoteCancelForm",
    "Desktop quote list row must render QuoteCancelForm for draft quotes",
  );
  assertIncludes(
    mobileCardSource,
    "QuoteCancelForm",
    "Mobile quote card must render QuoteCancelForm for draft quotes",
  );
  assertIncludes(
    pageSource,
    "cancelAction={cancelQuoteFromForm}",
    "Quotes page must wire cancelQuoteFromForm into quote cards",
  );
  assertIncludes(
    cancelFormSource,
    'formData.set("quoteId"',
    "Cancel form must set quoteId in the FormData",
  );
  assertIncludes(
    cancelFormSource,
    "event.stopPropagation()",
    "Cancel form button must stop propagation to avoid triggering row/card preview",
  );

  // Recent quote cards must open the preview dialog on click.
  assertIncludes(
    pageSource,
    "QuoteListCard",
    "Quotes page must render QuoteListCard for recent quotes",
  );
  assertIncludes(
    listRowSource,
    "setPreviewOpen(true)",
    "Desktop quote row click must open the preview dialog",
  );
  assertIncludes(
    listRowSource,
    "event.stopPropagation()",
    "Desktop quote action cells must stop propagation to avoid triggering preview",
  );
  assertIncludes(
    mobileCardSource,
    "setPreviewOpen(true)",
    "Mobile quote card click must open the preview dialog",
  );
  if (mobileCardSource.includes("<OperationalCard")) {
    assertIncludes(
      mobileCardSource,
      "actions=",
      "Mobile quote action row must be passed to actions prop of OperationalCard",
    );
  } else {
    const mobilePreviewButtonEnd = mobileCardSource.indexOf("</button>");
    const mobileActionRowStart = mobileCardSource.includes('data-testid="quote-secondary-actions"')
      ? mobileCardSource.indexOf('data-testid="quote-secondary-actions"')
      : mobileCardSource.indexOf("<OperationalActionRow>");
    assert(
      mobilePreviewButtonEnd >= 0 && mobileActionRowStart > mobilePreviewButtonEnd,
      "Mobile quote action row must remain outside the preview button",
    );
  }

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
    "sections.${sectionIndex}.items.${itemIndex}.type",
    "sections.${sectionIndex}.items.${itemIndex}.description",
    "sections.${sectionIndex}.items.${itemIndex}.quantity",
    "sections.${sectionIndex}.items.${itemIndex}.unitPrice",
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
    'getNextNumber("quote", "C", 3',
    "Quote numbering must use C- prefix for sequential numbers",
  );
  assertIncludes(
    sequenceSource,
    'getNextNumber("workOrder", "T", 2',
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
  assertIncludes(
    combinedBuilderSource,
    "maxLength={10}",
    "Quote builder plate input must limit input to 10 characters",
  );
  assertIncludes(
    combinedBuilderSource,
    "new Date().getFullYear() + 1",
    "Quote builder year input must cap at current year plus one",
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
    "onPointerDownOutside",
    "Select content must coordinate its accepted outside pointer events with a parent dialog",
  );
  assertIncludes(
    selectSource,
    "stopImmediatePropagation",
    "Select content must stop option pointerdown propagation before it reaches a parent dialog",
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
    "consumePointerDownOutside",
    "Dialog must consume the matching Select outside pointer event exactly once",
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
    listRowSource,
    "QuotePreviewDialog",
    "Desktop quote list row must render a preview dialog",
  );
  assertIncludes(
    mobileCardSource,
    "QuotePreviewDialog",
    "Mobile quote card must render a preview dialog",
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
    "<QuotePreviewCard {...preview} />",
    "Quote preview dialog must delegate quote rendering to QuotePreviewCard",
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

  // Heading hierarchy: section headings must be h2.
  assertIncludes(pageSource, 'as="h2"', "Section headings must be h2");

  // Quote filters must be wired to URL params and render the filter controls.
  assertIncludes(pageSource, "QuoteFilters", "Quotes page must render QuoteFilters");
  assertIncludes(pageSource, "quoteFilterSchema", "Quotes page must parse filters via quoteFilterSchema");
  assertIncludes(
    pageSource,
    'listPaginatedQuotes(params, { operationalQueue: "quotes" })',
    "Quotes page must pass search params to the paginated quotes query",
  );

  const quoteFiltersSource = readFileSync(
    "src/features/quotes/components/quote-filters.tsx",
    "utf8",
  );
  for (const field of ["status", "customerId", "number", "plate", "dateFrom", "dateTo"]) {
    assertIncludes(
      quoteFiltersSource,
      `name="${field}"`,
      `Quote filters must expose field: ${field}`,
    );
  }
  assertIncludes(
    quoteFiltersSource,
    'router.push(`/admin/quotes?${params.toString()}`)',
    "Quote filters must push filter params to the URL",
  );
  assertIncludes(
    quoteFiltersSource,
    'router.push("/admin/quotes")',
    "Quote filters must offer a clear action",
  );
  assertIncludes(
    quoteFiltersSource,
    "Limpiar",
    "Quote filters must label the clear action in Spanish",
  );

  // Empty state must explain how to clear filters or create a new record.
  assertIncludes(pageSource, "Limpiar filtros", "Quotes empty state must offer to clear filters");
  assertIncludes(pageSource, "crea una nueva cotización", "Quotes empty state must suggest creating a quote");

  // User-facing copy must stay in Mexican Spanish.
  const spanishLabels = [
    { label: "Cotizaciones", source: pageSource },
    { label: "Nueva cotización", source: builderDialogSource },
    { label: "Crear cotización", source: combinedBuilderSource },
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

function checkAdminPageHeaders() {
  const adminShellSource = readFileSync("src/components/layout/admin-shell.tsx", "utf8");
  assertIncludes(
    adminShellSource,
    "<h1",
    "AdminShell must render the dynamic section h1 heading in the desktop top bar",
  );
  assertIncludes(
    adminShellSource,
    "getSectionTitle",
    "AdminShell must compute section title via getSectionTitle",
  );

  const adminPageHeaderSource = readFileSync("src/components/admin-page-header.tsx", "utf8");
  assertIncludes(adminPageHeaderSource, "icon: LucideIcon", "Shared header must accept an icon");
  assertIncludes(adminPageHeaderSource, "title: string", "Shared header must accept a title");
  assert(!adminPageHeaderSource.includes("eyebrow"), "Shared header must not accept or render an eyebrow");
  assertIncludes(adminPageHeaderSource, "description?: ReactNode", "Shared header must accept a truthful description");
  assertIncludes(adminPageHeaderSource, "actions?: ReactNode", "Shared header must accept contextual actions");
  assertIncludes(adminPageHeaderSource, 'variant?: "compact" | "expanded"', "Shared header must expose the approved variants");
  assert(!adminPageHeaderSource.includes("CardContent"), "Shared header must not render a card body");
}

function checkCustomerPages() {
  const createPageSource = readFileSync(
    "src/app/admin/(protected)/customers/page.tsx",
    "utf8",
  );
  const customerSearchSource = readFileSync(
    "src/features/customers/components/customer-search.tsx",
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

  // Customer search must cover contact info and related vehicle plates.
  assertIncludes(
    createPageSource,
    "<CustomerSearch />",
    "Customer create page must render CustomerSearch",
  );
  assertIncludes(
    customerSearchSource,
    "placas",
    "Customer search placeholder must mention vehicle plates",
  );
  assertIncludes(
    createPageSource,
    "Limpiar búsqueda",
    "Customer empty state must offer to clear the search",
  );
  assertIncludes(
    createPageSource,
    "da de alta un nuevo cliente",
    "Customer empty state must suggest creating a customer",
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
  const publicPaymentPageSource = readFileSync(
    "src/features/public-payment/components/public-payment-page.tsx",
    "utf8",
  );
  const shellSource = readFileSync("src/features/public-payment/components/public-payment-shell.tsx", "utf8");
  const bankCardSource = readFileSync(
    "src/features/public-payment/components/bank-data-card.tsx",
    "utf8",
  );

  assertNoRadix(pageSource, "Public payment page");
  assertNoRadix(publicPaymentPageSource, "Public payment component");
  assertNoRadix(shellSource, "Public payment shell");
  assertIncludes(
    pageSource,
    "account.isForInvoicing === requiresInvoice",
    "Public payment page must select only the bank account class required by the request",
  );
  assertIncludes(
    pageSource,
    "result.request.requiresInvoice",
    "Public payment page must filter accounts using stored invoice metadata",
  );

  const publicPaymentSource = `${pageSource}\n${publicPaymentPageSource}`;
  for (const obsoletePublicFiscalSymbol of [
    "setPaymentRequestInvoicePreference",
    "savePaymentRequestFiscalData",
    "InvoiceDecision",
    "FiscalDataForm",
  ]) {
    assert(
      !publicPaymentSource.includes(obsoletePublicFiscalSymbol),
      `Public payment surface must not wire obsolete fiscal symbol: ${obsoletePublicFiscalSymbol}`,
    );
  }

  // User-facing copy must stay in Mexican Spanish.
  const spanishLabels = [
    { label: "Datos de pago", source: bankCardSource },
    { label: "Enviar comprobante", source: readFileSync("src/features/public-payment/components/whatsapp-receipt-cta.tsx", "utf8") },
  ];

  for (const { label, source } of spanishLabels) {
    assertIncludes(source, label, `Expected Spanish copy missing: ${label}`);
  }
}

checkQuotesPage();
checkAdminPageHeaders();
checkCustomerPages();
checkLoginPage();
checkRootPage();
checkPublicPaymentPage();

console.log(
  "UI contract verified for /, /admin/login, /admin/quotes, /admin/customers, /datos-de-pago/[token] and payment-request link generation.",
);
