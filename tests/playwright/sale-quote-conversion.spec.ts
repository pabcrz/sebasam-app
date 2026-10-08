import { expect, test, type Page } from "@playwright/test";

type ConversionOperation = "SALE";

type ConversionRequest = {
  quoteId: string;
  operation: ConversionOperation;
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
      convert: (request: ConversionRequest) => Promise<{ success: true }>;
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
  saleQuoteNumber: "C-SALE-001",
} as const;

const devices = [
  { name: "desktop quote row", value: "desktop", viewport: { width: 1280, height: 900 } },
  { name: "mobile quote card", value: "mobile", viewport: { width: 390, height: 900 } },
] as const;

async function installQuoteFlowContract(page: Page) {
  await page.addInitScript(() => {
    window.__quoteFlowContract = {
      convertCalls: [],
      async convert(request) {
        window.__quoteFlowContract?.convertCalls.push(request);
        return { success: true };
      },
    };
  });
}

async function openQuoteFlow(page: Page, options: { device: "desktop" | "mobile" }) {
  await installQuoteFlowContract(page);
  const params = new URLSearchParams({ device: options.device, operation: "SALE" });
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
