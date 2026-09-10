import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildPrintUrl, printDocumentUrl } from "./print-document";

describe("buildPrintUrl", () => {
  it("appends timestamp query parameter to prevent stale stream caches", () => {
    const url = buildPrintUrl("/admin/quotes/quote-1/print?returnTo=/admin/quotes");
    expect(url).toContain("/admin/quotes/quote-1/print");
    expect(url).toContain("returnTo=%2Fadmin%2Fquotes");
    expect(url).toMatch(/[?&]_t=\d+/);
  });
});

describe("printDocumentUrl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.querySelectorAll("iframe").forEach((el) => el.remove());
  });

  it("creates an in-viewport hidden iframe with correct attributes and sets the src", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");

    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe?.style.position).toBe("fixed");
    expect(iframe?.style.right).toBe("0px");
    expect(iframe?.style.bottom).toBe("0px");
    expect(iframe?.style.zIndex).toBe("-9999");
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
        document: {
          querySelector: vi.fn((sel: string) => (sel === "[data-document-ready='true']" ? { children: [{}] } : null)),
          fonts: { ready: Promise.resolve() },
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    // Trigger iframe onload
    iframe?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);

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

  it("waits for loading skeleton to disappear and data-document-ready with children to appear before printing", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/quote-stream/print");
    const iframe = document.querySelector("iframe");

    let isReady = false;
    const focusSpy = vi.fn();
    const printSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: {
        focus: focusSpy,
        print: printSpy,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        document: {
          querySelector: vi.fn((sel: string) => {
            if (sel.includes("Cargando contenido")) return !isReady ? {} : null;
            if (sel.includes("data-document-ready")) return isReady ? { children: [{}] } : null;
            return null;
          }),
          fonts: { ready: Promise.resolve() },
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    // Trigger iframe onload while still displaying the loading skeleton
    iframe?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(30);

    // Print must NOT have been called yet
    expect(printSpy).not.toHaveBeenCalled();

    // Now transition to ready
    isReady = true;
    await vi.advanceTimersByTimeAsync(200);

    // Print MUST have been called now
    expect(printSpy).toHaveBeenCalled();
    await printPromise;
  });
});
