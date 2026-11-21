import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

/** Waits for the sheet's slide animation to finish; measuring earlier sees it half off screen. */
async function settled(page: Page) {
  await page.getByRole("dialog").evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
}

for (const width of [390, 1440]) {
  test(`Quotes operational filters at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/quote-filters?concept=aceite&economicNumber=ECO-42&hasWorkOrder=false&page=3");
    await expect(page.getByText("Concepto: aceite", { exact: true })).toBeVisible();
    await expect(page.getByText("ECO: ECO-42", { exact: true })).toBeVisible();

    // The folio is the page search; it applies on Enter and the sheet starts from the new URL.
    await page.getByRole("searchbox", { name: "Buscar por folio" }).fill("C-42");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("searchbox", { name: /Buscar por folio/ })).toHaveValue("C-42");

    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByRole("button", { name: "Elegir fechas" }).click();
    await page.getByLabel("Desde", { exact: true }).fill("2026-08-01");
    await page.getByLabel("Hasta", { exact: true }).fill("2026-08-31");
    await page.getByRole("group", { name: "Tipo de operación" }).getByRole("button", { name: "Venta" }).click();
    await page.getByLabel("Cliente", { exact: true }).click();
    await page.getByRole("option", { name: "Taller de prueba", exact: true }).click();
    await page.getByLabel("Placas", { exact: true }).fill("ABC-123");
    await page.getByLabel("Incluir canceladas").check();
    await page.getByLabel("Incluir archivadas").check();

    await settled(page);
    for (const input of await page.getByRole("dialog").locator('input[type="search"], input[type="date"]').all()) {
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `quote-filters-${width}.png`), fullPage: true });

    await page.getByRole("button", { name: "Ver resultados" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/quotes\?/);
    const expected = { number: "C-42", concept: "aceite", customerId: "fixture-customer", plate: "ABC-123", economicNumber: "ECO-42", dateFrom: "2026-08-01", dateTo: "2026-08-31", kind: "SALE", hasWorkOrder: "false", showArchived: "true", showCancelled: "true" };
    let params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual(expected);
    await expect(page.getByText("Tipo: Venta", { exact: true })).toBeVisible();
    await expect(page.getByText("Cliente: Taller de prueba", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Enviadas", exact: true }).click();
    await expect(page.getByRole("link", { name: "Enviadas", exact: true })).toHaveAttribute("aria-current", "page");
    params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({ ...expected, status: "SENT" });

    await page.getByRole("button", { name: /^Filtros/ }).click();
    await page.getByLabel("Desde", { exact: true }).fill("2026-09-01");
    const before = page.url();
    await page.getByRole("button", { name: "Ver resultados" }).click();
    await expect(page.getByRole("alert")).toContainText("La fecha operativa desde no puede ser posterior a hasta");
    expect(page.url()).toBe(before);
    // The sheet's own "Limpiar" only resets its draft; the page-level one clears the URL.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "Limpiar", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/quotes$/);
    await expect(page.getByRole("group", { name: "Filtros activos" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
