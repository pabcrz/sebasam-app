/**
 * Triggers in-page document printing using an isolated hidden iframe.
 * Avoids full-page navigation while preserving exact document styles and @page layout.
 */

let activePrintIframe: HTMLIFrameElement | null = null;
let activeCleanupTimer: ReturnType<typeof setTimeout> | null = null;

export interface PrintDocumentOptions {
  timeoutMs?: number;
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
