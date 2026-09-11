/**
 * Triggers in-page document printing using an isolated hidden iframe.
 * Avoids full-page navigation while preserving exact document styles and @page layout.
 */

let activePrintIframe: HTMLIFrameElement | null = null;
let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null;
let activeRemovalTimer: ReturnType<typeof setTimeout> | null = null;
let activeWindowCleanup: (() => void) | null = null;
let activeSessionId = 0;

export interface PrintDocumentOptions {
  timeoutMs?: number;
}

export function buildPrintUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, "https://sebasam.invalid");
    parsed.searchParams.set("_t", Date.now().toString());
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    const separator = rawUrl.includes("?") ? "&" : "?";
    return `${rawUrl}${separator}_t=${Date.now()}`;
  }
}

function isDocumentReady(doc: Document): boolean {
  // 1. If admin loading skeleton is present, it's NOT ready
  if (doc.querySelector("[aria-label='Cargando contenido...']")) {
    return false;
  }

  // 2. Check for explicit ready marker and ensure it has content
  const readyEl = doc.querySelector("[data-document-ready='true']");
  if (readyEl) {
    return readyEl.children.length > 0;
  }

  // 3. Check for specific printable containers that only exist in fully rendered documents
  const printableQuote = doc.querySelector("#printable-quote");
  if (printableQuote && printableQuote.children.length > 0) {
    return true;
  }

  // 4. Fallback for tabular document content
  const table = doc.querySelector("table");
  if (table && table.rows.length > 0) {
    return true;
  }

  return false;
}

async function waitForDocumentReady(
  cw: Window,
  timeoutMs: number,
  isCancelled: () => boolean,
): Promise<boolean> {
  const doc = cw.document;
  if (!doc || typeof doc.querySelector !== "function") return false;

  if (isCancelled()) return false;
  if (isDocumentReady(doc)) {
    return true;
  }

  return new Promise<boolean>((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | number | null = null;
    let interval: ReturnType<typeof setInterval> | number | null = null;
    let observer: MutationObserver | null = null;

    const finish = (isReady: boolean) => {
      if (resolved) return;
      resolved = true;
      if (timer) window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
      if (observer) observer.disconnect();
      resolve(isReady);
    };

    // Use parent window's setTimeout so it is not throttled in background/invisible frames
    timer = window.setTimeout(() => finish(false), timeoutMs);

    try {
      const MutationObserverClass =
        (cw as unknown as { MutationObserver?: typeof MutationObserver }).MutationObserver || window.MutationObserver;
      const target = doc.body || doc.documentElement;
      if (MutationObserverClass && target) {
        const obs = new MutationObserverClass(() => {
          if (isCancelled()) {
            finish(false);
            return;
          }
          if (isDocumentReady(doc)) {
            finish(true);
          }
        });
        obs.observe(target, {
          childList: true,
          subtree: true,
          attributes: true,
        });
        observer = obs;
      }
    } catch {
      // Fallback to polling
    }

    // Polling interval on parent window
    interval = window.setInterval(() => {
      if (isCancelled()) {
        finish(false);
        return;
      }
      if (isDocumentReady(doc)) {
        finish(true);
      }
    }, 50);
  });
}

async function waitForPaintFrames(cw: Window, frameCount = 2, isCancelled?: () => boolean): Promise<void> {
  const requestAnimationFrame = cw.requestAnimationFrame;
  if (typeof requestAnimationFrame !== "function") return;

  await new Promise<void>((resolve) => {
    let finished = false;
    let framesRemaining = frameCount;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallbackTimer);
      resolve();
    };
    const fallbackTimer = window.setTimeout(finish, 250);
    const requestNextFrame = () => {
      if (isCancelled?.()) {
        finish();
        return;
      }
      try {
        requestAnimationFrame.call(cw, () => {
          if (isCancelled?.()) {
            finish();
            return;
          }
          framesRemaining -= 1;
          if (framesRemaining <= 0) {
            finish();
            return;
          }
          requestNextFrame();
        });
      } catch {
        finish();
      }
    };

    requestNextFrame();
  });
}

export function cancelActivePrintJob(): void {
  // Invalidate any ongoing asynchronous operations
  activeSessionId += 1;

  if (activeCleanupTimer) {
    clearTimeout(activeCleanupTimer);
    activeCleanupTimer = null;
  }
  if (activeRemovalTimer) {
    clearTimeout(activeRemovalTimer);
    activeRemovalTimer = null;
  }
  if (activeWindowCleanup) {
    activeWindowCleanup();
    activeWindowCleanup = null;
  }
  if (activePrintIframe) {
    if (activePrintIframe.parentNode) {
      activePrintIframe.parentNode.removeChild(activePrintIframe);
    }
    activePrintIframe = null;
  }
}

export function printDocumentUrl(url: string, options: PrintDocumentOptions = {}): Promise<void> {
  const { timeoutMs = 15000 } = options;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }

  // Cancel any ongoing job, clean listeners, and purge previous iframe immediately
  cancelActivePrintJob();

  const currentSession = activeSessionId;
  const isCancelled = () => currentSession !== activeSessionId;

  return new Promise<void>((resolve, reject) => {
    const iframe = document.createElement("iframe");
    activePrintIframe = iframe;

    // Position within viewport coordinate space with zero visibility and non-interactive z-index
    // to prevent browser compositor out-of-bounds culling while keeping it completely invisible.
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-9999";
    iframe.setAttribute("aria-hidden", "true");
    iframe.setAttribute("tabindex", "-1");

    let isCleanedUp = false;
    let windowAfterPrintHandler: (() => void) | null = null;
    let cwAfterPrintHandler: (() => void) | null = null;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (activeCleanupTimer) {
        clearTimeout(activeCleanupTimer);
        activeCleanupTimer = null;
      }
      if (windowAfterPrintHandler) {
        window.removeEventListener("afterprint", windowAfterPrintHandler);
        windowAfterPrintHandler = null;
      }
      if (activeWindowCleanup === removeWindowListener) {
        activeWindowCleanup = null;
      }

      try {
        if (cwAfterPrintHandler && iframe.contentWindow) {
          iframe.contentWindow.removeEventListener("afterprint", cwAfterPrintHandler);
          cwAfterPrintHandler = null;
        }
      } catch {
        // Ignore cross-origin / destroyed frame access errors
      }

      // Schedule deferred removal for this specific iframe
      activeRemovalTimer = setTimeout(() => {
        if (activeRemovalTimer) {
          activeRemovalTimer = null;
        }
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        if (activePrintIframe === iframe) {
          activePrintIframe = null;
        }
      }, 1500);
    };

    const removeWindowListener = () => {
      if (windowAfterPrintHandler) {
        window.removeEventListener("afterprint", windowAfterPrintHandler);
        windowAfterPrintHandler = null;
      }
    };
    activeWindowCleanup = removeWindowListener;

    const timeoutId = setTimeout(() => {
      if (isCancelled()) return;
      cleanup();
      reject(new Error("Tiempo de espera agotado al cargar el documento para imprimir."));
    }, timeoutMs);

    iframe.onload = async () => {
      clearTimeout(timeoutId);
      if (isCancelled()) return;

      try {
        const cw = iframe.contentWindow;
        if (!cw) {
          cleanup();
          resolve();
          return;
        }

        // Wait until streamed RSC replaces any loading fallback and marks document as ready
        const isReady = await waitForDocumentReady(cw, 10000, isCancelled);
        if (isCancelled()) return;

        if (!isReady) {
          throw new Error("Tiempo de espera agotado al cargar el documento para imprimir.");
        }

        await waitForPaintFrames(cw, 2, isCancelled);
        if (isCancelled()) return;

        const doc = cw.document;

        // Force synchronous style and layout recalculation on the document
        if (doc?.body) {
          void doc.body.offsetHeight;
        }

        // Brief delay on the active window to allow the layout engine to paint
        await new Promise<void>((resolveLayout) => {
          window.setTimeout(resolveLayout, 150);
        });
        if (isCancelled()) return;

        // Wait for document fonts to finish loading if FontFaceSet API is supported
        if (doc?.fonts?.ready) {
          try {
            await Promise.race([
              doc.fonts.ready,
              new Promise((res) => window.setTimeout(res, 600)),
            ]);
          } catch {
            // Ignore font loading errors; proceed to print
          }
        }
        if (isCancelled()) return;

        // Force another reflow check after fonts settle
        if (doc?.body) {
          void doc.body.offsetHeight;
        }

        // Listen for afterprint with symmetrical cleanup handlers
        cwAfterPrintHandler = () => cleanup();
        windowAfterPrintHandler = () => cleanup();

        cw.addEventListener("afterprint", cwAfterPrintHandler, { once: true });
        window.addEventListener("afterprint", windowAfterPrintHandler, { once: true });

        // Fallback cleanup timer in case afterprint does not fire
        activeCleanupTimer = setTimeout(cleanup, 120000);

        cw.focus();
        cw.print();

        resolve();
      } catch (err) {
        if (!isCancelled()) {
          cleanup();
          reject(err);
        }
      }
    };

    iframe.onerror = (err) => {
      clearTimeout(timeoutId);
      if (!isCancelled()) {
        cleanup();
        reject(err);
      }
    };

    iframe.src = buildPrintUrl(url);
    document.body.appendChild(iframe);
  });
}
