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
  describe("visual system tokens (#793)", () => {
    async function block(selector: ":root" | ".dark") {
      const source = await readFile(resolve(projectRoot, "src/app/globals.css"), "utf8");
      const start = source.indexOf(`\n${selector} {`);
      expect(start).toBeGreaterThan(-1);
      return source.slice(start, source.indexOf("\n}", start));
    }

    it("defines the light palette and action levels", async () => {
      const light = await block(":root");

      for (const declaration of [
        "--color-btn-primary: #0a3d8f;",
        "--color-btn-primary-hover: #08316f;",
        "--color-on-btn-primary: #ffffff;",
        "--color-tonal-bg: #e6f1fb;",
        "--color-tonal-fg: #004aad;",
        "--color-selected: #d6e6f8;",
        "--color-amount: #004aad;",
        "--color-link: #004aad;",
      ]) {
        expect(light).toContain(declaration);
      }
    });

    it("defines the ink-gray dark palette", async () => {
      const dark = await block(".dark");

      for (const declaration of [
        "--background: #0e131b;",
        "--foreground: #e7ecf3;",
        "--color-surface: #161d28;",
        "--color-surface-muted: #121923;",
        "--color-border-light: #263142;",
        "--color-text-main: #e7ecf3;",
        "--color-text-muted-fg: #b4bfcd;",
        "--color-text-muted: #8c99ab;",
        "--color-btn-primary: #eef2f7;",
        "--color-on-btn-primary: #0e131b;",
        "--color-tonal-bg: #24375a;",
        "--color-tonal-fg: #ffffff;",
        "--color-amount: #b9d2fa;",
        "--color-link: #9cc0f5;",
        "--color-status-success-fg: #6fd39a;",
        "--color-status-warning-fg: #f2c46b;",
        "--color-status-danger-fg: #f29b9b;",
        "--doc-head-bg: #1b2433;",
      ]) {
        expect(dark).toContain(declaration);
      }
    });

    it("uses radii that are multiples of four", async () => {
      const light = await block(":root");

      expect(light).toContain("--radius-sm: 8px;");
      expect(light).toContain("--radius-md: 12px;");
      expect(light).toContain("--radius-lg: 16px;");
      expect(light).toContain("--radius-sheet: 24px;");
    });

    it("separates surfaces with shadow only and adds the control scale", async () => {
      const light = await block(":root");

      expect(light).toContain("--shadow-card: 0 1px 2px rgba(0, 16, 36, 0.05), 0 4px 14px rgba(0, 16, 36, 0.07);");
      expect(light).toContain("--shadow-card-hover:");
      expect(light).toContain("--control-lg: 40px;");
      expect(light).toContain("--control-md: 36px;");
      expect(light).toContain("--control-sm: 32px;");
    });

    it("drops DM Mono and keeps tabular figures on monospace utilities", async () => {
      const source = await readFile(resolve(projectRoot, "src/app/globals.css"), "utf8");
      const css = await compileGlobals(["font-mono"]);

      expect(source).not.toContain("dm-mono");
      expect(css).toMatch(/\.font-mono\s*\{[^}]*font-family: var\(--font-inter\)/);
      expect(css).toMatch(/\.font-mono\s*\{[^}]*font-variant-numeric: tabular-nums/);
    });

    it("colors native scrollbars from theme tokens in light and dark", async () => {
      const light = await block(":root");
      const dark = await block(".dark");
      const source = await readFile(resolve(projectRoot, "src/app/globals.css"), "utf8");

      expect(light).toContain("--color-scrollbar-thumb: #b9c9da;");
      expect(light).toContain("--color-scrollbar-track: transparent;");
      expect(dark).toContain("--color-scrollbar-thumb: #34425a;");
      expect(dark).toContain("--color-scrollbar-track: transparent;");
      expect(source).toMatch(
        /\n\*\s*\{\s*scrollbar-color: var\(--color-scrollbar-thumb\) var\(--color-scrollbar-track\);\s*\}/,
      );
    });

    it("sets color-scheme so native scrollbars follow the theme", async () => {
      const light = await block(":root");
      const dark = await block(".dark");

      expect(light).toContain("color-scheme: light;");
      expect(dark).toContain("color-scheme: dark;");
    });

    it("keeps .no-scrollbar hiding the scrollbar over the global scrollbar-color", async () => {
      const source = await readFile(resolve(projectRoot, "src/app/globals.css"), "utf8");

      expect(source).toMatch(/\.no-scrollbar\s*\{\s*scrollbar-width: none;\s*scrollbar-color: transparent transparent;\s*\}/);
    });
  });
});
