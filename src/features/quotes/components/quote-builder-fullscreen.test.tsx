import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminShell } from "@/components/layout/admin-shell";
import { QuoteBuilderDialog } from "./quote-builder-dialog";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/quotes",
  useRouter: () => ({ refresh, push: vi.fn() }),
}));

vi.mock("@/features/auth/actions", () => ({ logoutAdmin: vi.fn() }));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: ({ className }: { className?: string }) => <button type="button" className={className}>Theme</button>,
}));

vi.mock("@/components/font-scale-toggle", () => ({
  FontScaleToggle: ({ className }: { className?: string }) => <button type="button" className={className}>FontScale</button>,
}));

const customers = [{ id: "1", name: "Acme" }];

type User = ReturnType<typeof userEvent.setup>;

function renderFlow() {
  return render(<QuoteBuilderDialog customers={customers} createAction={vi.fn()} />);
}

async function openFlow(user: User) {
  await user.click(screen.getByRole("button", { name: "Nueva cotización" }));
}

async function fillClientStep(user: User) {
  await user.click(screen.getByRole("combobox", { name: "Cliente" }));
  await user.click(await screen.findByRole("option", { name: "Acme" }));
  await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "ABC123");
  await user.type(screen.getByRole("textbox", { name: "Marca (opcional)" }), "Ford");
  await user.type(screen.getByRole("textbox", { name: "Modelo (opcional)" }), "Transit");
}

async function fillItemsStep(user: User) {
  await user.type(screen.getByLabelText("Descripción", { selector: "input" }), "Cambio de frenos");
  await user.type(screen.getByRole("spinbutton", { name: "Precio unitario" }), "1250");
}

describe("quote builder full-screen flow", () => {
  it("shows the four steps as a progress bar with the current step marked", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    const progress = screen.getByRole("navigation", { name: "Pasos de cotización" });
    expect(within(progress).getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual([
      "Paso 1: Cliente y unidad",
      "Paso 2: Conceptos",
      "Paso 3: Notas",
      "Paso 4: Vista previa",
    ]);
    expect(screen.getByRole("button", { name: "Paso 1: Cliente y unidad" })).toHaveAttribute("aria-current", "step");
  });

  it("places ← before the title and ✕ after it in the top bar", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    const top = screen.getByTestId("multi-step-dialog-header");
    const back = within(top).getByRole("button", { name: "Paso anterior" });
    expect(back).toBeDisabled();
    const title = within(top).getByRole("heading", { name: "Nueva cotización" });
    const close = within(top).getByRole("button", { name: "Cerrar" });

    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("uses ← as the previous-step action after the first step", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);
    await fillClientStep(user);
    await user.click(screen.getByRole("button", { name: "Conceptos →" }));

    const top = screen.getByTestId("multi-step-dialog-header");
    await user.click(within(top).getByRole("button", { name: "Paso anterior" }));

    expect(screen.getByRole("button", { name: "Paso 1: Cliente y unidad" })).toHaveAttribute("aria-current", "step");
  });

  it("shows the step context and the next-step action in the bottom bar", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    const footer = screen.getByTestId("multi-step-dialog-footer");
    expect(within(footer).getByText("Cliente y unidad")).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Conceptos →" })).toBeInTheDocument();

    await fillClientStep(user);
    await user.click(within(footer).getByRole("button", { name: "Conceptos →" }));
    expect(within(footer).getByText(/^Total/)).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Notas →" })).toBeInTheDocument();

    await fillItemsStep(user);
    await user.click(within(footer).getByRole("button", { name: "Notas →" }));
    expect(within(footer).getByText(/^Total/)).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Vista previa →" })).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Título" }), "Servicio general");
    await user.click(within(footer).getByRole("button", { name: "Vista previa →" }));
    expect(within(footer).getByText("Vista previa")).toBeInTheDocument();
    expect(within(footer).getByRole("button", { name: "Crear cotización" })).toHaveAttribute("type", "submit");
  });

  it("asks before leaving through ✕ or ← when data was captured, and closes at once when clean", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog", { name: "¿Descartar la cotización?" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Nueva cotización" })).not.toBeInTheDocument();

    await openFlow(user);
    await user.type(screen.getByRole("textbox", { name: "Placas (opcional)" }), "A");
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(screen.getByRole("textbox", { name: "Placas (opcional)" })).toHaveValue("A");

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.getByRole("dialog", { name: "¿Descartar la cotización?" })).toBeInTheDocument();
  });

  it("hides the admin bottom bar and desktop rail while the flow is open and restores them after", async () => {
    const user = userEvent.setup();
    render(
      <AdminShell displayName="Admin User" role="admin">
        <QuoteBuilderDialog customers={customers} createAction={vi.fn()} />
      </AdminShell>,
    );
    const bottomBar = () => document.querySelector('nav[aria-label="Navegación móvil"]');
    const rail = () => document.querySelector("[data-admin-rail]");

    expect(bottomBar()).toBeVisible();
    expect(rail()).not.toBeNull();

    await openFlow(user);
    expect(bottomBar()).not.toBeVisible();
    expect(rail()).toBeNull();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(bottomBar()).toBeVisible();
    expect(rail()).not.toBeNull();
  });
  it("titles the flow with the step number and name as a subtitle", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    const top = screen.getByTestId("multi-step-dialog-header");
    expect(within(top).getByText("Paso 1 de 4 · Cliente y unidad")).toBeInTheDocument();

    await fillClientStep(user);
    await user.click(screen.getByRole("button", { name: "Conceptos →" }));
    expect(within(top).getByText("Paso 2 de 4 · Conceptos")).toBeInTheDocument();
  });

  it("shows the step number on the client step and the total with IVA on the items step", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    const footer = screen.getByTestId("multi-step-dialog-footer");
    expect(within(footer).getByText("Paso 1 de 4")).toBeInTheDocument();

    await fillClientStep(user);
    await user.click(within(footer).getByRole("button", { name: "Conceptos →" }));
    expect(within(footer).getByText("Total con IVA")).toBeInTheDocument();
    expect(within(footer).getByTestId("quote-builder-footer-total")).toHaveClass("text-[22px]", "font-bold", "text-[var(--color-amount)]");

    await user.click(screen.getByRole("switch", { name: "Incluir IVA (16%)" }));
    expect(within(footer).getByText("Total")).toBeInTheDocument();
    expect(within(footer).queryByText("Total con IVA")).not.toBeInTheDocument();
  });

  it("uses the blue page background for the flow body", async () => {
    const user = userEvent.setup();
    renderFlow();
    await openFlow(user);

    expect(screen.getByTestId("multi-step-dialog-body")).toHaveClass("bg-[var(--background)]");
  });
});
