import { render, screen } from "@testing-library/react";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Chip } from "./chip";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Switch } from "./switch";
import { Textarea } from "./textarea";

// The 3px focus ring is drawn outside the control. Inside scroll containers
// (overflow-x/y auto without padding) that outer band is clipped, so every
// focus ring on a shared control is inset (#807 E9).
const insetRing = "focus-visible:ring-inset";
const clippedShadowFocus = "shadow-[var(--shadow-focus)]";

describe("focus rings inside scroll containers (#807 E9)", () => {
  it("insets the focus ring on shared text controls and drops the outer glow", () => {
    render(
      <>
        <Input aria-label="Título" />
        <Textarea aria-label="Notas" />
      </>,
    );

    for (const field of [screen.getByLabelText("Título"), screen.getByLabelText("Notas")]) {
      expect(field.className).toContain(insetRing);
      expect(field.className).not.toContain(clippedShadowFocus);
    }
  });

  it("insets the focus ring on shared checkbox, switch and chip", () => {
    render(
      <>
        <Checkbox aria-label="Incluir IVA" />
        <Switch aria-label="Cotización administrativa" />
        <Chip pressed={false}>Frenos</Chip>
      </>,
    );

    for (const control of [
      screen.getByRole("checkbox", { name: "Incluir IVA" }),
      screen.getByRole("switch", { name: "Cotización administrativa" }),
      screen.getByRole("button", { name: "Frenos" }),
    ]) {
      expect(control.className).toContain(insetRing);
    }
  });

  it("keeps every focus ring in shared UI and quote/work-order components inset", () => {
    const dirs = [
      resolve(process.cwd(), "src/components/ui"),
      resolve(process.cwd(), "src/features/quotes/components"),
      resolve(process.cwd(), "src/features/work-orders/components"),
    ];
    const offenders: string[] = [];

    for (const dir of dirs) {
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".tsx") || file.endsWith(".test.tsx")) continue;

        readFileSync(resolve(dir, file), "utf8")
          .split("\n")
          .forEach((line, index) => {
            if (!/focus-(?:visible|within):ring-(?:\[3px\]|2)(?![0-9])/.test(line)) return;
            if (!line.includes(insetRing) && !line.includes("focus-within:ring-inset")) {
              offenders.push(`${file}:${index + 1}`);
            }
            if (/focus-(?:visible|within):ring-offset/.test(line)) {
              offenders.push(`${file}:${index + 1} (ring-offset sits outside the control)`);
            }
          });
      }
    }

    expect(offenders).toEqual([]);
  });
});
