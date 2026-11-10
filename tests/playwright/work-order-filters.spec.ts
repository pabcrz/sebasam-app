import { expect, test } from "@playwright/test";
import path from "node:path";

for (const width of [390, 1440]) {
  test(`Work operational filters at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/work-filters?concept=aceite&economicNumber=ECO-42&page=3");
    await expect(page.getByText("Concepto: aceite", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Mostrar filtros" }).click();
    await page.getByLabel("Folio", { exact: true }).fill("OT-42");
    await page.getByLabel("Cliente", { exact: true }).click();
    await page.getByRole("option", { name: "Taller de prueba", exact: true }).click();
    await page.getByLabel("Ejecución", { exact: true }).click();
    await page.getByRole("option", { name: "Pendiente de asignación", exact: true }).click();
    await page.getByLabel("Responsable", { exact: true }).click();
    await page.getByRole("option", { name: "Taller especial", exact: true }).click();
    await page.getByLabel("Placas", { exact: true }).fill("ABC-123");
    for (const [label, value] of [["Fecha operativa desde", "2026-08-01"], ["Fecha operativa hasta", "2026-08-31"], ["Programación desde", "2026-09-01"], ["Programación hasta", "2026-09-30"]]) {
      await page.getByLabel(label, { exact: true }).fill(value);
    }
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/work-orders\?/);
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({
      number: "OT-42", concept: "aceite", customerId: "fixture-customer", plate: "ABC-123", economicNumber: "ECO-42",
      dateFrom: "2026-08-01", dateTo: "2026-08-31", execution: "PLANNED", assignee: "workshop", scheduledFrom: "2026-09-01", scheduledTo: "2026-09-30",
    });
    for (const text of ["Folio: OT-42", "Concepto: aceite", "Cliente: Taller de prueba", "Placas: ABC-123", "ECO: ECO-42", "Ejecución: Pendiente de asignación", "Responsable: Taller especial", "Fecha operativa desde: 2026-08-01", "Fecha operativa hasta: 2026-08-31", "Programación desde: 2026-09-01", "Programación hasta: 2026-09-30"]) {
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    for (const input of await page.locator('input, button[role="combobox"]').all()) {
      const box = await input.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `work-order-filters-${width}.png`), fullPage: true });
    const before = page.url();
    await page.getByLabel("Programación desde", { exact: true }).fill("2026-10-01");
    await page.getByRole("button", { name: "Filtrar", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("La programación desde no puede ser posterior a hasta");
    expect(page.url()).toBe(before);
    await page.getByRole("button", { name: "Limpiar", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/work-orders$/);
    await expect(page.getByText("Sin filtros activos", { exact: true })).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
