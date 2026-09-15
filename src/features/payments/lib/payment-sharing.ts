export type PaymentShareResult = "shared" | "cancelled" | "fallback-copied-opened" | "fallback-copied" | "fallback-opened" | "fallback";

export function paymentShareStatusMessage(result: PaymentShareResult) {
  switch (result) {
    case "shared": return "Recibo compartido.";
    case "cancelled": return "Compartir cancelado.";
    case "fallback-copied-opened": return "Imagen descargada, mensaje copiado y WhatsApp Web abierto. Elige el contacto y adjunta la imagen.";
    case "fallback-copied": return "Imagen descargada y mensaje copiado. WhatsApp Web no pudo abrirse porque el navegador bloqueó la ventana emergente. Abre WhatsApp Web y adjunta la imagen.";
    case "fallback-opened": return "Imagen descargada y WhatsApp Web abierto. No se pudo copiar el mensaje; cópialo manualmente y adjunta la imagen.";
    case "fallback": return "Imagen descargada. No se pudo copiar el mensaje ni abrir WhatsApp Web; compártela manualmente.";
  }
}

function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  try { link.click(); } finally { window.setTimeout(() => URL.revokeObjectURL(url), 0); }
}

export async function sharePaymentFile(file: File, title: string, text: string): Promise<PaymentShareResult> {
  const payload = { files: [file], title, text };
  if (typeof navigator.share === "function" && typeof navigator.canShare === "function") {
    try {
      if (navigator.canShare(payload)) {
        try {
          await navigator.share(payload);
          return "shared";
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
        }
      }
    } catch { /* Continue with the desktop fallback. */ }
  }

  downloadFile(file);
  let copied = false;
  try {
    if (typeof navigator.clipboard?.writeText === "function") {
      await navigator.clipboard.writeText(text);
      copied = true;
    }
  } catch { /* The message remains available in the UI. */ }
  let opened = false;
  try { opened = Boolean(window.open("https://web.whatsapp.com/", "_blank", "noopener,noreferrer")); } catch { /* Popup blockers are truthful in the status. */ }
  return copied && opened ? "fallback-copied-opened" : copied ? "fallback-copied" : opened ? "fallback-opened" : "fallback";
}
