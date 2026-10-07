import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/playwright",
  outputDir: "./test-results/playwright-output",
  fullyParallel: true,
  reporter: "list",
  use: {
    browserName: "chromium",
    headless: true,
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm exec vite --config tests/playwright/vite.config.ts --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
