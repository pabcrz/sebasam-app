import { describe, expect, it, vi } from "vitest";
import {
  buildNotePaymentRegister,
  buildNotePaymentRegisterMessage,
  createNotePaymentRegisterFile,
  drawNotePaymentRegister,
  type NotePaymentHistoryItem,
  withHistoricalBalances,
} from "./payment-register";

const payments = [
  { id: "a", paymentId: "pa", date: "2026-09-01T12:00:00.000Z", method: "CASH", amountCents: 2500, paidCentsAtPayment: 0, remainingCentsAtPayment: 0, isReversed: false },
  { id: "b", paymentId: "pb", date: "2026-09-03T12:00:00.000Z", method: "TRANSFER", amountCents: 1500, paidCentsAtPayment: 0, remainingCentsAtPayment: 0, isReversed: true },
];

describe("note payment register", () => {
  it("keeps an empty history shareable with zero paid", () => {
    const register = buildNotePaymentRegister({ title: "Servicio", folio: "N-001", totalCents: 10000, payments: [] });
    expect(register.paidCents).toBe(0);
    expect(register.remainingCents).toBe(10000);
    expect(buildNotePaymentRegisterMessage(register)).toContain("Pagos registrados: ninguno");
  });

  it("preserves order, method labels, and excludes reversed payments from current totals", () => {
    const withBalances = withHistoricalBalances(10000, payments);
    const register = buildNotePaymentRegister({ title: "Servicio", folio: "N-001", totalCents: 10000, payments: withBalances });
    expect(register.paidCents).toBe(2500);
    expect(register.remainingCents).toBe(7500);
    expect(withBalances.map((payment) => payment.paidCentsAtPayment)).toEqual([2500, 2500]);
    expect(withBalances.map((payment) => payment.remainingCentsAtPayment)).toEqual([7500, 7500]);
    const message = buildNotePaymentRegisterMessage(register);
    expect(message.indexOf("Efectivo")).toBeLessThan(message.indexOf("Transferencia"));
    expect(message).toContain("Pago revertido");
  });

  it("renders a PNG file for the consolidated statement", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "",
      fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,iVBORw0KGgo=");
    const register = buildNotePaymentRegister({ title: "Servicio", folio: "N-001", totalCents: 10000, payments: [] });
    const file = createNotePaymentRegisterFile(register);
    expect(file.name).toBe("N-001-estado-de-cuenta.png");
    expect(file.type).toBe("image/png");
    expect(new Uint8Array(await file.arrayBuffer()).slice(0, 8)).toEqual(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));
  });

  it("uses the overall statement status wording in the message and PNG", () => {
    const fillText = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "",
      fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText,
    } as unknown as CanvasRenderingContext2D);

    const statusCases: Array<[NotePaymentHistoryItem[], string]> = [
      [[], "Saldo pendiente"],
      [[{ ...payments[0], appliedCents: 1000, isReversed: false }], "Pago parcial"],
      [[{ ...payments[0], appliedCents: 10000, isReversed: false }], "Nota liquidada"],
    ];

    for (const [statusPayments, expected] of statusCases) {
      const register = buildNotePaymentRegister({ title: "Servicio", folio: "N-001", totalCents: 10000, payments: statusPayments });
      expect(buildNotePaymentRegisterMessage(register)).toContain(`Estado de la nota: ${expected}.`);
      fillText.mockClear();
      drawNotePaymentRegister(document.createElement("canvas"), register);
      expect(fillText).toHaveBeenCalledWith(`Estado de la nota: ${expected}`, 70, expect.any(Number));
    }
  });

  it("uses the reversed status for a reversed statement row", () => {
    const fillText = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillStyle: "", strokeStyle: "", lineWidth: 0, textAlign: "left", font: "",
      fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), stroke: vi.fn(), fillText,
    } as unknown as CanvasRenderingContext2D);
    const register = buildNotePaymentRegister({
      title: "Servicio",
      folio: "N-001",
      totalCents: 10000,
      payments: [{ ...payments[1], remainingCentsAtPayment: 10000 }],
    });

    expect(buildNotePaymentRegisterMessage(register)).toContain("Pago revertido");
    expect(buildNotePaymentRegisterMessage(register)).not.toContain("Pago registrado");
    drawNotePaymentRegister(document.createElement("canvas"), register);
    expect(fillText).toHaveBeenCalledWith("Pago revertido", 980, expect.any(Number));
  });
});
