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
    expect(iframe?.style.top).toBe("0px");
    expect(iframe?.style.left).toBe("0px");
    expect(iframe?.style.width).toBe("1px");
    expect(iframe?.style.height).toBe("1px");
    expect(iframe?.style.clip).toBe("rect(0px, 0px, 0px, 0px)");
    expect(iframe?.style.overflow).toBe("hidden");
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
    const job1 = printDocumentUrl("/admin/quotes/quote-1/print");
    job1.catch(() => {});
    const firstIframe = document.querySelector("iframe");
    expect(firstIframe).toBeInTheDocument();

    const job2 = printDocumentUrl("/admin/quotes/quote-2/print");
    job2.catch(() => {});
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

  it("rejects and does not print when document readiness times out", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/quote-stream/print");
    const iframe = document.querySelector("iframe");
    const focusSpy = vi.fn();
    const printSpy = vi.fn();
    Object.defineProperty(iframe, "contentWindow", {
      value: {
        focus: focusSpy,
        print: printSpy,
        addEventListener: vi.fn(),
        document: {
          querySelector: vi.fn(() => null),
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    iframe?.onload?.(new Event("load"));
    const rejection = expect(printPromise).rejects.toThrow("Tiempo de espera agotado");
    await vi.advanceTimersByTimeAsync(10000);

    await rejection;
    expect(focusSpy).not.toHaveBeenCalled();
    expect(printSpy).not.toHaveBeenCalled();
    expect(iframe).not.toBeInTheDocument();
  });

  it("waits for two child-window paint frames before printing", async () => {
    const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");
    const iframe = document.querySelector("iframe");
    const printSpy = vi.fn();
    const paintFrames: FrameRequestCallback[] = [];
    Object.defineProperty(iframe, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: printSpy,
        addEventListener: vi.fn(),
        requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
          paintFrames.push(callback);
          return paintFrames.length;
        }),
        document: {
          querySelector: vi.fn((sel: string) => (sel === "[data-document-ready='true']" ? { children: [{}] } : null)),
          fonts: { ready: Promise.resolve() },
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    iframe?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(0);
    expect(paintFrames).toHaveLength(1);
    expect(printSpy).not.toHaveBeenCalled();

    paintFrames[0](0);
    expect(paintFrames).toHaveLength(2);
    expect(printSpy).not.toHaveBeenCalled();

    paintFrames[1](16);
    await vi.advanceTimersByTimeAsync(200);

    expect(printSpy).toHaveBeenCalledOnce();
    await printPromise;
  });

  it("handles consecutive navigation flow A -> B -> A without orphan timers killing the active iframe", async () => {
    // 1. Start Print A
    const printPromiseA = printDocumentUrl("/admin/quotes/quote-A/print");
    const iframeA = document.querySelector("iframe");
    expect(iframeA).toBeInTheDocument();
    expect(iframeA?.src).toContain("quote-A");

    const printSpyA = vi.fn();
    Object.defineProperty(iframeA, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: printSpyA,
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

    iframeA?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);
    expect(printSpyA).toHaveBeenCalled();
    await printPromiseA;

    // Notice that after print A, activeRemovalTimer (1500ms) would normally be scheduled
    // 2. User navigates and starts Print B before 1500ms elapses
    await vi.advanceTimersByTimeAsync(300); // 300ms < 1500ms

    const printPromiseB = printDocumentUrl("/admin/work-orders/order-B/print");
    const iframeB = document.querySelector("iframe");
    expect(iframeB).toBeInTheDocument();
    expect(iframeB?.src).toContain("order-B");
    expect(iframeA?.parentNode).toBeNull(); // Old iframe A was removed immediately

    const printSpyB = vi.fn();
    Object.defineProperty(iframeB, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: printSpyB,
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

    // Advance 1300ms (crossing the initial 1500ms mark of A)
    await vi.advanceTimersByTimeAsync(1300);

    // Iframe B MUST still be in the document and not killed by A's old removal timer
    expect(iframeB).toBeInTheDocument();

    iframeB?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);
    expect(printSpyB).toHaveBeenCalled();
    await printPromiseB;

    // 3. User navigates back and starts Print A again
    await vi.advanceTimersByTimeAsync(200);
    const printPromiseA2 = printDocumentUrl("/admin/quotes/quote-A/print");
    const iframeA2 = document.querySelector("iframe");
    expect(iframeA2).toBeInTheDocument();
    expect(iframeA2?.src).toContain("quote-A");
    expect(iframeB?.parentNode).toBeNull(); // Old iframe B was cleanly purged

    const printSpyA2 = vi.fn();
    Object.defineProperty(iframeA2, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: printSpyA2,
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

    iframeA2?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);
    expect(printSpyA2).toHaveBeenCalled();
    await printPromiseA2;
  });

  it("prevents late onload or paint callbacks of superseded jobs from invoking print()", async () => {
    // Start job A (slow load)
    const jobA = printDocumentUrl("/admin/quotes/quote-A/print");
    jobA.catch(() => {});
    const iframeA = document.querySelector("iframe");
    const printSpyA = vi.fn();
    Object.defineProperty(iframeA, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: printSpyA,
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

    // Start job B before job A completes load
    const printPromiseB = printDocumentUrl("/admin/notas/nota-B/print");
    const iframeB = document.querySelector("iframe");
    const printSpyB = vi.fn();
    Object.defineProperty(iframeB, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: printSpyB,
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

    // Now trigger late onload on superseded iframe A
    iframeA?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(300);

    // printSpyA must NEVER be called because session A was invalidated
    expect(printSpyA).not.toHaveBeenCalled();

    // Now trigger onload on active iframe B
    iframeB?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(300);
    expect(printSpyB).toHaveBeenCalled();
    await printPromiseB;
  });

  it("unregisters window afterprint event listener on cancel or new job", async () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");
    const iframe = document.querySelector("iframe");
    Object.defineProperty(iframe, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: vi.fn(),
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

    iframe?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);
    await printPromise;

    // Starting a new print job should invoke window.removeEventListener for afterprint
    const job2 = printDocumentUrl("/admin/quotes/quote-2/print");
    job2.catch(() => {});

    expect(removeEventListenerSpy).toHaveBeenCalledWith("afterprint", expect.any(Function));
  });

  it("synchronizes document.title with iframe title and restores it on afterprint", async () => {
    document.title = "Cotizaciones | SEBASAM";

    const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");
    const iframe = document.querySelector("iframe");

    const afterPrintCalls: Array<() => void> = [];

    Object.defineProperty(iframe, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: vi.fn(() => {
          // Verify title is synchronized at the moment print() is invoked
          expect(document.title).toBe("TransportesHernandez-Eco14-C-090926-01");
        }),
        addEventListener: vi.fn((event: string, cb: () => void) => {
          if (event === "afterprint") afterPrintCalls.push(cb);
        }),
        removeEventListener: vi.fn(),
        document: {
          title: "TransportesHernandez-Eco14-C-090926-01",
          querySelector: vi.fn((sel: string) => (sel === "[data-document-ready='true']" ? { children: [{}] } : null)),
          fonts: { ready: Promise.resolve() },
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    iframe?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);
    await printPromise;

    // Trigger afterprint to simulate print dialog close
    afterPrintCalls.forEach((cb) => cb());
    expect(document.title).toBe("Cotizaciones | SEBASAM");
  });

  it("isolates cancellation: job A rejects and does not overwrite or restore job B title", async () => {
    document.title = "Cotizaciones | SEBASAM";

    const printPromiseA = printDocumentUrl("/admin/quotes/quote-A/print");
    const iframeA = document.querySelector("iframe");

    const afterPrintCallsA: Array<() => void> = [];
    Object.defineProperty(iframeA, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: vi.fn(),
        addEventListener: vi.fn((event: string, cb: () => void) => {
          if (event === "afterprint") afterPrintCallsA.push(cb);
        }),
        removeEventListener: vi.fn(),
        document: {
          title: "ClienteA-C-001",
          querySelector: vi.fn((sel: string) => (sel === "[data-document-ready='true']" ? { children: [{}] } : null)),
          fonts: { ready: Promise.resolve() },
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    // Before job A finishes loading or printing, job B starts
    const printPromiseB = printDocumentUrl("/admin/notas/nota-B/print");

    // Job A must reject explicitly
    await expect(printPromiseA).rejects.toThrow("La impresión fue cancelada por una nueva solicitud.");

    const iframeB = document.querySelector("iframe");
    const afterPrintCallsB: Array<() => void> = [];

    Object.defineProperty(iframeB, "contentWindow", {
      value: {
        focus: vi.fn(),
        print: vi.fn(() => {
          expect(document.title).toBe("ClienteB-N-002");
        }),
        addEventListener: vi.fn((event: string, cb: () => void) => {
          if (event === "afterprint") afterPrintCallsB.push(cb);
        }),
        removeEventListener: vi.fn(),
        document: {
          title: "ClienteB-N-002",
          querySelector: vi.fn((sel: string) => (sel === "[data-document-ready='true']" ? { children: [{}] } : null)),
          fonts: { ready: Promise.resolve() },
          body: { offsetHeight: 100 },
        },
      },
      writable: true,
    });

    // Simulate job B loading and printing
    iframeB?.onload?.(new Event("load"));
    await vi.advanceTimersByTimeAsync(200);
    await printPromiseB;

    expect(document.title).toBe("ClienteB-N-002");

    // If job A's callbacks trigger belatedly, they MUST NOT overwrite job B's title
    afterPrintCallsA.forEach((cb) => cb());
    expect(document.title).toBe("ClienteB-N-002");

    // Only job B's completion restores to original
    afterPrintCallsB.forEach((cb) => cb());
    expect(document.title).toBe("Cotizaciones | SEBASAM");
  });

  describe("cleanup scenarios and readiness edge cases", () => {
    it("preserves iframe in DOM on afterprint and does not destroy it with 1.5s timer", async () => {
      document.title = "Cotizaciones | SEBASAM";
      const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();

      const afterPrintCalls: Array<() => void> = [];
      Object.defineProperty(iframe, "contentWindow", {
        value: {
          focus: vi.fn(),
          print: vi.fn(),
          addEventListener: vi.fn((event: string, cb: () => void) => {
            if (event === "afterprint") afterPrintCalls.push(cb);
          }),
          removeEventListener: vi.fn(),
          document: {
            title: "Cotización 001",
            querySelector: vi.fn((sel: string) => (sel === "[data-document-ready='true']" ? { children: [{}] } : null)),
            fonts: { ready: Promise.resolve() },
            body: { offsetHeight: 100 },
          },
        },
        writable: true,
      });

      iframe?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(200);
      await printPromise;

      // Trigger afterprint
      afterPrintCalls.forEach((cb) => cb());

      // Advance 1500ms (the old destructive timer)
      await vi.advanceTimersByTimeAsync(1500);

      // Iframe MUST still be in the document (not destroyed by old 1.5s timer)
      expect(iframe).toBeInTheDocument();
      expect(document.title).toBe("Cotizaciones | SEBASAM");
    });

    it("immediately removes iframe from DOM on load error", async () => {
      const printPromise = printDocumentUrl("/admin/quotes/error/print");
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();

      iframe?.onerror?.(new Event("error"));

      await expect(printPromise).rejects.toThrow();
      // Iframe MUST be removed immediately on error
      expect(iframe).not.toBeInTheDocument();
    });

    it("immediately removes iframe from DOM on load timeout", async () => {
      const printPromise = printDocumentUrl("/admin/quotes/timeout/print", { timeoutMs: 5000 });
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();

      vi.advanceTimersByTime(5001);

      await expect(printPromise).rejects.toThrow("Tiempo de espera agotado al cargar el documento para imprimir.");
      // Iframe MUST be removed immediately on load timeout
      expect(iframe).not.toBeInTheDocument();
    });

    it("removes dormant iframe when 120s safety fallback expires", async () => {
      const printPromise = printDocumentUrl("/admin/quotes/quote-1/print");
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();

      Object.defineProperty(iframe, "contentWindow", {
        value: {
          focus: vi.fn(),
          print: vi.fn(),
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

      iframe?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(200);
      await printPromise;

      expect(iframe).toBeInTheDocument();

      // Advance 120 seconds
      await vi.advanceTimersByTimeAsync(120000);

      // Now the fallback safety cleanup must have purged the dormant iframe
      expect(iframe).not.toBeInTheDocument();
    });

    it("immediately purges previous iframe and rejects pending promise when replaced by a new job", async () => {
      const job1 = printDocumentUrl("/admin/quotes/quote-1/print");
      const iframe1 = document.querySelector("iframe");
      expect(iframe1).toBeInTheDocument();

      // Launch job 2 before job 1 finishes
      const job2 = printDocumentUrl("/admin/quotes/quote-2/print");
      const iframe2 = document.querySelectorAll("iframe")[0];

      await expect(job1).rejects.toThrow("La impresión fue cancelada por una nueva solicitud.");
      expect(iframe1?.parentNode).toBeNull();
      expect(iframe2).toBeInTheDocument();
      expect(iframe2?.src).toContain("quote-2");
      job2.catch(() => {});
    });

    it("prints empty quote with 'Sin conceptos' without blocking or timing out", async () => {
      const printPromise = printDocumentUrl("/admin/quotes/empty-quote/print");
      const iframe = document.querySelector("iframe");
      const focusSpy = vi.fn();
      const printSpy = vi.fn();

      // Mock an empty quote: data-document-ready is true with children ("Sin conceptos"), but NO table rows
      Object.defineProperty(iframe, "contentWindow", {
        value: {
          focus: focusSpy,
          print: printSpy,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          document: {
            querySelector: vi.fn((sel: string) => {
              if (sel === "[aria-label='Cargando contenido...']") return null;
              if (sel === "[data-document-ready='true']") return { children: [{ textContent: "Sin conceptos" }] };
              if (sel === "table tbody tr") return null;
              return null;
            }),
            fonts: { ready: Promise.resolve() },
            body: { offsetHeight: 50 },
          },
        },
        writable: true,
      });

      iframe?.onload?.(new Event("load"));
      await vi.advanceTimersByTimeAsync(250);

      expect(focusSpy).toHaveBeenCalled();
      expect(printSpy).toHaveBeenCalled();
      await printPromise;
    });
  });
});
