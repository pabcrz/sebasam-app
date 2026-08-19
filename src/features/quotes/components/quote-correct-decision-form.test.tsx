"use client";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { QuoteCorrectDecisionForm } from "./quote-correct-decision-form";

describe("QuoteCorrectDecisionForm", () => {
  it("renders correctly and opens dialog", () => {
    const action = vi.fn();
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="APPROVED" />);
    
    const trigger = screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ });
    fireEvent.click(trigger);

    expect(screen.getByText(/Estás a punto de cambiar la decisión/)).toBeInTheDocument();
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
    expect(screen.getByText("Rechazada")).toBeInTheDocument();
  });

  it("calls action with correct parameters when confirmed", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="APPROVED" />);
    
    fireEvent.click(screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ }));

    const textarea = screen.getByPlaceholderText(/por qué se está corrigiendo/i);
    fireEvent.change(textarea, { target: { value: "Mistake" } });

    const confirm = screen.getByRole("button", { name: /Confirmar corrección/ });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith("q1", "REJECTED", "Mistake");
    });
  });

  it("shows error if reason is empty", async () => {
    const action = vi.fn();
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="APPROVED" />);
    
    fireEvent.click(screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ }));

    const confirm = screen.getByRole("button", { name: /Confirmar corrección/ });
    fireEvent.click(confirm);

    expect(await screen.findByText(/motivo.*obligatorio/i)).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });
});
