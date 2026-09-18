import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotePaymentHistory } from "./note-payment-history";

vi.mock("../lib/payment-sharing", () => ({
  sharePaymentFile: vi.fn(),
}));

describe("NotePaymentHistory", () => {
  it("renders payment count, individual payment data, and reversed status", () => {
    render(
      <NotePaymentHistory
         title="Servicio"
         folio="N-001"
         customerName="Cliente de prueba"
        totalCents={9_280}
        payments={[
          {
            id: "original",
            paymentId: "original",
            date: "2026-09-01T12:00:00.000Z",
            method: "CASH",
            amountCents: 10_000,
            appliedCents: 0,
            paidCentsAtPayment: 0,
            remainingCentsAtPayment: 9_280,
            isReversed: true,
          },
          {
            id: "replacement",
            paymentId: "replacement",
            date: "2026-09-02T12:00:00.000Z",
            method: "TRANSFER",
            amountCents: 10_000,
            appliedCents: 9_280,
            paidCentsAtPayment: 9_280,
            remainingCentsAtPayment: 0,
            isReversed: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("2 pagos registrados")).toBeInTheDocument();
    expect(screen.getByText("Revertido")).toBeInTheDocument();
    expect(screen.getByText(/Transferencia/)).toBeInTheDocument();
    expect(screen.getAllByText("$100.00", { exact: true })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Descargar PNG" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Descargar recibo/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /Compartir recibo/ })).toHaveLength(1);
    expect(screen.getByText("Revertido")).toBeInTheDocument();
  });

  it("labels pending and failed payments without offering receipt sharing", () => {
    render(
      <NotePaymentHistory
        title="Servicio"
        folio="N-002"
        totalCents={10_000}
        payments={[
          {
            id: "pending",
            paymentId: "pending",
            date: "2026-09-03T12:00:00.000Z",
            method: "TRANSFER",
            paymentStatus: "PENDING",
            amountCents: 3_000,
            appliedCents: 0,
            paidCentsAtPayment: 0,
            remainingCentsAtPayment: 10_000,
            isReversed: false,
          },
          {
            id: "failed",
            paymentId: "failed",
            date: "2026-09-04T12:00:00.000Z",
            method: "TRANSFER",
            paymentStatus: "FAILED",
            amountCents: 2_000,
            appliedCents: 0,
            paidCentsAtPayment: 0,
            remainingCentsAtPayment: 10_000,
            isReversed: false,
          },
        ]}
      />,
    );

    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    expect(screen.getByText("Fallido")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Compartir recibo/ })).not.toBeInTheDocument();
  });

  it("keeps correction and reversal actions attached to each valid payment row", () => {
    render(
      <NotePaymentHistory
        title="Servicio"
        folio="N-003"
        totalCents={10_000}
        payments={[{
          id: "paid",
          paymentId: "paid",
          date: "2026-09-05T12:00:00.000Z",
          method: "CASH",
          amountCents: 4_000,
          paidCentsAtPayment: 4_000,
          remainingCentsAtPayment: 6_000,
          isReversed: false,
        }]}
        correctionAction={vi.fn()}
        reverseAction={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Corregir pago de \$40\.00/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Revertir pago de \$40\.00/i })).toBeInTheDocument();
  });
});
