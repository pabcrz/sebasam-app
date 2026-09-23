import { formatCents } from "@/features/quotes/lib/format";
import { formatReceiptDate, paymentMethodLabel } from "./payment-receipt";

export type NotePaymentHistoryItem = {
  id: string;
  paymentId: string;
  date: Date | string;
  method: string;
  paymentStatus?: string;
  amountCents: number;
  appliedCents?: number;
  paidCentsAtPayment: number;
  remainingCentsAtPayment: number;
  isReversed: boolean;
  isCorrected?: boolean;
};

function contributesToPaidTotals(payment: NotePaymentHistoryItem) {
  return payment.paymentStatus === undefined || payment.paymentStatus === "PAID";
}

export type NotePaymentRegister = {
  customerName?: string;
  title: string;
  folio: string;
  totalCents: number;
  paidCents: number;
  remainingCents: number;
  payments: NotePaymentHistoryItem[];
};

export function notePaymentStatusLabel(register: Pick<NotePaymentRegister, "paidCents" | "remainingCents">) {
  if (register.remainingCents <= 0) return "Nota liquidada";
  return register.paidCents > 0 ? "Pago parcial" : "Saldo pendiente";
}

export function buildNotePaymentRegister(input: Omit<NotePaymentRegister, "paidCents" | "remainingCents">) {
  const payments = input.payments.filter((payment) => !payment.isReversed);
  const paidCents = payments
    .filter(contributesToPaidTotals)
    .reduce((sum, payment) => sum + (payment.appliedCents ?? payment.amountCents), 0);
  return {
    ...input,
    payments,
    paidCents,
    remainingCents: Math.max(0, input.totalCents - paidCents),
  } satisfies NotePaymentRegister;
}

export function withHistoricalBalances(totalCents: number, payments: NotePaymentHistoryItem[]) {
  let paidCents = 0;
  return payments.map((payment) => {
    if (!payment.isReversed && contributesToPaidTotals(payment)) {
      paidCents += payment.appliedCents ?? payment.amountCents;
    }
    return { ...payment, paidCentsAtPayment: paidCents, remainingCentsAtPayment: totalCents - paidCents };
  });
}

export function buildNotePaymentRegisterMessage(register: NotePaymentRegister) {
  const paymentLines = register.payments.length === 0
    ? ["Pagos registrados: ninguno."]
      : register.payments.map((payment) =>
         `Abono #${register.payments.indexOf(payment) + 1} · ${formatReceiptDate(payment.date)} · ${paymentMethodLabel(payment.method)} · ${formatCents(payment.amountCents)} · ${payment.isReversed ? "Pago revertido" : payment.isCorrected ? "Pago corregido" : payment.paymentStatus === "PENDING" ? "Pendiente" : payment.paymentStatus === "FAILED" ? "Fallido" : payment.remainingCentsAtPayment <= 0 ? "Nota liquidada" : "Pago registrado"} · Saldo después de este pago: ${formatCents(payment.remainingCentsAtPayment)}`,
      );

  return [
    `Hola, comparto el estado de cuenta de ${register.customerName ?? "Cliente"}. Nota ${register.title}, folio ${register.folio}.`,
    `Total: ${formatCents(register.totalCents)}.`,
    ...paymentLines,
    `Total pagado: ${formatCents(register.paidCents)}.`,
    `Saldo restante: ${formatCents(register.remainingCents)}.`,
    `Estado de la nota: ${notePaymentStatusLabel(register)}.`,
  ].join(" ");
}

export function drawNotePaymentRegister(canvas: HTMLCanvasElement, register: NotePaymentRegister) {
  const rowCount = Math.max(1, register.payments.length);
  canvas.width = 1400;
  canvas.height = 425 + rowCount * 58;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la imagen del estado de cuenta.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f7f8fa";
  context.strokeStyle = "#d9dee7";
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(30, 30, canvas.width - 60, canvas.height - 60, 24);
  context.fill();
  context.stroke();

  context.fillStyle = "#182230";
  context.textAlign = "left";
  context.font = "700 34px Arial, sans-serif";
  context.fillText("Estado de cuenta", 70, 95);
  context.font = "24px Arial, sans-serif";
  context.fillStyle = "#4b5563";
  context.fillText(`Cliente: ${register.customerName ?? "Cliente"}`, 70, 135);
  context.fillText(`Nota: ${register.title} · Folio: ${register.folio}`, 70, 170);

  const headers = ["Abono", "Fecha y hora", "Método", "Pago", "Estado", "Saldo después"];
  const x = [70, 180, 490, 730, 980, 1190];
  context.font = "700 20px Arial, sans-serif";
  headers.forEach((header, index) => context.fillText(header, x[index], 220));
  register.payments.forEach((payment, index) => {
    const y = 265 + index * 58;
    context.font = "20px Arial, sans-serif";
    context.fillText(`#${index + 1}`, x[0], y);
    context.fillText(formatReceiptDate(payment.date), x[1], y);
    context.fillText(paymentMethodLabel(payment.method), x[2], y);
    context.font = "700 20px Arial, sans-serif";
    context.fillText(formatCents(payment.amountCents), x[3], y);
    const statusLabel = payment.isReversed
      ? "Pago revertido"
      : payment.isCorrected
        ? "Pago corregido"
      : payment.paymentStatus && payment.paymentStatus !== "PAID"
        ? payment.paymentStatus === "PENDING" ? "Pendiente" : "Fallido"
         : payment.remainingCentsAtPayment <= 0 ? "Nota liquidada" : "Pago registrado";
    context.fillStyle = payment.isReversed || payment.paymentStatus === "FAILED" ? "#b42318" : "#182230";
    context.fillText(statusLabel, x[4], y);
    context.fillText(formatCents(payment.remainingCentsAtPayment), x[5], y);
    context.fillStyle = "#182230";
  });

  const summaryY = 315 + rowCount * 58;
  context.font = "700 23px Arial, sans-serif";
  context.fillText(`Total: ${formatCents(register.totalCents)}`, 70, summaryY);
  context.fillText(`Total pagado: ${formatCents(register.paidCents)}`, 400, summaryY);
  context.fillText(`Saldo restante: ${formatCents(register.remainingCents)}`, 750, summaryY);
  context.font = "18px Arial, sans-serif";
  context.fillStyle = "#6b7280";
  context.fillText(`Estado de la nota: ${notePaymentStatusLabel(register)}`, 70, summaryY + 50);
  context.fillText("Estado emitido por SEBASAM · No es un comprobante bancario", 70, summaryY + 85);
}

export function createNotePaymentRegisterFile(register: NotePaymentRegister) {
  const canvas = document.createElement("canvas");
  drawNotePaymentRegister(canvas, register);
  const binary = atob(canvas.toDataURL("image/png").split(",")[1]);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new File([new Blob([bytes], { type: "image/png" })], `${register.folio}-estado-de-cuenta.png`, { type: "image/png" });
}
