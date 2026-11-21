import { toPng } from "html-to-image";

export async function renderElementPng(elementId: string): Promise<string | null> {
  const node = document.getElementById(elementId);
  if (!node) return null;

  return await toPng(node, {
    backgroundColor: "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
    style: { margin: "0", transform: "none" },
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export async function downloadElementPng(elementId: string, fileName: string): Promise<void> {
  const dataUrl = await renderElementPng(elementId);
  if (dataUrl) downloadDataUrl(dataUrl, fileName);
}

/**
 * Shares the element as a PNG through the native share sheet (WhatsApp on phones).
 * Returns a status message when it had to fall back to a download, or null when shared or cancelled.
 */
export async function shareElementPng(elementId: string, fileName: string, title: string): Promise<string | null> {
  try {
    const dataUrl = await renderElementPng(elementId);
    if (!dataUrl) throw new Error("No se pudo generar la imagen.");

    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], fileName, { type: "image/png" });

    if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return null;
    }

    downloadDataUrl(dataUrl, fileName);
    return "Imagen descargada. Adjúntala manualmente en WhatsApp.";
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return null;
    console.error("Error al compartir imagen:", err);
    return "No se pudo compartir la imagen. Descárgala e intenta adjuntarla manualmente.";
  }
}
