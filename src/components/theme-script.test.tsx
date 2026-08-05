import { act } from "react";
import { render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeScript } from "./theme-script";

function renderServerMarkup() {
  vi.stubGlobal("window", undefined);
  const markup = renderToStaticMarkup(<ThemeScript />);
  vi.unstubAllGlobals();

  return markup;
}

function renderServerScript() {
  const markup = renderServerMarkup();
  const renderedDocument = new DOMParser().parseFromString(markup, "text/html");
  const script = renderedDocument.querySelector("script");

  if (!(script instanceof HTMLScriptElement)) {
    throw new Error("Theme script was not rendered");
  }

  return script;
}

function runServerScript() {
  const script = renderServerScript();
  Function(script.textContent ?? "")();
  return script;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  document.documentElement.className = "";
});

describe("ThemeScript", () => {
  it("renders an executable server script with the theme payload", () => {
    const script = renderServerScript();

    expect(script.getAttribute("type")).toBe("text/javascript");
    expect(script.textContent).toContain("localStorage.getItem('sebasam-theme')");
  });

  it("renders an inert script on the client", () => {
    const { container } = render(<ThemeScript />);

    expect(container.querySelector("script")).toHaveAttribute("type", "text/plain");
  });

  it("hydrates the intentional type mismatch without a warning", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderServerMarkup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const root = hydrateRoot(container, <ThemeScript />);
    await act(async () => undefined);

    expect(consoleError).not.toHaveBeenCalled();
    expect(container.querySelector("script")).toHaveAttribute("type", "text/javascript");

    await act(async () => root.unmount());
  });

  it("applies a stored dark theme before hydration", () => {
    localStorage.setItem("sebasam-theme", "dark");

    runServerScript();

    expect(document.documentElement).toHaveClass("dark");
  });

  it("removes dark mode when the stored theme is not dark", () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("sebasam-theme", "light");

    runServerScript();

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("keeps the light fallback when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    expect(() => runServerScript()).not.toThrow();
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
