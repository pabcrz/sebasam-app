import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { formatAmountInWords } from "@/features/quotes/lib/amount-in-words";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/quotes",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const DESKTOP_QUERY = "(min-width: 1024px)";
const customers = [{ id: "1", name: "Acme" }];

/** Desktop (≥ lg) matches the layout query; everything else (including jsdom) is the phone layout. */
function setViewport(desktop: boolean) {
  return vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: desktop && query === DESKTOP_QUERY,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function openFlow(user: User, createAction = vi.fn()) {
  render(<QuoteBuilderDialog customers={customers} createAction={createAction} />);
  await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
}

async function fillClientStep(user: User) {
  await user.click(screen.getByRole("combobox", { name: "Cliente" }));
  await user.click(await screen.findByRole("option", { name: "Acme" }));
  await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "ABC123");
  await user.type(screen.getByRole("textbox", { name: "Modelo (opcional)" }), "Transit");
}

async function fillItemsStep(user: User) {
  await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de frenos");
  await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "1250");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("quote builder desktop flow (≥ 1024px)", () => {
  it("shows the four steps in one row above the work, each with a dot, name and one-line summary", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openFlow(user);
    await fillClientStep(user);

    const progress = screen.getByRole("navigation", { name: "Pasos de cotización" });
    const steps = within(progress).getAllByRole("button");
    expect(steps).toHaveLength(4);
    expect(within(progress).getByText("Acme · ABC123 · Transit")).toBeInTheDocument();
    expect(within(steps[1]).getByText("2")).toBeInTheDocument();
    // Step 1 is complete (client and unit identified), so it shows a green ✓ while still current.
    expect(within(steps[0]).getByText("✓")).toBeInTheDocument();
  });

  it("puts ← Cotizaciones in the top bar and asks before leaving when data was captured, like ✕", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openFlow(user);
    await fillClientStep(user);

    const top = screen.getByTestId("multi-step-dialog-header");
    await user.click(within(top).getByRole("button", { name: "← Cotizaciones" }));

    expect(await screen.findByText("¿Descartar la cotización?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByRole("heading", { name: "Nueva cotización" })).toBeInTheDocument();
  });

  it("closes at once from ← Cotizaciones when nothing was captured", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openFlow(user);

    await user.click(within(screen.getByTestId("multi-step-dialog-header")).getByRole("button", { name: "← Cotizaciones" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Nueva cotización" })).not.toBeInTheDocument());
  });

  it("keeps the unit line, the tax switch and the discount in the summary column, each rendered once", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openFlow(user);
    await fillClientStep(user);

    const summary = screen.getByTestId("quote-builder-summary");
    expect(within(summary).getByText("ABC123 · Transit")).toBeInTheDocument();
    expect(within(summary).getByRole("switch", { name: "Incluir IVA (16%)" })).toBeInTheDocument();
    expect(within(summary).getByRole("spinbutton", { name: "Descuento (opcional)" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("Descuento (opcional)")).toHaveLength(1);
    expect(screen.getAllByRole("switch", { name: "Incluir IVA (16%)" })).toHaveLength(1);
  });

  it("shows subtotal, IVA and total in the summary, with the total in words under it", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openFlow(user);
    await fillClientStep(user);
    await user.click(within(screen.getByTestId("quote-builder-summary")).getByRole("button", { name: "Conceptos →" }));
    await fillItemsStep(user);

    const summary = screen.getByTestId("quote-builder-summary");
    expect(within(summary).getByTestId("quote-subtotal")).toHaveTextContent("$1,250.00");
    expect(within(summary).getByTestId("quote-tax")).toHaveTextContent("$200.00");
    expect(within(summary).getByTestId("quote-total")).toHaveTextContent("$1,450.00");
    expect(within(summary).getByTestId("quote-total-in-words")).toHaveTextContent(formatAmountInWords(145_000));
  });

  it("has no full-width bottom bar on desktop: the primary action lives in the summary column", async () => {
    setViewport(true);
    const user = userEvent.setup();
    await openFlow(user);

    const footer = screen.getByTestId("multi-step-dialog-footer");
    expect(within(footer).queryAllByRole("button")).toHaveLength(0);
    expect(within(screen.getByTestId("quote-builder-summary")).getByRole("button", { name: "Conceptos →" })).toBeInTheDocument();
  });

  it("lists readiness on the last step and creates the quote from the summary column", async () => {
    setViewport(true);
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({});
    await openFlow(user, action);
    await fillClientStep(user);
    const summary = screen.getByTestId("quote-builder-summary");
    await user.click(within(summary).getByRole("button", { name: "Conceptos →" }));
    await fillItemsStep(user);
    await user.click(within(summary).getByRole("button", { name: "Notas →" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Servicio general");
    await user.click(within(summary).getByRole("button", { name: "Vista previa →" }));

    expect(within(summary).getByText("Antes de crear")).toBeInTheDocument();
    expect(within(summary).getByText("Cliente y unidad completos")).toBeInTheDocument();
    expect(within(summary).getByText("Todos los conceptos tienen precio")).toBeInTheDocument();
    expect(within(summary).getByText("Vigencia de 7 días")).toBeInTheDocument();

    await user.click(within(summary).getByRole("button", { name: "Crear cotización" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][1] as FormData;
    expect(formData.get("taxEnabled")).toBe("on");
    expect(formData.get("discount")).toBe("");
  });

  it("keeps the discount submitted with the form when it lives in the summary column", async () => {
    setViewport(true);
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({});
    await openFlow(user, action);
    await fillClientStep(user);
    const summary = screen.getByTestId("quote-builder-summary");
    await user.click(within(summary).getByRole("button", { name: "Conceptos →" }));
    await fillItemsStep(user);
    await user.type(within(summary).getByRole("spinbutton", { name: "Descuento (opcional)" }), "100");
    await user.click(within(summary).getByRole("button", { name: "Notas →" }));
    await user.type(screen.getByRole("textbox", { name: "Título" }), "Servicio general");
    await user.click(within(summary).getByRole("button", { name: "Vista previa →" }));
    await user.click(within(summary).getByRole("button", { name: "Crear cotización" }));

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    const formData = action.mock.calls[0][1] as FormData;
    expect(formData.get("discount")).toBe("100");
    expect(formData.get("taxEnabled")).toBe("on");
  });

  it("keeps the phone layout: bottom bar with the next step, and no summary column", async () => {
    setViewport(false);
    const user = userEvent.setup();
    await openFlow(user);

    expect(screen.queryByTestId("quote-builder-summary")).not.toBeInTheDocument();
    const footer = screen.getByTestId("multi-step-dialog-footer");
    expect(within(footer).getByRole("button", { name: "Conceptos →" })).toBeInTheDocument();
  });
});
