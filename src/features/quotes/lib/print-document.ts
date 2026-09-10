/**
 * Triggers in-page document printing using an isolated hidden iframe.
 * Avoids full-page navigation while preserving exact document styles and @page layout.
 */

let activePrintIframe: HTMLIFrameElement | null = null;
let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null;

export interface PrintDocumentOptions {
  timeoutMs?: number;
}

async function waitForDocumentReady(cw: Window, timeoutMs: number): Promise<void> {
  const doc = cw.document;
  if (!doc || typeof doc.querySelector !== "function") return;

  const isReady = () => {
    // Check if the generic admin loading skeleton is still displayed
    const hasSkeleton = Boolean(doc.querySelector("[aria-label='Cargando contenido...']"));
    if (hasSkeleton) return false;

    // Check if explicit print document ready marker is present
    const hasReadyMarker = Boolean(doc.querySelector("[data-document-ready='true']"));
    if (hasReadyMarker) return true;

    // Fallback: check for standard document content elements
    const hasContent = Boolean(doc.querySelector("main, article, #printable-quote, table"));
    return hasContent;
  };

  if (isReady()) {
    return;
  }

  await new Promise<void>((resolve) => {
    let resolved = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;
    let observer: MutationObserver | null = null;

    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
      if (observer) observer.disconnect();
      resolve();
    };

    timer = setTimeout(finish, timeoutMs);

    try {
      const MutationObserverClass =
        (cw as unknown as { MutationObserver?: typeof MutationObserver }).MutationObserver || window.MutationObserver;
      const target = doc.body || doc.documentElement;
      if (MutationObserverClass && target) {
        const obs = new MutationObserverClass(() => {
          if (isReady()) {
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

    interval = setInterval(() => {
      if (isReady()) {
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

    // Position offscreen with standard document dimensions
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "1024px";
    iframe.style.height = "768px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
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

        // Allow browser layout engine to calculate styles and paint the updated nodes
        await new Promise<void>((resolveFrames) => {
          if (typeof cw.requestAnimationFrame === "function") {
            cw.requestAnimationFrame(() => {
              cw.requestAnimationFrame(() => resolveFrames());
            });
          } else {
            setTimeout(resolveFrames, 50);
          }
        });

        // Wait for document fonts to finish loading if FontFaceSet API is supported
        if (cw.document?.fonts?.ready) {
          try {
            await Promise.race([
              cw.document.fonts.ready,
              new Promise((res) => setTimeout(res, 800)),
            ]);
          } catch {
            // Ignore font loading errors; proceed to print
          }
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

    iframe.src = url;
    document.body.appendChild(iframe);
  });
}
