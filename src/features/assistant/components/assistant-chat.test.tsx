import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteItemType } from "@prisma/client";
import type { HistoricalMatchSource } from "@/features/historical/repository";
import { AssistantChat } from "./assistant-chat";

const source: HistoricalMatchSource = {
  itemId: "item-1",
  workId: "work-1",
  workRef: "E-01",
  workDate: "2026-01-08",
  customerName: "Juan Pérez",
  plate: "ABC123",
  brand: "Nissan",
  model: "NP300",
  masterName: "Luis",
  type: QuoteItemType.REFACCIONES,
  description: "4 tornillos",
  quantity: 4,
  customerPriceCents: 20000,
  payrollBaseCents: null,
  ratePercent: null,
  includeInPayroll: false,
  isKit: false,
  contentHash: "h",
  metadata: {},
  similarity: 0.91,
};

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({
      answer: "Por los 4 tornillos cobramos $200 en total, es decir $50 por pieza [1].",
      sources: [source],
      aggregation: null,
      filters: { wantsStats: false },
    }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("AssistantChat", () => {
  it("sends the question and renders the answer with an expandable source panel", async () => {
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.type(screen.getByLabelText("Pregunta al asistente"), "¿Cuánto cuesta cada tornillo?");
    await user.click(screen.getByRole("button", { name: "Enviar pregunta" }));

    await waitFor(() => {
      expect(screen.getByText(/cobramos \$200 en total/)).toBeInTheDocument();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/assistant/chat",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ question: "¿Cuánto cuesta cada tornillo?" }),
      }),
    );

    const expand = screen.getByRole("button", { name: /4 tornillos/ });
    await user.click(expand);

    expect(screen.getByText("E-01")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez · Nissan NP300 (ABC123)")).toBeInTheDocument();
    expect(screen.getByText("4 × $200.00")).toBeInTheDocument();
    expect(screen.getByText("Unitario derivado")).toBeInTheDocument();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("shows the provider error returned by the API", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "Solicitud de embedding falló (HTTP 500)." }),
    });
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.type(screen.getByLabelText("Pregunta al asistente"), "hola");
    await user.click(screen.getByRole("button", { name: "Enviar pregunta" }));

    await waitFor(() => {
      expect(screen.getByText(/Solicitud de embedding falló/)).toBeInTheDocument();
    });
  });

  it("shows a connection error when the request fails", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    const user = userEvent.setup();
    render(<AssistantChat />);

    await user.type(screen.getByLabelText("Pregunta al asistente"), "hola");
    await user.click(screen.getByRole("button", { name: "Enviar pregunta" }));

    await waitFor(() => {
      expect(screen.getByText(/No se pudo conectar con el asistente/)).toBeInTheDocument();
    });
  });
});