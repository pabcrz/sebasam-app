import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const require = createRequire(resolve(projectRoot, "package.json"));

describe("global Tailwind theme", () => {
  it("generates the standard named max-width utilities", async () => {
    const globalsPath = resolve(projectRoot, "src/app/globals.css");
    const source = await readFile(globalsPath, "utf8");
    const compiler = await compile(source, {
      base: projectRoot,
      loadStylesheet: async (id, stylesheetBase) => {
        const path = require.resolve(id === "tailwindcss" ? "tailwindcss/index.css" : id, {
          paths: [stylesheetBase],
        });

        return {
          path,
          base: dirname(path),
          content: await readFile(path, "utf8"),
        };
      },
    });
    const css = compiler.build(["max-w-sm", "max-w-md", "max-w-lg", "max-w-xl"]);

    for (const [size, width] of [
      ["sm", "24rem"],
      ["md", "28rem"],
      ["lg", "32rem"],
      ["xl", "36rem"],
    ]) {
      expect(css).toContain(`--container-${size}: ${width};`);
      expect(css).toMatch(
        new RegExp(`\\.max-w-${size}\\s*\\{\\s*max-width: var\\(--container-${size}\\);\\s*\\}`),
      );
    }

    expect(css).toContain("--space-md: 16px;");
  });
});
