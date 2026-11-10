import { expect, test } from "@playwright/test";
import path from "node:path";

for (const width of [390, 1440]) {
  test(`Quotes operational filters at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/quote-filters?concept=aceite&economicNumber=ECO-42&hasWorkOrder=false&page=3");
    await expect(page.getByText("Concepto: aceite", { exact: true })).toBeVisible();
    await expect(page.getByText("ECO: ECO-42", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mostrar filtros" }).click();
    await page.getByLabel("Folio", { exact: true }).fill("C-42");
    await page.getByLabel("Cliente", { exact: true }).click();
    await page.getByRole("option", { name: "Taller de prueba", exact: true }).click();
    await page.getByLabel("Tipo de operación").click();
    await page.getByRole("option", { name: "Venta", exact: true }).click();
    await page.getByLabel("Mostrar archivadas", { exact: true }).check();
    await page.getByLabel("Mostrar canceladas", { exact: true }).check();
    await page.getByLabel("Placas", { exact: true }).fill("ABC-123");
    await page.getByLabel("Desde", { exact: true }).fill("2026-08-01");
    await page.getByLabel("Hasta", { exact: true }).fill("2026-08-31");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/quotes\?/);
    const expected = { number: "C-42", concept: "aceite", customerId: "fixture-customer", plate: "ABC-123", economicNumber: "ECO-42", dateFrom: "2026-08-01", dateTo: "2026-08-31", kind: "SALE", hasWorkOrder: "false", showArchived: "true", showCancelled: "true" };
    let params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual(expected);
    await expect(page.getByText("Tipo: Venta", { exact: true })).toBeVisible();
    await expect(page.getByText("Cliente: Taller de prueba", { exact: true })).toBeVisible();

    await page.getByLabel("Estatus", { exact: true }).click();
    await page.getByRole("option", { name: "Enviada", exact: true }).click();
    await expect(page.getByRole("link", { name: "Enviadas", exact: true })).toHaveAttribute("aria-current", "page");
    params = new URL(page.url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({ ...expected, status: "SENT" });
    await expect(page.getByLabel("Estatus", { exact: true })).toHaveText("Enviada");
    await expect(page.getByText("Fecha operativa de cotización (ambos días incluidos)")).toBeVisible();
    for (const input of await page.locator('input[type="search"], input[type="date"]').all()) {
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `quote-filters-${width}.png`), fullPage: true });

    await page.getByLabel("Desde", { exact: true }).fill("2026-09-01");
    const before = page.url();
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("La fecha operativa desde no puede ser posterior a hasta");
    expect(page.url()).toBe(before);
    await page.getByRole("button", { name: "Limpiar", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/quotes$/);
    await expect(page.getByText("Sin filtros activos", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
