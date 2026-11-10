import { expect, test } from "@playwright/test";

// Radix Select locks body scroll while open and removes the page scrollbar.
// In-flow content is compensated by react-remove-scroll-bar; fixed elements
// anchored to the right edge must add --removed-body-scroll-bar-size so they
// do not jump. These classes mirror the admin bottom navigation and the
// mobile floating action buttons.
const FIXED_ELEMENTS = {
  bottomNav: "fixed bottom-0 left-0 right-[var(--removed-body-scroll-bar-size,0px)] z-40",
  floatingAction: "fixed right-[calc(1rem+var(--removed-body-scroll-bar-size,0px))] z-40",
  uncompensated: "fixed bottom-0 left-0 right-0 z-40",
};

// Playwright hides scrollbars by default; show them to measure the gutter.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

for (const width of [390, 1440]) {
  test(`opening a select keeps fixed elements in place at ${width}px`, async ({ page }) => {
    // A short viewport forces a vertical page scrollbar.
    await page.setViewportSize({ width, height: 420 });
    await page.goto("/quote-filters");
    await page.getByRole("button", { name: "Mostrar filtros" }).click();
    await page.evaluate((elements) => {
      for (const [id, className] of Object.entries(elements)) {
        const element = document.createElement("div");
        element.id = id;
        element.className = className;
        element.style.height = "8px";
        element.style.width = id === "floatingAction" ? "40px" : "";
        document.body.appendChild(element);
      }
    }, FIXED_ELEMENTS);

    const scrollbarWidth = await page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
    expect(scrollbarWidth).toBeGreaterThan(0);

    const trigger = page.getByLabel("Estatus", { exact: true });
    const measure = () => page.evaluate(() => {
      const right = (selector: string) => document.querySelector(selector)!.getBoundingClientRect().right;
      return {
        trigger: right('[role="combobox"]'),
        bottomNav: right("#bottomNav"),
        floatingAction: right("#floatingAction"),
        uncompensated: right("#uncompensated"),
      };
    });

    const before = await measure();
    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    const open = await measure();

    expect({ trigger: open.trigger, bottomNav: open.bottomNav, floatingAction: open.floatingAction })
      .toEqual({ trigger: before.trigger, bottomNav: before.bottomNav, floatingAction: before.floatingAction });
    // Guard: proves the scroll lock really removed the scrollbar in this run.
    expect(open.uncompensated).toBe(before.uncompensated + scrollbarWidth);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    expect(await measure()).toEqual(before);
  });
}
