import { expect, test } from "@playwright/test";

for (const width of [375, 1024, 1366]) {
  test(`preview stays within its sheet at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 812 });
    await page.goto("/responsive-preview");
    await page.getByRole("group", { name: "Abrir prueba" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
    const description = page.getByText("Cambio de clutch", { exact: true }).last();
    expect((await description.boundingBox())!.width).toBeGreaterThan(200);
    const footer = dialog.locator("[data-dialog-footer]");
    expect(await footer.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
}

test("compact card title and amount never overlap", async ({ page }) => {
  await page.goto("/responsive-preview");
  const title = (await page.getByRole("heading", { name: "Cambio de clutch" }).boundingBox())!;
  const amount = (await page.getByTestId("entity-card-amount").boundingBox())!;
  expect(title.x + title.width <= amount.x || title.y + title.height <= amount.y).toBe(true);
  expect(await page.getByTestId("entity-card-amount").evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
});

test("mobile period uses two rows and payroll labels remain fully visible", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/responsive-preview");
  const arrows = (await page.getByRole("group", { name: "Cambiar periodo" }).boundingBox())!;
  const today = (await page.getByRole("button", { name: "Hoy", exact: true }).boundingBox())!;
  expect(Math.abs(arrows.y - today.y)).toBeLessThan(5);
  const label = page.getByText("Mano de obra facturada", { exact: true });
  expect(await label.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
  expect(await label.evaluate(e => getComputedStyle(e).textOverflow)).not.toBe("ellipsis");
});
