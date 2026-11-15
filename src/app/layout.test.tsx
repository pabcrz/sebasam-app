import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "./layout";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "font-inter" }),
}));

vi.mock("next/script", () => ({
  default: () => {
    throw new Error("RootLayout must not use next/script for theme initialization");
  },
}));

vi.mock("./pwa-register", () => ({ PwaRegister: () => null }));
vi.mock("@/components/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("@/components/ui/toaster", () => ({ ToasterProvider: () => null }));

describe("RootLayout theme script", () => {
  it("renders the native theme script in the document head", () => {
    vi.stubGlobal("window", undefined);
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main />
      </RootLayout>,
    );
    vi.unstubAllGlobals();
    const renderedDocument = new DOMParser().parseFromString(markup, "text/html");

    expect(renderedDocument.head.querySelector('script[type="text/javascript"]')).not.toBeNull();
  });
});
