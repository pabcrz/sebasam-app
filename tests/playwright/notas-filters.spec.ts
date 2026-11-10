import { expect, test, type Locator } from "@playwright/test";
import path from "node:path";

const viewports = [320, 390, 768, 1440];
const displayedRangeLabel = "28 de septiembre – 3 de octubre de 2026";

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
        viewportWidth: window.innerWidth,
      }));
      expect(pageOverflow.documentWidth).toBeLessThanOrEqual(width);
      expect(pageOverflow.bodyWidth).toBeLessThanOrEqual(width);

      const panelOverflow = await panel.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      expect(panelOverflow.scrollWidth).toBeLessThanOrEqual(panelOverflow.clientWidth);

      const header = panel.locator(":scope > div").nth(0);
      const headerElements = [
        page.getByRole("link", { name: "Semana anterior" }),
        page.getByText(displayedRangeLabel, { exact: true }),
        page.getByRole("link", { name: "Semana siguiente" }),
        page.getByText("Semana en curso", { exact: true }),
        page.getByRole("link", { name: "Hoy" }),
        page.getByRole("link", { name: "Vista mensual" }),
      ];

      for (const element of headerElements) {
        await expect(element).toBeVisible();
        await assertInside(
          getBox(await element.boundingBox(), "Header control"),
          getBox(await header.boundingBox(), "Header row"),
          "Header control",
        );
      }
      await assertNoOverlap(headerElements);

      const controlsRow = panel.locator(":scope > div").nth(1);
      const kindSelect = panel.getByRole("combobox", { name: "Tipo de nota" });
      const paymentFieldset = panel.locator("fieldset");
      const paymentToggle = paymentFieldset.locator(":scope > div");
      const filtersButton = page.getByRole("button", { name: "Abrir filtros de cartera" });
      const secondRowControls = [kindSelect, paymentToggle, filtersButton];
      await expect(page.getByText("2", { exact: true })).toBeVisible();

      for (const control of secondRowControls) {
        await expect(control).toBeVisible();
        await assertInside(
          getBox(await control.boundingBox(), "Second-row control"),
          getBox(await panel.boundingBox(), "Filter panel"),
          "Second-row control",
        );
      }
      await assertNoOverlap(secondRowControls);

      const paymentGeometry = await Promise.all([
        paymentToggle.boundingBox(),
        paymentFieldset.boundingBox(),
        controlsRow.boundingBox(),
      ]);
      const [toggleBox, fieldsetBox, rowBox] = paymentGeometry.map((box, index) =>
        getBox(box, `Payment layout box ${index + 1}`),
      );

      if (width < 768) {
        expect(Math.abs(toggleBox.width - fieldsetBox.width)).toBeLessThanOrEqual(1);
      } else {
        expect(toggleBox.width).toBeLessThan(rowBox.width - 16);
      }

      await page.screenshot({
        path: path.join(process.cwd(), "test-results", "screenshots", `notas-filters-${width}.png`),
        fullPage: true,
      });

      await filtersButton.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      const dateInput = page.getByLabel("Semana", { exact: true });
      await expect(dateInput).toBeVisible();
      await expect(dateInput).toBeEnabled();
      await expect(dateInput).toHaveAttribute("type", "date");
      await assertInside(
        getBox(await dateInput.boundingBox(), "Date input"),
        getBox(await dialog.boundingBox(), "Filters dialog"),
        "Date input",
      );
    });
  }
});


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
    for (const label of ["Semana anterior", "Semana siguiente", "Hoy", "Vista mensual"]) {
      retained(new URL((await page.getByRole("link", { name: label, exact: true }).getAttribute("href"))!, page.url()).href);
    }
    await expect(page.getByText("Concepto: aceite", { exact: true })).toBeVisible();
    await expect(page.getByText("Responsable: Taller", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-operational-${width}.png`), fullPage: true });
    await page.getByRole("button", { name: "Abrir filtros de cartera" }).click();
    await expect(page.getByLabel("Responsable", { exact: true })).toBeEnabled();
    await page.getByLabel("Responsable", { exact: true }).selectOption("a0b1c2d3-1234-4abc-8def-1234567890ab");
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    expect(retained(page.url()).get("assignee")).toBe("a0b1c2d3-1234-4abc-8def-1234567890ab");
    for (const kind of ["all", "SALE"]) {
      await page.getByLabel("Tipo de nota", { exact: true }).selectOption(kind);
      expect(retained(page.url()).has("assignee")).toBe(false);
      await expect(page.getByText(/Responsable:/)).toHaveCount(0);
      await page.getByRole("button", { name: "Abrir filtros de cartera" }).click();
      const dialog = page.getByRole("dialog");
      await expect(page.getByLabel("Responsable", { exact: true })).toBeDisabled();
      await expect(page.getByText("El responsable solo aplica a notas WORK; todas y SALE conservan las ventas.")).toBeVisible();
      for (const input of await dialog.locator("input, select").all()) {
        const box = getBox(await input.boundingBox(), "Operational dialog input");
        expect(box.height).toBeGreaterThanOrEqual(44);
        await assertInside(box, getBox(await dialog.boundingBox(), "Dialog"), "Input");
      }
      if (kind === "all") await page.screenshot({ path: path.join(process.cwd(), "test-results", "screenshots", `notas-operational-inactive-${width}.png`), fullPage: true });
      await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
      expect(retained(page.url()).get("kind")).toBe(kind);
    }
    await page.getByRole("button", { name: "Pagadas", exact: true }).click();
    expect(retained(page.url()).get("payment")).toBe("paid");
    await page.getByRole("link", { name: "Semana anterior", exact: true }).click();
    expect(retained(page.url()).get("anchor")).toBe("2026-07-29");
    await page.getByRole("link", { name: "Vista mensual", exact: true }).click();
    expect(retained(page.url()).get("mode")).toBe("month");
    await page.getByRole("button", { name: "Abrir filtros de cartera" }).click();
    await page.getByLabel("Mes y año", { exact: true }).fill("2026-09");
    expect(retained(page.url()).get("anchor")).toBe("2026-09");
    await page.getByRole("button", { name: "Limpiar filtros", exact: true }).click();
    expect(Object.fromEntries(new URL(page.url()).searchParams)).toEqual({ mode: "month", anchor: "2026-09", payment: "all", kind: "all" });
    expect(errors).toEqual([]);
  });
}
