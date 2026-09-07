import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportFlow } from "./import-flow";
import type { HistoricalImportReport } from "../importer";

const { importHistoricalBatchAction, checkHistoricalDuplicatesAction } = vi.hoisted(() => ({
  importHistoricalBatchAction: vi.fn(),
  checkHistoricalDuplicatesAction: vi.fn(),
}));

vi.mock("../actions", () => ({
  importHistoricalBatchAction,
  checkHistoricalDuplicatesAction,
}));

const sampleJson = JSON.stringify(
  {
    schemaVersion: 2,
    batch: { id: "libreta-2026-01", source: "voice" },
    works: [
      {
        ref: "E-01",
        date: "2026-01-08",
        customer: { name: "Juan Pérez", plate: "ABC123", brand: "Nissan", model: "NP300" },
        master: "Luis",
        items: [
          { type: "LABOR", description: "Cambiar bujes", customerPrice: 1200, payrollBase: 1000 },
          { type: "REFACCIONES", description: "4 tornillos", quantity: 4, customerPrice: 200 },
          { type: "REFACCIONES", description: "Kit de pernos", quantity: 1, customerPrice: 850, isKit: true },
        ],
      },
    ],
  },
  null,
  2,
);

function sampleReport(overrides: Partial<HistoricalImportReport> = {}): HistoricalImportReport {
  return {
    schemaVersion: 2,
    batchId: "libreta-2026-01",
    source: "voice",
    parseError: null,
    detectedWorks: 1,
    validWorks: 1,
    duplicateWorks: 0,
    errorWorks: 0,
    importedWorks: 1,
    importedItems: 3,
    duplicatedItems: 0,
    distinctItemTypes: ["LABOR", "REFACCIONES"],
    distinctDescriptions: ["4 tornillos", "Cambiar bujes", "Kit de pernos"],
    works: [{ ref: "E-01", status: "imported", error: null, itemsImported: 3, itemsDuplicated: 0 }],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  checkHistoricalDuplicatesAction.mockResolvedValue({ batchId: "libreta-2026-01", refs: [] });
  importHistoricalBatchAction.mockResolvedValue({ ok: true, report: sampleReport() });
});

describe("ImportFlow", () => {
  it("shows the paste step and rejects invalid JSON", async () => {
    const user = userEvent.setup();
    render(<ImportFlow masters={[]} />);

    expect(screen.getByText("Pegar o subir")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: "{ no es json" } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));

    expect(screen.getByText(/no es JSON válido/)).toBeInTheDocument();
  });

  it("walks through paste → review → confirm → result", async () => {
    const user = userEvent.setup();
    render(<ImportFlow masters={[]} />);

    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: sampleJson } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));

    // Review step: work + items rendered as editable forms.
    expect(screen.getByText("Revisar")).toBeInTheDocument();
    expect(screen.getByDisplayValue("E-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Cambiar bujes")).toBeInTheDocument();
    expect(screen.getByDisplayValue("4")).toBeInTheDocument(); // quantity
    expect(screen.getByDisplayValue("1200")).toBeInTheDocument(); // importe
    expect(screen.getByDisplayValue("1000")).toBeInTheDocument(); // base taller
    const kitCheckboxes = screen.getAllByRole("checkbox", { name: /Es kit/ });
    expect(kitCheckboxes.filter((checkbox) => checkbox.getAttribute("aria-checked") === "true")).toHaveLength(1);

    // Continue to confirm.
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(screen.getByText("Confirmar")).toBeInTheDocument();
    });
    expect(screen.getByText("1")).toBeInTheDocument(); // trabajos
    expect(screen.getByText("3")).toBeInTheDocument(); // conceptos
    expect(screen.getByText(/Sin duplicados detectados/)).toBeInTheDocument();

    // Confirm inserts.
    await user.click(screen.getByRole("button", { name: "Confirmar importación" }));

    await waitFor(() => {
      expect(importHistoricalBatchAction).toHaveBeenCalledTimes(1);
    });
    const sentPayload = importHistoricalBatchAction.mock.calls[0][0] as {
      schemaVersion: number;
      works: Array<{ ref: string }>;
    };
    expect(sentPayload.schemaVersion).toBe(2);
    expect(sentPayload.works[0].ref).toBe("E-01");

    expect(await screen.findByText(/Trabajos importados: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Conceptos: 3/)).toBeInTheDocument();
  });

  it("detects and reports possible duplicates in the confirm step", async () => {
    checkHistoricalDuplicatesAction.mockResolvedValue({ batchId: "libreta-2026-01", refs: ["E-01"] });
    const user = userEvent.setup();
    render(<ImportFlow masters={[]} />);

    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: sampleJson } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => {
      expect(screen.getByText(/Posibles duplicados en este lote/)).toBeInTheDocument();
    });
    expect(screen.getByText(/E-01/)).toBeInTheDocument();
  });

  it("surfaces per-work validation errors in the review step", async () => {
    const invalidJson = JSON.stringify({
      schemaVersion: 2,
      batch: { id: "lote-x", source: "text" },
      works: [
        {
          ref: "X-01",
          date: "2026-01-08",
          items: [{ type: "LABOR", description: "Cambiar bujes", quantity: 2, customerPrice: 1200 }],
        },
      ],
    });
    const user = userEvent.setup();
    render(<ImportFlow masters={[]} />);

    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: invalidJson } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));

    expect(await screen.findByText(/La mano de obra no lleva cantidad/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("resolves an unambiguous master by displayName", async () => {
    const user = userEvent.setup();
    render(<ImportFlow masters={[{ id: "uuid-1", displayName: "Luis" }]} />);

    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: sampleJson } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));

    expect(await screen.findByText("Vinculado al perfil Luis")).toBeInTheDocument();
    const masterInput = screen.getByLabelText("Maestro");
    expect(masterInput).toHaveValue("Luis");
  });

  it("shows the provider error from the import action", async () => {
    importHistoricalBatchAction.mockResolvedValue({
      ok: false,
      error: "GEMINI_API_KEY no está configurada.",
    });
    const user = userEvent.setup();
    render(<ImportFlow masters={[]} />);

    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: sampleJson } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("button", { name: "Confirmar importación" }));

    expect(await screen.findByText(/GEMINI_API_KEY no está configurada/)).toBeInTheDocument();
  });

  it("allows adding and removing concepts in the review step", async () => {
    const user = userEvent.setup();
    render(<ImportFlow masters={[]} />);

    fireEvent.change(screen.getByLabelText("JSON del lote (schemaVersion 2)"), { target: { value: sampleJson } });
    await user.click(screen.getByRole("button", { name: /Analizar y revisar/ }));

    const addButton = screen.getByRole("button", { name: /Agregar concepto/ });
    await user.click(addButton);

    // The new labor row shows no quantity field; description input exists.
    const descriptionInputs = screen.getAllByPlaceholderText("Ej. Cambiar bujes");
    expect(descriptionInputs).toHaveLength(4);

    // Remove the kit row.
    const removeButtons = screen.getAllByRole("button", { name: /Eliminar concepto/ });
    await user.click(removeButtons[2]);
    expect(within(document.body).queryByDisplayValue("Kit de pernos")).not.toBeInTheDocument();
  });
});