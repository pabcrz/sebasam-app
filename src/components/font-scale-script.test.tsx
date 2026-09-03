import { act } from "react";
import { render } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FontScaleScript } from "./font-scale-script";

function renderServerMarkup() {
  vi.stubGlobal("window", undefined);
  const markup = renderToStaticMarkup(<FontScaleScript />);
  vi.unstubAllGlobals();

  return markup;
}

function renderServerScript() {
  const markup = renderServerMarkup();
  const renderedDocument = new DOMParser().parseFromString(markup, "text/html");
  const script = renderedDocument.querySelector("script");

  if (!(script instanceof HTMLScriptElement)) {
    throw new Error("Font scale script was not rendered");
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
  document.documentElement.removeAttribute("data-font-scale");
});

describe("FontScaleScript", () => {
  it("renders an executable server script with the font-scale payload", () => {
    const script = renderServerScript();

    expect(script.getAttribute("type")).toBe("text/javascript");
    expect(script.textContent).toContain("localStorage.getItem('sebasam-font-scale')");
  });

  it("renders an inert script on the client", () => {
    const { container } = render(<FontScaleScript />);

    expect(container.querySelector("script")).toHaveAttribute("type", "text/plain");
  });

  it("hydrates the intentional type mismatch without a warning", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderServerMarkup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const root = hydrateRoot(container, <FontScaleScript />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(consoleError).not.toHaveBeenCalled();
    root.unmount();
  });

  it("applies data-font-scale=large when stored scale is large", () => {
    localStorage.setItem("sebasam-font-scale", "large");

    runServerScript();

    expect(document.documentElement.getAttribute("data-font-scale")).toBe("large");
  });

  it("removes data-font-scale when stored scale is normal or empty", () => {
    document.documentElement.setAttribute("data-font-scale", "large");
    localStorage.setItem("sebasam-font-scale", "normal");

    runServerScript();

    expect(document.documentElement.getAttribute("data-font-scale")).toBeNull();
  });

  it("keeps default scale when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    expect(() => runServerScript()).not.toThrow();
    expect(document.documentElement.getAttribute("data-font-scale")).toBeNull();
  });
});
