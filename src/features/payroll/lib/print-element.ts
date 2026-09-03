/**
 * Utility to print a specific DOM element directly in the current page
 * without opening new tabs and without modal/backdrop interference.
 */
export function printElementById(elementId: string, pageTitle = "Imprimir"): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const targetElement = document.getElementById(elementId);
  if (!targetElement) {
    window.print();
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    window.print();
    return;
  }

  const styleTags = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
    .map((el) => el.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${pageTitle}</title>
        ${styleTags}
        <style>
          @page {
            margin: 0.8cm;
            size: letter portrait;
          }
          *, *::before, *::after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          .print-center-container {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            width: 100%;
            padding: 0;
            margin: 0;
          }
        </style>
      </head>
      <body class="bg-white text-slate-900">
        <div class="print-center-container">
          ${targetElement.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }
  }, 300);
}
