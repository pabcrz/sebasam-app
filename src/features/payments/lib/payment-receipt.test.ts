import { describe, expect, it, vi } from "vitest";
import { buildPaymentReceiptMessage, createPaymentReceiptFile, createPaymentReceiptImage, drawPaymentReceipt } from "./payment-receipt";

const data = {
  title: "Cambio de muelles",
  folio: "N-090926-01",
  totalCents: 11600,
  paymentCents: 2500,
  paidCents: 5000,
  remainingCents: 6600,
  method: "TRANSFER",
  customerName: "Cliente de prueba",
  sequence: 2,
};

const validPngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

function canvasHeightFor(receipt: typeof data) {
  const canvas = document.createElement("canvas");
  drawPaymentReceipt(canvas, receipt);
  return canvas.height;
}

function mockCanvas() {
  const fillText = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    textAlign: "left",
    font: "",
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText,
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
  return fillText;
}

describe("payment receipt", () => {
  it("builds a short caption that introduces the image instead of repeating it", () => {
    const message = buildPaymentReceiptMessage(data);

    expect(message).toBe("Hola, te comparto el recibo de tu abono de $25.00 a la nota N-090926-01. Saldo pendiente: $66.00.");
    for (const repeated of ["Total", "Cambio de muelles", "Transferencia", "Cliente de prueba", "Pago registrado", "Fecha y hora"]) {
      expect(message).not.toContain(repeated);
    }
  });

  it("tells the customer when the note is settled instead of repeating a zero balance", () => {
    const message = buildPaymentReceiptMessage({ ...data, remainingCents: 0, sequence: 3 });

    expect(message).toContain("Tu nota quedó liquidada.");
    expect(message).not.toContain("Saldo pendiente");
  });

  it("announces a reversed payment with the balance that remains", () => {
    const message = buildPaymentReceiptMessage({ ...data, isReversed: true });

    expect(message).toBe("Hola, te aviso que se revirtió el abono de $25.00 a la nota N-090926-01. Saldo pendiente: $66.00.");
  });

  it("draws the receipt without a status row, trimmed to its content", () => {
    const fillText = mockCanvas();
    createPaymentReceiptFile(data);

    const drawn = fillText.mock.calls.map((call) => String(call[0]));
    expect(drawn).toEqual(expect.arrayContaining(["Total", "Abono #2", "Saldo restante"]));
    expect(drawn).not.toContain("Estado");
    expect(drawn.join(" ")).not.toContain("Pago parcial");
    expect(drawn.join(" ")).not.toContain("Pago registrado");
    expect(canvasHeightFor(data)).toBeLessThan(700);
  });

  it("keeps the status row only for a reversed payment", () => {
    const fillText = mockCanvas();
    createPaymentReceiptFile({ ...data, isReversed: true });

    const drawn = fillText.mock.calls.map((call) => String(call[0]));
    expect(drawn).toContain("Estado");
    expect(drawn).toContain("Pago revertido");
  });

  it("returns a valid PNG image file with a stable name for sharing", async () => {
    mockCanvas();

    const file = createPaymentReceiptFile(data);
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("N-090926-01-recibo.png");
    expect(new Uint8Array(await file.arrayBuffer()).slice(0, 8)).toEqual(pngSignature);
  });

  it("returns a valid PNG image blob for manual sharing", async () => {
    mockCanvas();
    const image = await createPaymentReceiptImage(data);
    expect(image.type).toBe("image/png");
    expect(new Uint8Array(await image.arrayBuffer()).slice(0, 8)).toEqual(pngSignature);
  });
});
