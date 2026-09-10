/**
 * Triggers in-page document printing using an isolated hidden iframe.
 * Avoids full-page navigation while preserving exact document styles and @page layout.
 */

let activePrintIframe: HTMLIFrameElement | null = null;
let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null;

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

async function waitForDocumentReady(cw: Window, timeoutMs: number): Promise<void> {
  const doc = cw.document;
  if (!doc || typeof doc.querySelector !== "function") return;

  if (isDocumentReady(doc)) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | number | null = null;
    let interval: ReturnType<typeof setInterval> | number | null = null;
    let observer: MutationObserver | null = null;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (timer) window.clearTimeout(timer);
      if (interval) window.clearInterval(interval);
      if (observer) observer.disconnect();
      resolve();
    };

    // Use parent window's setTimeout so it is not throttled in background/invisible frames
    timer = window.setTimeout(finish, timeoutMs);

    try {
      const MutationObserverClass =
        (cw as unknown as { MutationObserver?: typeof MutationObserver }).MutationObserver || window.MutationObserver;
      const target = doc.body || doc.documentElement;
      if (MutationObserverClass && target) {
        const obs = new MutationObserverClass(() => {
          if (isDocumentReady(doc)) {
            finish();
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
      if (isDocumentReady(doc)) {
        finish();
      }
    }, 50);
  });
}

export function printDocumentUrl(url: string, options: PrintDocumentOptions = {}): Promise<void> {
  const { timeoutMs = 15000 } = options;

  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve();
  }

  // Clean up any existing print iframe before starting a new one
  if (activePrintIframe) {
    if (activeCleanupTimer) {
      clearTimeout(activeCleanupTimer);
      activeCleanupTimer = null;
    }
    if (activePrintIframe.parentNode) {
      activePrintIframe.parentNode.removeChild(activePrintIframe);
    }
    activePrintIframe = null;
  }

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
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (activeCleanupTimer) {
        clearTimeout(activeCleanupTimer);
        activeCleanupTimer = null;
      }
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
        if (activePrintIframe === iframe) {
          activePrintIframe = null;
        }
      }, 1500);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tiempo de espera agotado al cargar el documento para imprimir."));
    }, timeoutMs);

    iframe.onload = async () => {
      clearTimeout(timeoutId);
      try {
        const cw = iframe.contentWindow;
        if (!cw) {
          cleanup();
          resolve();
          return;
        }

        // Wait until streamed RSC replaces any loading fallback and marks document as ready
        await waitForDocumentReady(cw, 10000);

        const doc = cw.document;

        // Force synchronous style and layout recalculation on the document
        if (doc?.body) {
          void doc.body.offsetHeight;
        }

        // Brief delay on the active window to allow the layout engine to paint
        await new Promise<void>((resolveLayout) => {
          window.setTimeout(resolveLayout, 150);
        });

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

        // Force another reflow check after fonts settle
        if (doc?.body) {
          void doc.body.offsetHeight;
        }

        // Listen for afterprint
        cw.addEventListener("afterprint", cleanup, { once: true });
        window.addEventListener("afterprint", cleanup, { once: true });

        // Fallback cleanup timer in case afterprint does not fire
        activeCleanupTimer = setTimeout(cleanup, 120000);

        cw.focus();
        cw.print();

        resolve();
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    iframe.onerror = (err) => {
      clearTimeout(timeoutId);
      cleanup();
      reject(err);
    };

    iframe.src = buildPrintUrl(url);
    document.body.appendChild(iframe);
  });
}
