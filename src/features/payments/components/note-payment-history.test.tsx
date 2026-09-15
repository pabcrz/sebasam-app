import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotePaymentHistory } from "./note-payment-history";

vi.mock("../lib/payment-sharing", () => ({
  sharePaymentFile: vi.fn(),
}));

describe("NotePaymentHistory", () => {
  it("renders the consolidated effective total, individual payment data, and reversed status", () => {
    render(
      <NotePaymentHistory
        title="Servicio"
        folio="N-001"
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

    expect(screen.getByText(/Pagado \$92\.80 · Saldo \$0\.00/)).toBeInTheDocument();
    expect(screen.getByText("Revertido")).toBeInTheDocument();
    expect(screen.getByText(/Transferencia/)).toBeInTheDocument();
    expect(screen.getAllByText("$100.00", { exact: true })).toHaveLength(2);
  });
});
