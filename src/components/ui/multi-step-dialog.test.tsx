import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { MultiStepDialog, type MultiStepDialogProps } from "./multi-step-dialog";

function TestMultiStepDialog(props: Partial<MultiStepDialogProps>) {
  const [open, setOpen] = React.useState(false);
  const { onOpenChange: onOpenChangeProp, ...rest } = props;
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    onOpenChangeProp?.(nextOpen);
  };
  return (
    <MultiStepDialog
      {...rest}
      open={open}
      onOpenChange={handleOpenChange}
      title="Nueva cotización"
      trigger={<button type="button">Abrir</button>}
      header={<p>Header extra</p>}
      stepper={<nav aria-label="Pasos">Paso 1 de 2</nav>}
      body={
        <div data-testid="body-content">
          <p>Contenido del paso</p>
        </div>
      }
      footer={<button type="button">Guardar</button>}
    />
  );
}

describe("MultiStepDialog", () => {
  it("opens via the trigger and closes pristine content immediately", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<TestMultiStepDialog onOpenChange={onOpenChange} />);

    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Nueva cotización" });
    expect(dialog).toHaveAttribute("data-state", "open");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("renders the canonical fullscreen mobile and centered desktop shell by default", async () => {
    const user = userEvent.setup();
    render(<TestMultiStepDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva cotización" });
    expect(dialog).toHaveClass(
      "!inset-0",
      "!h-dvh",
      "!max-h-none",
      "!w-screen",
      "!max-w-none",
      "!translate-x-0",
      "!translate-y-0",
      "!rounded-none",
      "sm:!h-[min(90dvh,52rem)]",
      "sm:!max-h-[min(90dvh,52rem)]",
      "sm:!w-[min(92vw,64rem)]",
      "sm:!max-w-5xl",
      "sm:!rounded-[var(--radius-lg)]",
    );
  });

  it("closes on Escape and on backdrop click when pristine, returning focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<TestMultiStepDialog />);

    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Nueva cotización" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toBeInstanceOf(HTMLElement);
    if (overlay instanceof HTMLElement) {
      await user.click(overlay);
    }
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("restores focus to the trigger after closing via the close button", async () => {
    const user = userEvent.setup();
    render(<TestMultiStepDialog />);

    const trigger = screen.getByRole("button", { name: "Abrir" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("locks dismissal while pending and unlocks once pending clears", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<TestMultiStepDialog pending onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva cotización" });

    const closeButton = screen.getByRole("button", { name: "Cerrar" });
    expect(closeButton).toBeDisabled();

    await user.click(closeButton);
    expect(dialog).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(dialog).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    if (overlay instanceof HTMLElement) {
      await user.click(overlay);
    }
    expect(dialog).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    rerender(<TestMultiStepDialog pending={false} onOpenChange={onOpenChange} />);
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("asks for discard confirmation when dirty, restores focus on cancel, and discards on confirm", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onDiscard = vi.fn();
    render(<TestMultiStepDialog dirty onDiscard={onDiscard} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const closeButton = screen.getByRole("button", { name: "Cerrar" });
    await user.click(closeButton);

    const confirmation = screen.getByRole("dialog", { name: "¿Descartar los cambios?" });
    expect(confirmation).toBeInTheDocument();
    expect(screen.getByText("Se perderá el progreso no guardado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Seguir editando" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeInTheDocument();
    // The builder dialog stays mounted and open under the discard confirm, but
    // Radix hides it from the accessibility tree (aria-hidden), so an aria-hidden
    // node computes an empty accessible name. Assert against the second dialog by
    // identity and its data-state instead of the inaccessible name.
    const underlyingDialog = screen
      .getAllByRole("dialog", { hidden: true })
      .find((dialog) => dialog !== confirmation);
    expect(underlyingDialog).toBeDefined();
    expect(underlyingDialog).toHaveAttribute("data-state", "open");
    expect(confirmation).toContainElement(document.activeElement as HTMLElement);
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Seguir editando" }));
    await waitFor(() => expect(closeButton).toHaveFocus());
    expect(screen.queryByRole("dialog", { name: "¿Descartar los cambios?" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nueva cotización" })).toHaveAttribute("data-state", "open");
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(closeButton);
    await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Nueva cotización" })).not.toBeInTheDocument(),
    );
    expect(onDiscard).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("keeps header and stepper fixed, scrolls the body, and pins the footer outside the scroll area", async () => {
    const user = userEvent.setup();
    render(<TestMultiStepDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva cotización" });

    const dialogStyle = getComputedStyle(dialog);
    expect(dialogStyle.display).toBe("flex");
    expect(dialogStyle.flexDirection).toBe("column");
    expect(dialogStyle.alignItems).toBe("stretch");
    expect(dialogStyle.justifyContent).toBe("flex-start");
    expect(dialogStyle.overflow).toBe("hidden");

    const header = screen.getByTestId("multi-step-dialog-header");
    const stepper = screen.getByTestId("multi-step-dialog-stepper");
    const body = screen.getByTestId("multi-step-dialog-body");
    const footer = screen.getByTestId("multi-step-dialog-footer");
    expect(Array.from(dialog.children)).toEqual([header, stepper, body, footer]);

    for (const region of [header, stepper, footer]) {
      const style = getComputedStyle(region);
      expect(style.flexShrink).toBe("0");
      expect(style.overflowY).not.toBe("auto");
    }
    expect(header).toContainElement(screen.getByRole("heading", { name: "Nueva cotización" }));
    expect(stepper).toHaveTextContent("Paso 1 de 2");

    const bodyStyle = getComputedStyle(body);
    expect(bodyStyle.flexGrow).toBe("1");
    expect(bodyStyle.flexShrink).toBe("1");
    expect(bodyStyle.minHeight).toBe("0px");
    expect(bodyStyle.minWidth).toBe("0px");
    expect(bodyStyle.overflowY).toBe("auto");
    expect(bodyStyle.overscrollBehaviorY).toBe("contain");

    expect(footer).toHaveClass("border-t", "shrink-0");
    expect(getComputedStyle(footer).minWidth).toBe("0px");
    expect(footer).toContainElement(screen.getByRole("button", { name: "Guardar" }));
  });

  it("keeps footer slot children available as separate flex items", () => {
    const previous = <button type="button">Anterior</button>;
    const next = <button type="button">Siguiente</button>;

    render(
      <MultiStepDialog
        open
        onOpenChange={vi.fn()}
        title="New quote"
        body={<div>Content</div>}
        footer={
          <div data-testid="footer-slot-host" className="contents">
            <div className="flex items-center gap-2">{previous}</div>
            {next}
          </div>
        }
      />,
    );

    const footer = screen.getByTestId("multi-step-dialog-footer");
    const host = screen.getByTestId("footer-slot-host");
    const previousButton = screen.getByRole("button", { name: "Anterior" });
    const nextButton = screen.getByRole("button", { name: "Siguiente" });

    expect(footer).toHaveClass("flex", "min-w-0", "flex-wrap", "justify-between", "gap-3");
    expect(host).toHaveClass("contents");
    expect(host.parentElement).toBe(footer);
    expect(host).toContainElement(previousButton);
    expect(host).toContainElement(nextButton);
    expect(previousButton.parentElement).not.toBe(host);
    expect(nextButton.parentElement).toBe(host);
  });

  it("does not open the discard confirmation while pending, even when dirty", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(<TestMultiStepDialog pending dirty onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog", { name: "¿Descartar los cambios?" })).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "¿Descartar los cambios?" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nueva cotización" })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    rerender(<TestMultiStepDialog pending={false} dirty onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.getByRole("dialog", { name: "¿Descartar los cambios?" })).toBeInTheDocument();
  });

  it("puts ← on the left and ✕ last in a 52px bar when a multi-step flow passes onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<TestMultiStepDialog onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const bar = screen.getByTestId("multi-step-dialog-bar");
    const controls = within(bar).getAllByRole("button");

    expect(bar).toHaveClass("h-[52px]");
    expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual(["Volver", "Cerrar"]);
    expect(bar).toContainElement(screen.getByRole("heading", { name: "Nueva cotización" }));

    await user.click(within(bar).getByRole("button", { name: "Volver" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog", { name: "Nueva cotización" })).toHaveAttribute("data-state", "open");
  });

  it("renders only the ✕ in the bar when no onBack is passed", async () => {
    const user = userEvent.setup();
    render(<TestMultiStepDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const controls = within(screen.getByTestId("multi-step-dialog-bar")).getAllByRole("button");

    expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual(["Cerrar"]);
  });

  it("orders footer actions with the secondary first and the primary last, pushed right", () => {
    render(
      <MultiStepDialog
        open
        onOpenChange={vi.fn()}
        title="Nueva cotización"
        body={<div>Contenido</div>}
        footer={
          <>
            <button type="button">Anterior</button>
            <button type="button">Siguiente</button>
          </>
        }
      />,
    );

    const footer = screen.getByTestId("multi-step-dialog-footer");

    expect(Array.from(footer.children).map((child) => child.textContent)).toEqual(["Anterior", "Siguiente"]);
    expect(footer).toHaveClass("[&>:last-child]:ml-auto");
  });
});
