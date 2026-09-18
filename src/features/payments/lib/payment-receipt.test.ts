import { describe, expect, it, vi } from "vitest";
import { buildPaymentReceiptMessage, createPaymentReceiptFile, createPaymentReceiptImage } from "./payment-receipt";

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

function mockCanvas() {
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
    fillText: vi.fn(),
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(validPngDataUrl);
}

describe("payment receipt", () => {
  it("builds the complete receipt message for sharing", () => {
    const message = buildPaymentReceiptMessage(data);
    expect(message).toContain("Cambio de muelles");
    expect(message).toContain("N-090926-01");
    expect(message).toContain("Total: $116.00");
    expect(message).toContain("Abono #2: $25.00 (Transferencia)");
    expect(message).toContain("Transferencia");
    expect(message).toContain("Cliente de prueba");
    expect(message).toContain("Pago registrado");
    expect(message).toContain("Saldo pendiente: $66.00");
    expect(message).not.toContain("Saldo después de este pago");
    expect(message).not.toContain("Saldo restante");
  });

  it("clearly identifies a settled receipt without accumulated paid wording", () => {
    const message = buildPaymentReceiptMessage({ ...data, remainingCents: 0, sequence: 3 });
    expect(message).toContain("Nota liquidada");
    expect(message).toContain("Saldo pendiente: $0.00");
    expect(message).not.toContain("Pagado acumulado");
  });

  it("uses only the reversed status for a reversed receipt", () => {
    const message = buildPaymentReceiptMessage({ ...data, isReversed: true });

    expect(message).toContain("Estado: Pago revertido.");
    expect(message).not.toContain("Pago registrado");
    expect(message).not.toContain("Pago parcial");
    expect(message).not.toContain("Saldo después de este pago");
    expect(message).toContain("Saldo pendiente: $66.00");
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
