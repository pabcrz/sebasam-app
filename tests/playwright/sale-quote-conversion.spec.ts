import { expect, test, type Page } from "@playwright/test";

type ConversionOperation = "SALE" | "WORK";

type ConversionRequest = {
  quoteId: string;
  operation: ConversionOperation;
};

type WorkAssignmentRequest = {
  isSpecial: boolean;
  masterId?: string;
  helperIds?: string[];
};

type WorkCompletionRequest = {
  workOrderId: string;
};

type SaleQuoteFixtureData = {
  id: string;
  operation: ConversionOperation;
  title: string;
  customerName: string;
};

declare global {
  interface Window {
    __saleQuoteConversionQuote?: SaleQuoteFixtureData;
    __saleQuoteConversionMock?: {
      calls: ConversionRequest[];
      createNote: (request: ConversionRequest) => Promise<{ success: true }>;
    };
    __quoteFlowContract?: {
      convertCalls: ConversionRequest[];
      assignCalls: WorkAssignmentRequest[];
      completeCalls: WorkCompletionRequest[];
      convert: (request: ConversionRequest) => Promise<{ success: true }>;
      assign: (request: WorkAssignmentRequest) => Promise<{ success: true }>;
      complete: (request: WorkCompletionRequest) => Promise<{ success: true }>;
    };
  }
}

const saleQuoteFixture: SaleQuoteFixtureData = {
  id: "quote-sale-fixture",
  operation: "SALE",
  title: "Venta mostrador fixture",
  customerName: "Cliente Venta",
};

const quoteFlowFixture = {
  saleQuoteId: "quote-flow-sale",
  workQuoteId: "quote-flow-work",
  workOrderId: "work-order-assigned",
  saleQuoteNumber: "C-SALE-001",
  workQuoteNumber: "C-WORK-001",
  masterId: "worker-master-1",
  masterName: "Maestro principal",
  helperId: "worker-helper-1",
  helperName: "Ayudante principal",
} as const;

const devices = [
  { name: "desktop quote row", value: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "mobile quote card", value: "mobile", viewport: { width: 390, height: 900 } },
] as const;

async function installQuoteFlowContract(page: Page) {
  await page.addInitScript(() => {
    window.__quoteFlowContract = {
      convertCalls: [],
      assignCalls: [],
      completeCalls: [],
      async convert(request) {
        window.__quoteFlowContract?.convertCalls.push(request);
        return { success: true };
      },
      async assign(request) {
        window.__quoteFlowContract?.assignCalls.push(request);
        return { success: true };
      },
      async complete(request) {
        window.__quoteFlowContract?.completeCalls.push(request);
        return { success: true };
      },
    };
  });
}

async function openQuoteFlow(
  page: Page,
  options: { device: "desktop" | "mobile"; operation?: ConversionOperation; stage?: "unassigned" | "assigned" },
) {
  await installQuoteFlowContract(page);
  const params = new URLSearchParams({ device: options.device, operation: options.operation ?? "SALE" });
  if (options.stage) params.set("stage", options.stage);
  await page.goto(`/quote-flow?${params.toString()}`);
}

async function expectNoWorkControls(page: Page) {
  await expect(page.getByRole("button", { name: /crear orden de trabajo/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /asignar trabajo/i })).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: /maestro/i })).toHaveCount(0);
  await expect(page.getByLabel(/maestro/i)).toHaveCount(0);
  await expect(page.getByText(/maestro/i)).toHaveCount(0);
}

test.describe("SALE quote conversion browser contract", () => {
  test("opens a SALE quote fixture as a sale-note dialog without WORK controls", async ({ page }) => {
    await page.addInitScript((quote) => {
      window.__saleQuoteConversionQuote = quote;
      window.__saleQuoteConversionMock = {
        calls: [],
        async createNote(request) {
          window.__saleQuoteConversionMock?.calls.push(request);
          return { success: true };
        },
      };
    }, saleQuoteFixture);

    await page.goto("/sale-quote");

    const dialog = page.getByRole("dialog", { name: /nota de venta/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Cotización C-SALE-001");
    await expect(dialog).toContainText(/no crea una orden de trabajo/i);

    await expectNoWorkControls(page);

    await page.getByRole("button", { name: "Crear nota de venta" }).click();

    await expect
      .poll(() => page.evaluate(() => window.__saleQuoteConversionMock?.calls ?? []))
      .toEqual([{ quoteId: "quote-sale-fixture", operation: "SALE" }]);
    await expect(page).toHaveURL(/\/admin\/notas$/);
  });
});

test.describe("SALE quote-flow browser contract", () => {
  for (const device of devices) {
    test(`${device.name} converts a SALE quote without exposing WORK controls`, async ({ page }) => {
      await page.setViewportSize(device.viewport);
      await openQuoteFlow(page, { device: device.value });

      await page
        .getByRole("button", { name: new RegExp(`crear nota de venta.*${quoteFlowFixture.saleQuoteNumber}`, "i") })
        .click();

      const dialog = page.getByRole("dialog", { name: /crear nota de venta/i });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(`Cotización ${quoteFlowFixture.saleQuoteNumber}`);
      await expect(dialog).toContainText(/no crea una orden de trabajo/i);
      await expectNoWorkControls(page);

      await dialog.getByRole("button", { name: "Crear nota de venta" }).click();

      await expect
        .poll(() => page.evaluate(() => window.__quoteFlowContract?.convertCalls ?? []))
        .toEqual([{ quoteId: quoteFlowFixture.saleQuoteId, operation: "SALE" }]);
      await expect(page).toHaveURL(/\/admin\/notas$/);
    });
  }
});

test.describe("WORK quote-flow browser contract", () => {
  for (const device of devices) {
    test(`${device.name} assigns an unassigned WORK quote through the work-order callback`, async ({ page }) => {
      await page.setViewportSize(device.viewport);
      await openQuoteFlow(page, { device: device.value, operation: "WORK", stage: "unassigned" });

      await page
        .getByRole("button", { name: /asignar trabajo|gestionar trabajo de cotización/i })
        .first()
        .click();

      const dialog = page.getByRole("dialog", { name: /asignar trabajo/i });
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(`Cotización ${quoteFlowFixture.workQuoteNumber}`);
      await dialog.getByRole("combobox", { name: /maestro responsable/i }).click();
      await page.getByRole("option", { name: quoteFlowFixture.masterName }).click();
      await dialog.getByRole("checkbox", { name: quoteFlowFixture.helperName }).check();

      await dialog.getByRole("button", { name: /asignar e iniciar trabajo/i }).click();

      await expect
        .poll(() => page.evaluate(() => window.__quoteFlowContract?.assignCalls ?? []))
        .toEqual([{ isSpecial: false, masterId: quoteFlowFixture.masterId, helperIds: [quoteFlowFixture.helperId] }]);
      await expect
        .poll(() => page.evaluate(() => window.__quoteFlowContract?.convertCalls ?? []))
        .toEqual([]);
    });

    test(`${device.name} completes an assigned WORK quote through the work-order callback`, async ({ page }) => {
      await page.setViewportSize(device.viewport);
      await openQuoteFlow(page, { device: device.value, operation: "WORK", stage: "assigned" });

      await page
        .getByRole("button", { name: /asignar trabajo para cotización C-WORK-001|gestionar orden de trabajo|gestionar trabajo/i })
        .first()
        .click();

      const dialog = page.getByRole("dialog", { name: /orden de trabajo/i });
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: /finalizar trabajo/i }).click();
      await dialog.getByRole("button", { name: /sí, finalizar orden/i }).click();

      await expect
        .poll(() => page.evaluate(() => window.__quoteFlowContract?.completeCalls ?? []))
        .toEqual([{ workOrderId: quoteFlowFixture.workOrderId }]);
      await expect
        .poll(() => page.evaluate(() => window.__quoteFlowContract?.convertCalls ?? []))
        .toEqual([]);
      await expect
        .poll(() => page.evaluate(() => window.__quoteFlowContract?.assignCalls ?? []))
        .toEqual([]);
    });
  }
});
