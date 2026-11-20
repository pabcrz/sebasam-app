import { expect, test, type Locator, type Page } from "@playwright/test";
import path from "node:path";

const viewports = [320, 390, 768, 1440];
const displayedRangeLabel = "28 de septiembre – 3 de octubre de 2026";

/** Waits for the sheet's slide animation to finish; measuring earlier sees it half off screen. */
async function settled(page: Page) {
  await page.getByRole("dialog").evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
}

const openSheet = (page: Page) => page.getByRole("button", { name: "Abrir filtros de cartera" }).click();
const applySheet = (page: Page) => page.getByRole("button", { name: "Ver resultados" }).click();

type Box = { x: number; y: number; width: number; height: number };

function getBox(box: Box | null, description: string): Box {
  if (!box) throw new Error(`${description} has no rendered bounding box.`);
  return box;
}

async function assertNoOverlap(locators: Locator[]) {
  const boxes = await Promise.all(locators.map((locator) => locator.boundingBox()));
  const renderedBoxes = boxes.map((box, index) => getBox(box, `Element ${index + 1}`));

  for (let leftIndex = 0; leftIndex < renderedBoxes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < renderedBoxes.length; rightIndex += 1) {
      const left = renderedBoxes[leftIndex];
      const right = renderedBoxes[rightIndex];
      const overlapWidth = Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x);
      const overlapHeight = Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y);

      expect(overlapWidth > 0.5 && overlapHeight > 0.5).toBe(false);
    }
  }
}

async function assertInside(inner: Box, outer: Box, description: string) {
  expect(inner.x, `${description} starts left of its panel`).toBeGreaterThanOrEqual(outer.x - 1);
  expect(inner.y, `${description} starts above its panel`).toBeGreaterThanOrEqual(outer.y - 1);
  expect(inner.x + inner.width, `${description} extends beyond its panel`).toBeLessThanOrEqual(
    outer.x + outer.width + 1,
  );
  expect(inner.y + inner.height, `${description} extends beyond its panel`).toBeLessThanOrEqual(
    outer.y + outer.height + 1,
  );
}

test.describe("NotasFilters responsive browser layout", () => {
  for (const width of viewports) {
    test(`${width}px viewport keeps the filter panel usable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");

      const panel = page.locator('[aria-label="Filtros de notas"]');
      await expect(panel).toBeVisible();

      const pageOverflow = await page.evaluate(() => ({
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
      }));
      expect(pageOverflow.documentWidth).toBeLessThanOrEqual(width);
      expect(pageOverflow.bodyWidth).toBeLessThanOrEqual(width);

      const panelOverflow = await panel.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
      // 44px tap areas (::before) may poke a few px past a small control; anything larger is a real overflow.
      expect(panelOverflow.scrollWidth).toBeLessThanOrEqual(panelOverflow.clientWidth + 8);

      const periodRow = [
        page.getByRole("button", { name: "Periodo anterior" }),
        page.getByText(displayedRangeLabel, { exact: true }),
        page.getByRole("button", { name: "Periodo siguiente" }),
        page.getByRole("button", { name: "Hoy" }),
      ];
      for (const element of periodRow) {
        await expect(element).toBeVisible();
        await assertInside(getBox(await element.boundingBox(), "Period control"), getBox(await panel.boundingBox(), "Filter panel"), "Period control");
      }
      await assertNoOverlap(periodRow);

      const searchRow = [page.getByRole("searchbox", { name: "Buscar por folio" }), page.getByRole("button", { name: "Abrir filtros de cartera" })];
      for (const control of searchRow) {
        await expect(control).toBeVisible();
        await assertInside(getBox(await control.boundingBox(), "Search control"), getBox(await panel.boundingBox(), "Filter panel"), "Search control");
      }
      await assertNoOverlap(searchRow);

      await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-page-legacy-${width}.png`), fullPage: true });

      await openSheet(page);
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await settled(page);
      const dateInput = page.getByLabel("Semana", { exact: true });
      await expect(dateInput).toBeEnabled();
      await expect(dateInput).toHaveAttribute("type", "date");
      await assertInside(getBox(await dateInput.boundingBox(), "Date input"), getBox(await dialog.boundingBox(), "Filters dialog"), "Date input");
    });
  }
});

const master = "a0b1c2d3-1234-4abc-8def-1234567890ab";
const sheetClear = (page: Page) => page.getByRole("dialog").getByRole("button", { name: "Limpiar", exact: true }).click();

for (const width of [390, 1440]) {
  test(`Operational Notes at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const common = { number: "N-42", concept: "aceite", customerId: "cust-1", plate: "ABC-123", economicNumber: "ECO-42", dateFrom: "2026-08-01", dateTo: "2026-08-31", overdue: "overdue", showArchived: "true", showCancelled: "true" };
    function retained(url: string) {
      const query = new URL(url).searchParams;
      for (const [key, value] of Object.entries(common)) expect(query.get(key)).toBe(value);
      expect(query.has("page")).toBe(false);
      return query;
    }
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/notes-operational?${new URLSearchParams({ ...common, mode: "week", anchor: "2026-08-05", payment: "partial", kind: "WORK", assignee: "workshop", page: "3" })}`);
    await expect(page.getByRole("button", { name: "Parciales", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Concepto: aceite", { exact: true })).toBeVisible();
    await expect(page.getByText("Responsable: Taller", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-page-navigation-${width}.png`), fullPage: true });

    // A WORK-only filter: pick another master from the sheet.
    await openSheet(page);
    await expect(page.getByLabel("Responsable", { exact: true })).toBeEnabled();
    await page.getByLabel("Responsable", { exact: true }).selectOption(master);
    await applySheet(page);
    expect(retained(page.url()).get("assignee")).toBe(master);

    // Changing the type to all/SALE drops the WORK-only responsable.
    for (const kind of ["all", "SALE"]) {
      await openSheet(page);
      await page.getByLabel("Tipo de nota", { exact: true }).selectOption(kind);
      await expect(page.getByLabel("Responsable", { exact: true })).toBeDisabled();
      await settled(page);
      const dialog = page.getByRole("dialog");
      for (const input of await dialog.locator('input:not([type="checkbox"]), select').all()) {
        await input.scrollIntoViewIfNeeded();
        const box = getBox(await input.boundingBox(), "Operational dialog input");
        expect(box.height).toBeGreaterThanOrEqual(44);
        await assertInside(box, getBox(await dialog.boundingBox(), "Dialog"), "Input");
      }
      await applySheet(page);
      const query = retained(page.url());
      expect(query.get("kind")).toBe(kind);
      expect(query.has("assignee") ? query.get("assignee") : "all").toBe("all");
      await expect(page.getByText(/Responsable:/)).toHaveCount(0);
    }

    await page.getByRole("button", { name: "Pagadas", exact: true }).click();
    expect(retained(page.url()).get("payment")).toBe("paid");
    await page.getByRole("button", { name: "Periodo anterior" }).click();
    expect(retained(page.url()).get("anchor")).toBe("2026-07-27");
    await page.getByRole("button", { name: "Mes", exact: true }).click();
    expect(retained(page.url()).get("mode")).toBe("month");
    await openSheet(page);
    await page.getByLabel("Mes y año", { exact: true }).fill("2026-09");
    expect(retained(page.url()).get("anchor")).toBe("2026-09");
    await sheetClear(page);
    await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ mode: "month", anchor: "2026-09", payment: "all", kind: "all" });
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`Common Notes controls at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/notes-operational?mode=week&anchor=2026-08-05&payment=partial&kind=WORK&assignee=workshop&customerId=cust-1&overdue=overdue&page=3");
    await openSheet(page);
    const fields = { Folio: "N-99", Concepto: "frenos", Placas: "DEF-999", ECO: "ECO-99", Desde: "2026-08-02", Hasta: "2026-08-30" };
    for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: true }).fill(value);
    await page.getByRole("checkbox", { name: "Mostrar archivadas", exact: true }).check();
    await page.getByRole("checkbox", { name: "Mostrar canceladas", exact: true }).check();
    const dialog = page.getByRole("dialog");
    await settled(page);
    for (const input of await dialog.locator('input:not([type="checkbox"]), select').all()) {
      await input.scrollIntoViewIfNeeded();
      const box = getBox(await input.boundingBox(), "Common field");
      expect(box.height).toBeGreaterThanOrEqual(44);
      await assertInside(box, getBox(await dialog.boundingBox(), "Common dialog"), "Common field");
    }
    await applySheet(page);
    await expect(dialog).toBeHidden();
    const expected = { mode: "week", anchor: "2026-08-05", payment: "partial", kind: "WORK", assignee: "workshop", customerId: "cust-1", overdue: "overdue", number: "N-99", concept: "frenos", plate: "DEF-999", economicNumber: "ECO-99", dateFrom: "2026-08-02", dateTo: "2026-08-30", showArchived: "true", showCancelled: "true" };
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual(expected);
    await expect(page.getByRole("searchbox", { name: /Buscar por folio/ })).toHaveValue("N-99");
    for (const summary of ["Concepto: frenos", "Placas: DEF-999", "ECO: ECO-99", "Finalización/emisión desde: 2026-08-02", "Finalización/emisión hasta: 2026-08-30", "Mostrar archivadas", "Mostrar canceladas"]) {
      await expect(page.getByText(summary, { exact: true })).toBeVisible();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-page-common-${width}.png`), fullPage: true });

    await openSheet(page);
    for (const [label, value] of Object.entries(fields)) await expect(page.getByLabel(label, { exact: true })).toHaveValue(value);
    await page.getByLabel("Concepto", { exact: true }).fill("borrador retenido");
    await page.getByLabel("Desde", { exact: true }).fill("2026-09-01");
    const before = page.url();
    await applySheet(page);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("alert")).toContainText("La fecha de finalización/emisión desde no puede ser posterior a hasta");
    expect(page.url()).toBe(before);
    await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue("borrador retenido");
    await expect(page.getByLabel("Desde", { exact: true })).toHaveValue("2026-09-01");
    await expect(page.getByRole("checkbox", { name: "Mostrar archivadas", exact: true })).toBeChecked();
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-page-prior-error-${width}.png`), fullPage: true });
    await sheetClear(page);
    await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ mode: "week", anchor: "2026-08-05", payment: "all", kind: "all" });
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`Incoming Notes range at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const raw = {
      mode: "week", anchor: "2026-08-05", payment: "partial", kind: "SALE",
      assignee: "workshop", customerId: "cust-1", overdue: "overdue",
      number: "N-42", concept: "aceite", plate: "ABC-123", economicNumber: "ECO-42",
      dateFrom: "2026-09-01", dateTo: "2026-08-31",
      showArchived: "true", showCancelled: "true", page: "2",
    };
    for (const action of ["correct", "clear"]) {
      await page.goto(`/notes-operational?${new URLSearchParams(raw)}`);
      const before = page.url();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByRole("alert")).toContainText("La fecha de finalización/emisión desde no puede ser posterior a hasta");
      await expect(page.getByLabel("Desde", { exact: true })).toHaveValue(raw.dateFrom);
      await expect(page.getByLabel("Concepto", { exact: true })).toHaveValue(raw.concept);
      await expect(page.getByLabel("Semana", { exact: true })).toBeDisabled();
      await expect(page.getByLabel("Tipo de nota", { exact: true })).toBeDisabled();
      // The rejected range blocks the sheet from closing and every navigation outside it.
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await applySheet(page);
      expect(page.url()).toBe(before);
      if (action === "clear") {
        await sheetClear(page);
        await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ mode: "week", anchor: "2026-08-05", payment: "all", kind: "all" });
      } else {
        await page.getByLabel("Desde", { exact: true }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-page-error-${width}.png`), fullPage: true });
        await page.getByLabel("Desde", { exact: true }).fill("2026-08-01");
        await applySheet(page);
        const { page: ignoredPage, assignee: ignoredAssignee, ...expected } = raw;
        void ignoredPage; void ignoredAssignee;
        await expect.poll(() => Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ ...expected, dateFrom: "2026-08-01" });
      }
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.getByRole("alert")).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}
