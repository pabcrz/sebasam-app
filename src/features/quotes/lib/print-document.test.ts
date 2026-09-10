import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { printDocumentUrl } from "./print-document";

describe("printDocumentUrl", () => {
  let originalAppendChild: typeof document.body.appendChild;
  let originalRemoveChild: typeof document.body.removeChild;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.querySelectorAll("iframe").forEach((el) => el.remove());
  });

  it("creates an offscreen iframe with correct attributes and sets the src", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");

    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe?.style.position).toBe("fixed");
    expect(iframe?.style.top).toBe("-10000px");
    expect(iframe?.getAttribute("aria-hidden")).toBe("true");
    expect(iframe?.getAttribute("tabindex")).toBe("-1");
    expect(iframe?.src).toContain("/admin/quotes/quote-1/print");

    // Mock contentWindow focus and print
    const focusSpy = vi.fn();
    const printSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: {
        focus: focusSpy,
        print: printSpy,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        document: { fonts: { ready: Promise.resolve() } },
      },
      writable: true,
    });

    // Trigger iframe onload
    iframe?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(0);

    expect(focusSpy).toHaveBeenCalled();
    expect(printSpy).toHaveBeenCalled();

    await printPromise;
  });

  it("removes older iframe if a new print job is initiated", () => {
    printDocumentUrl("/admin/quotes/quote-1/print");
    const firstIframe = document.querySelector("iframe");
    expect(firstIframe).toBeInTheDocument();

    printDocumentUrl("/admin/quotes/quote-2/print");
    expect(firstIframe?.parentNode).toBeNull();
    const secondIframe = document.querySelector("iframe");
    expect(secondIframe).toBeInTheDocument();
    expect(secondIframe?.src).toContain("/admin/quotes/quote-2/print");
  });

  it("rejects on iframe error and cleans up", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/invalid/print");
    const iframe = document.querySelector("iframe");

    iframe?.onerror?.(new Event("error"));

    await expect(printPromise).rejects.toThrow();
  });

  it("rejects when timeout is reached", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/slow/print", { timeoutMs: 1000 });

    vi.advanceTimersByTime(1001);

    await expect(printPromise).rejects.toThrow("Tiempo de espera agotado");
  });
});
