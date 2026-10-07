import { expect, test } from "@playwright/test";

type ConversionOperation = "SALE" | "WORK";

type ConversionRequest = {
  quoteId: string;
  operation: ConversionOperation;
};

type PersistedSaleQuote = {
  id: string;
  operation: ConversionOperation;
  title: string;
  customerName: string;
};

declare global {
  interface Window {
    __saleQuoteConversionQuote?: PersistedSaleQuote;
    __saleQuoteConversionMock?: {
      calls: ConversionRequest[];
      createNote: (request: ConversionRequest) => Promise<{ success: true }>;
    };
  }
}

const persistedSaleQuote: PersistedSaleQuote = {
  id: "quote-sale-persisted",
  operation: "SALE",
  title: "Venta mostrador persistida",
  customerName: "Cliente Venta",
};

test.describe("SALE quote conversion browser contract", () => {
  test("opens a persisted SALE quote as a sale-note dialog without WORK controls", async ({ page }) => {
    await page.addInitScript((quote) => {
      window.__saleQuoteConversionQuote = quote;
      window.__saleQuoteConversionMock = {
        calls: [],
        async createNote(request) {
          window.__saleQuoteConversionMock?.calls.push(request);
          return { success: true };
        },
      };
    }, persistedSaleQuote);

    await page.goto("/sale-quote");

    const dialog = page.getByRole("dialog", { name: /nota de venta/i });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Cotización C-SALE-001");
    await expect(dialog).toContainText(/no crea una orden de trabajo/i);

    await expect(page.getByRole("button", { name: /crear orden de trabajo/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /asignar trabajo/i })).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: /maestro/i })).toHaveCount(0);
    await expect(page.getByLabel(/maestro/i)).toHaveCount(0);
    await expect(page.getByText(/maestro/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Crear nota de venta" }).click();

    await expect
      .poll(() => page.evaluate(() => window.__saleQuoteConversionMock?.calls ?? []))
      .toEqual([{ quoteId: "quote-sale-persisted", operation: "SALE" }]);
    await expect(page).toHaveURL(/\/admin\/notas$/);
  });
});
