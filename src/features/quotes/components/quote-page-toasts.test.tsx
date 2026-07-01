import * as React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { ToasterProvider } from "@/components/ui/toaster";
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
  });

  it("shows success toasts for created, approved, updated and cancelled query params", async () => {
    currentSearchParams = new URLSearchParams("created=1&approved=1&updated=1&cancelled=1");
    renderWithToaster(<QuotePageToasts />);

    await waitFor(() => {
      expect(screen.getByText("Cotización en borrador creada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización aprobada y orden de trabajo creada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización actualizada.")).toBeInTheDocument();
      expect(screen.getByText("Cotización cancelada.")).toBeInTheDocument();
    });
  });

  it("shows an error toast for the error query param", async () => {
    currentSearchParams = new URLSearchParams("error=invalid");
    renderWithToaster(<QuotePageToasts />);

    await waitFor(() => {
      expect(
        screen.getByText("Revisa los datos de la cotización e incluye al menos un concepto completo."),
      ).toBeInTheDocument();
    });
  });

  it("replaces the URL without the consumed query params", async () => {
    currentSearchParams = new URLSearchParams("created=1&error=invalid");
    renderWithToaster(<QuotePageToasts />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/admin/quotes", { scroll: false });
    });
  });
});
