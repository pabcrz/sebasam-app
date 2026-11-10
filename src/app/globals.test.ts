import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const require = createRequire(resolve(projectRoot, "package.json"));

async function resolveStylesheet(id: string, stylesheetBase: string) {
  if (id === "tailwindcss") {
    return require.resolve("tailwindcss/index.css", { paths: [stylesheetBase] });
  }

  // CSS-only packages such as tw-animate-css expose their entry through the
  // "style" export condition, which Node's require.resolve does not read.
  const packageDir = resolve(projectRoot, "node_modules", id);
  const manifest = JSON.parse(await readFile(resolve(packageDir, "package.json"), "utf8"));
  const styleEntry = manifest.exports?.["."]?.style;
  if (typeof styleEntry === "string") {
    return resolve(packageDir, styleEntry);
  }

  return require.resolve(id, { paths: [stylesheetBase] });
}

async function compileGlobals(candidates: string[]) {
  const globalsPath = resolve(projectRoot, "src/app/globals.css");
  const source = await readFile(globalsPath, "utf8");
  const compiler = await compile(source, {
    base: projectRoot,
    loadStylesheet: async (id, stylesheetBase) => {
      const path = await resolveStylesheet(id, stylesheetBase);

      return {
        path,
        base: dirname(path),
        content: await readFile(path, "utf8"),
      };
    },
  });

  return compiler.build(candidates);
}

describe("global Tailwind theme", () => {
  it("generates the standard named max-width utilities", async () => {
    const css = await compileGlobals(["max-w-sm", "max-w-md", "max-w-lg", "max-w-xl"]);

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

  it("maps shadcn/ui semantic colors to SEBASAM tokens", async () => {
    const css = await compileGlobals(["bg-popover", "text-muted-foreground", "border-input", "bg-destructive"]);

    expect(css).toMatch(/\.bg-popover\s*\{\s*background-color: var\(--color-surface\);/);
    expect(css).toMatch(/\.text-muted-foreground\s*\{\s*color: var\(--color-text-muted\);/);
    expect(css).toMatch(/\.border-input\s*\{\s*border-color: var\(--color-border-light\);/);
    expect(css).toMatch(/\.bg-destructive\s*\{\s*background-color: var\(--color-status-danger\);/);
  });

  it("loads tw-animate-css so data-state animations used by shadcn/ui render", async () => {
    const css = await compileGlobals(["animate-in", "fade-in-0"]);

    expect(css).toMatch(/\.animate-in\s*\{[^}]*animation:/);
  });
});
