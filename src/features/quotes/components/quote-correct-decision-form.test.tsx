
"use client";

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import { QuoteCorrectDecisionForm } from "./quote-correct-decision-form";

describe("QuoteCorrectDecisionForm", () => {
  it("renders correctly and opens dialog with options for APPROVED status", () => {
    const action = vi.fn();
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="APPROVED" />);
    
    const trigger = screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ });
    fireEvent.click(trigger);

    expect(screen.getByRole("button", { name: "Cerrar corrección de cotización" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("overflow-hidden");
    expect(screen.getByText(/La cotización Q-1 está actualmente/)).toBeInTheDocument();
    expect(screen.getByText("Aceptada")).toBeInTheDocument();
    expect(screen.getByText("Declinar cotización")).toBeInTheDocument();
    expect(screen.getByText("Regresar a Borrador")).toBeInTheDocument();
  });

  it("renders correctly and opens dialog with options for REJECTED status", () => {
    const action = vi.fn();
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="REJECTED" />);
    
    const trigger = screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ });
    fireEvent.click(trigger);

    expect(screen.getByText(/La cotización Q-1 está actualmente/)).toBeInTheDocument();
    expect(screen.getByText("Declinada")).toBeInTheDocument();
    expect(screen.getByText("Aceptar cotización")).toBeInTheDocument();
    expect(screen.getByText("Regresar a Borrador")).toBeInTheDocument();
  });

  it("calls action with REJECTED when confirmed for APPROVED status by default", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="APPROVED" />);
    
    fireEvent.click(screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ }));

    const confirm = screen.getByRole("button", { name: /Confirmar corrección/ });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith("q1", "REJECTED");
    });
  });

  it("calls action with DRAFT when selected from REJECTED status", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="REJECTED" />);
    
    fireEvent.click(screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ }));

    // DRAFT is default for REJECTED
    const confirm = screen.getByRole("button", { name: /Confirmar corrección/ });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith("q1", "DRAFT");
    });
  });

  it("calls action with APPROVED when selected from REJECTED status", async () => {
    const action = vi.fn().mockResolvedValue({ success: true });
    render(<QuoteCorrectDecisionForm action={action} quoteId="q1" quoteNumber="Q-1" currentStatus="REJECTED" />);
    
    fireEvent.click(screen.getByRole("button", { name: /Corregir decisión de cotización Q-1/ }));

    const approvedRadio = screen.getByRole("radio", { name: /Aceptar cotización/i });
    fireEvent.click(approvedRadio);

    const confirm = screen.getByRole("button", { name: /Confirmar corrección/ });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(action).toHaveBeenCalledWith("q1", "APPROVED");
    });
  });
});
