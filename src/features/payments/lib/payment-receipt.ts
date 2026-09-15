import { formatCents } from "@/features/quotes/lib/format";

export type PaymentReceiptData = {
  title: string;
  folio: string;
  totalCents: number;
  paymentCents: number;
  paidCents: number;
  remainingCents: number;
  method: string;
  paymentDate?: Date | string;
  isReversed?: boolean;
};

const METHOD_LABELS: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
};

export function paymentMethodLabel(method: string) {
  return METHOD_LABELS[method] ?? method;
}

export function buildPaymentReceiptMessage(data: PaymentReceiptData) {
  return [
    `Hola, comparto el recibo de pago de la Nota ${data.title}, folio ${data.folio}.`,
    `Total: ${formatCents(data.totalCents)}.`,
    `Pago: ${formatCents(data.paymentCents)} (${paymentMethodLabel(data.method)}).`,
    data.paymentDate ? `Fecha: ${formatReceiptDate(data.paymentDate)}.` : null,
    `Pagado acumulado: ${formatCents(data.paidCents)}.`,
    `Saldo restante: ${formatCents(data.remainingCents)}.`,
    data.isReversed ? "Estado: Revertido; no es un pago vigente." : null,
  ].filter(Boolean).join(" ");
}

export function formatReceiptDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(date));
}

export function drawPaymentReceipt(canvas: HTMLCanvasElement, data: PaymentReceiptData) {
  canvas.width = 900;
  canvas.height = 700;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen del recibo.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f7f8fa";
  context.strokeStyle = "#d9dee7";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(30, 30, 840, 640, 24);
  context.fill();
  context.stroke();

  context.textAlign = "left";
  context.fillStyle = "#182230";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("Recibo de pago", 70, 100);
  context.fillStyle = "#4b5563";
  context.font = "24px Arial, sans-serif";
  context.fillText(`Nota: ${data.title}`, 70, 145);
  context.fillText(`Folio: ${data.folio}`, 70, 182);
  if (data.paymentDate) context.fillText(`Fecha: ${formatReceiptDate(data.paymentDate)}`, 70, 219);

  const rows = [
    ["Total", formatCents(data.totalCents)],
    ["Pago", `${formatCents(data.paymentCents)} · ${paymentMethodLabel(data.method)}`],
    ["Pagado acumulado", formatCents(data.paidCents)],
    ["Saldo restante", formatCents(data.remainingCents)],
    ...(data.isReversed ? [["Estado", "Revertido"]] : []),
  ];

  rows.forEach(([label, value], index) => {
    const y = 250 + index * 65;
    context.fillStyle = "#4b5563";
    context.font = "25px Arial, sans-serif";
    context.textAlign = "left";
    context.fillText(label, 70, y);
    context.fillStyle = "#182230";
    context.font = "700 25px Arial, sans-serif";
    context.textAlign = "right";
    context.fillText(value, 830, y);
  });

  context.textAlign = "left";
  context.fillStyle = "#6b7280";
  context.font = "18px Arial, sans-serif";
  context.fillText("Recibo emitido por SEBASAM · No es un comprobante bancario", 70, 650);
}

export function createPaymentReceiptImage(data: PaymentReceiptData) {
  const canvas = document.createElement("canvas");
  drawPaymentReceipt(canvas, data);
  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: "image/png" });
}

export function createPaymentReceiptFile(data: PaymentReceiptData) {
  const image = createPaymentReceiptImage(data);
  return new File([image], `${data.folio}-recibo.png`, { type: "image/png" });
}
