import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { ToasterProvider } from "@/components/ui/toaster";
import toast from "react-hot-toast";
import { QuotePageToasts } from "./quote-page-toasts";

const replace = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
  useRouter: () => ({ replace }),
}));

function renderWithToaster(ui: React.ReactNode) {
  return render(
    <>
      <ToasterProvider />
      {ui}
    </>,
  );
}

describe("QuotePageToasts", () => {
  beforeEach(() => {
    cleanup();
    replace.mockClear();
    currentSearchParams = new URLSearchParams();
    window.history.replaceState(null, "", "/admin/quotes");
  });

  it("shows success toasts for created, approved, updated, cancelled, shared, duplicated, and deleted query params", async () => {
    currentSearchParams = new URLSearchParams("created=1&approved=1&updated=1&cancelled=1&shared=1&duplicated=1&deleted=1");
    renderWithToaster(<QuotePageToasts />);

    await waitFor(() => {
      expect(screen.getByText("Cotización en borrador creada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización aceptada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización actualizada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización cancelada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización compartida.")).toBeInTheDocument();
      expect(screen.getByText("Cotización duplicada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización eliminada.")).toBeInTheDocument();
    });
  });

  it("shows an error toast for the error query param", async () => {
    currentSearchParams = new URLSearchParams("error=cannot-delete");
    renderWithToaster(<QuotePageToasts />);

    await waitFor(() => {
      expect(
        screen.getByText("No se puede eliminar la cotización porque tiene actividad vinculada (orden de trabajo o pagos) o no está en un estado eliminable."),
      ).toBeInTheDocument();
    });
  });

  it("cleans all consumed params without navigation while preserving history and unrelated URL state", async () => {
    const historyState = { nextInternal: "preserved" };
    const success = vi.spyOn(toast, "success");
    const error = vi.spyOn(toast, "error");
    const replaceState = vi.spyOn(window.history, "replaceState");
    const search = "created=1&approved=1&updated=1&cancelled=1&shared=1&duplicated=1&deleted=1&error=invalid&page=2&customerId=customer-1";
    currentSearchParams = new URLSearchParams(search);
    window.history.replaceState(historyState, "", `/admin/quotes?${search}#quotes`);
    replaceState.mockClear();

    renderWithToaster(
      <React.StrictMode>
        <QuotePageToasts />
      </React.StrictMode>,
    );

    await waitFor(() => {
      expect(replaceState).toHaveBeenCalledTimes(1);
    });

    expect(replaceState).toHaveBeenCalledWith(
      historyState,
      "",
      "/admin/quotes?page=2&customerId=customer-1#quotes",
    );
    expect(window.history.state).toBe(historyState);
    expect(window.location.pathname).toBe("/admin/quotes");
    expect(window.location.search).toBe("?page=2&customerId=customer-1");
    expect(window.location.hash).toBe("#quotes");
    expect(replace).not.toHaveBeenCalled();
    expect(success.mock.calls).toEqual([
      ["Cotización en borrador creada.", { id: "quote-created" }],
      ["Cotización aceptada.", { id: "quote-approved" }],
      ["Cotización actualizada.", { id: "quote-updated" }],
      ["Cotización cancelada.", { id: "quote-cancelled" }],
      ["Cotización compartida.", { id: "quote-shared" }],
      ["Cotización duplicada.", { id: "quote-duplicated" }],
      ["Cotización eliminada.", { id: "quote-deleted" }],
    ]);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      "Revisa los datos de la cotización e incluye al menos un concepto completo.",
      { id: "quote-error-invalid" },
    );
  });
});
