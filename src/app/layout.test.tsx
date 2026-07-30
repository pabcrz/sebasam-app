import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "geist-sans" }),
  Geist_Mono: () => ({ variable: "geist-mono" }),
}));

vi.mock("next/script", () => ({
  default: ({ id, strategy, children }: { id: string; strategy: string; children: ReactNode }) => (
    <script id={id} data-strategy={strategy}>
      {children}
    </script>
  ),
}));

vi.mock("./pwa-register", () => ({ PwaRegister: () => null }));
vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/ui/toaster", () => ({ ToasterProvider: () => null }));

function getThemeScript() {
  const markup = renderToStaticMarkup(
    <RootLayout>
      <main />
    </RootLayout>,
  );
  const document = new DOMParser().parseFromString(markup, "text/html");
  const script = document.querySelector("script#sebasam-theme");

  if (!(script instanceof HTMLScriptElement)) {
    throw new Error("Theme script was not rendered");
  }

  return script;
}

function runThemeScript() {
  const script = getThemeScript();
  Function(script.textContent ?? "")();
  return script;
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.className = "";
});

describe("RootLayout theme script", () => {
  it("uses the critical Next.js inline script configuration", () => {
    const script = getThemeScript();

    expect(script.getAttribute("id")).toBe("sebasam-theme");
    expect(script.getAttribute("data-strategy")).toBe("beforeInteractive");
  });

  it("applies a stored dark theme before hydration", () => {
    localStorage.setItem("sebasam-theme", "dark");

    runThemeScript();

    expect(document.documentElement).toHaveClass("dark");
  });

  it("removes dark mode when the stored theme is not dark", () => {
    document.documentElement.classList.add("dark");
    localStorage.setItem("sebasam-theme", "light");

    runThemeScript();

    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("keeps the light fallback when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });

    expect(() => runThemeScript()).not.toThrow();
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
