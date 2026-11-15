import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogDangerZone,
  DialogDescription,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileContent,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
} from "./dialog";
import { Button } from "./button";

const DESKTOP_QUERY = "(min-width: 1024px)";

type RootComponent = React.ComponentType<React.ComponentProps<typeof Dialog>>;

function AnatomyDialog({
  Root = Dialog,
  variant,
  withClose = true,
  onBackgroundClick,
}: {
  Root?: RootComponent;
  variant?: "dialog" | "sheet";
  withClose?: boolean;
  onBackgroundClick?: () => void;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button type="button" onClick={onBackgroundClick}>
        Tarjeta de fondo
      </button>
      <Root open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button type="button">Abrir cliente</button>
        </DialogTrigger>
        <DialogMobileContent variant={variant}>
          <DialogMobileHeader data-testid="dialog-mobile-header">
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription>Datos de contacto</DialogDescription>
            {withClose ? <DialogMobileClose aria-label="Cerrar edición" /> : null}
          </DialogMobileHeader>
          <DialogMobileBody>
            <p>Contenido del formulario</p>
          </DialogMobileBody>
          <DialogMobileFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DialogClose>
            <Button>Guardar</Button>
          </DialogMobileFooter>
        </DialogMobileContent>
      </Root>
    </>
  );
}

function stubMatchMedia(isDesktop: boolean) {
  const matchMedia = vi.fn((query: string) => ({
    matches: isDesktop && query === DESKTOP_QUERY,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, "matchMedia", { configurable: true, writable: true, value: matchMedia });
}

let originalMatchMedia: typeof window.matchMedia | undefined;

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
});

afterEach(() => {
  if (originalMatchMedia) {
    window.matchMedia = originalMatchMedia;
  } else {
    Reflect.deleteProperty(window, "matchMedia");
  }
  vi.restoreAllMocks();
});

describe("DialogMobile anatomy", () => {
  it("keeps the title on the left and one close button as the last control of a 52px header", async () => {
    const user = userEvent.setup();
    render(<AnatomyDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));

    const header = screen.getByTestId("dialog-mobile-header");
    const title = screen.getByRole("heading", { name: "Editar cliente" });
    const controls = within(header).getAllByRole("button");

    expect(header).toHaveClass("shrink-0");
    expect(header).toContainElement(title);
    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAccessibleName("Cerrar edición");
    expect(controls[0].parentElement).toHaveClass("h-[52px]");
    expect(title.compareDocumentPosition(controls[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(controls.at(-1)).toBe(controls[0]);
  });

  it("renders exactly one close button when the consumer does not place one", async () => {
    const user = userEvent.setup();
    render(<AnatomyDialog withClose={false} />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));

    const controls = within(screen.getByTestId("dialog-mobile-header")).getAllByRole("button");
    expect(controls).toHaveLength(1);
    expect(controls[0]).toHaveAccessibleName("Cerrar");
  });

  it("closes from the ✕ and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<AnatomyDialog />);

    const trigger = screen.getByRole("button", { name: "Abrir cliente" });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Cerrar edición" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("keeps the footer outside the scroll body with the secondary action first and the primary last", async () => {
    const user = userEvent.setup();
    render(<AnatomyDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));

    const dialog = screen.getByRole("dialog");
    const body = within(dialog).getByText("Contenido del formulario").parentElement;
    const footer = within(dialog).getByRole("button", { name: "Cancelar" }).parentElement;
    if (!footer) throw new Error("Footer not found");

    expect(footer).toHaveClass("shrink-0", "border-t", "[&>:last-child]:ml-auto");
    expect(footer).not.toHaveClass("overflow-y-auto");
    expect(Array.from(footer.children).map((child) => child.textContent)).toEqual(["Cancelar", "Guardar"]);

    expect(body).toHaveClass("min-h-0", "overflow-y-auto");
    expect(dialog.children).toContain(footer);
    expect(body?.nextElementSibling).toBe(footer);
  });
});

describe("Sheet shapes by width", () => {
  it("shapes the sheet as a bottom sheet below 768px, a 420px right panel from 768px, and drops the overlay from 1024px", async () => {
    const user = userEvent.setup();
    render(<AnatomyDialog Root={Sheet} variant="sheet" />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass(
      "inset-x-0",
      "bottom-0",
      "w-full",
      "rounded-t-[var(--radius-sheet)]",
      "md:inset-y-0",
      "md:right-0",
      "md:left-auto",
      "md:top-0",
      "md:bottom-0",
      "md:w-[420px]",
      "md:rounded-l-[var(--radius-sheet)]",
      "md:rounded-t-none",
    );
    expect(dialog).toHaveClass("shadow-[var(--shadow-md)]");
    expect(dialog).not.toHaveClass("border-[var(--color-border-subtle)]");

    const handle = dialog.querySelector("[data-sheet-handle]");
    expect(handle).toBeInstanceOf(HTMLElement);
    expect(handle).toHaveAttribute("aria-hidden", "true");
    expect(handle).toHaveClass("md:hidden");

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toHaveClass("bg-[var(--color-overlay)]", "lg:hidden");
  });

  it("closes a bottom sheet by tapping the overlay below 1024px", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<AnatomyDialog Root={Sheet} variant="sheet" />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));
    const overlay = document.querySelector("[data-dialog-overlay]");
    if (!(overlay instanceof HTMLElement)) throw new Error("Overlay not found");
    await user.click(overlay);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the page behind interactive from 1024px: the root is non-modal and clicks reach the list", async () => {
    stubMatchMedia(true);
    const user = userEvent.setup();
    const onBackgroundClick = vi.fn();
    render(<AnatomyDialog Root={Sheet} variant="sheet" onBackgroundClick={onBackgroundClick} />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.pointerEvents).not.toBe("none");

    await user.click(screen.getByRole("button", { name: "Tarjeta de fondo" }));
    expect(onBackgroundClick).toHaveBeenCalledTimes(1);
  });

  it("keeps focus trapped and the page inert below 1024px", async () => {
    stubMatchMedia(false);
    const user = userEvent.setup();
    render(<AnatomyDialog Root={Sheet} variant="sheet" />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.pointerEvents).toBe("none");
  });

  it.each([
    ["below 1024px", false],
    ["from 1024px", true],
  ])("closes on Escape %s and returns focus to the trigger", async (_label, isDesktop) => {
    stubMatchMedia(isDesktop);
    const user = userEvent.setup();
    render(<AnatomyDialog Root={Sheet} variant="sheet" />);

    const trigger = screen.getByRole("button", { name: "Abrir cliente" });
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("DialogDangerZone", () => {
  it("places risk actions at the end of the body inside a border-only container", async () => {
    const user = userEvent.setup();
    function DangerDialog() {
      const [open, setOpen] = React.useState(false);
      return (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button type="button">Abrir cliente</button>
          </DialogTrigger>
          <DialogMobileContent>
            <DialogMobileHeader>
              <DialogTitle>Cliente</DialogTitle>
            </DialogMobileHeader>
            <DialogMobileBody>
              <p>Datos</p>
              <DialogDangerZone>
                <Button variant="danger">Eliminar cliente</Button>
              </DialogDangerZone>
            </DialogMobileBody>
          </DialogMobileContent>
        </Dialog>
      );
    }
    render(<DangerDialog />);

    await user.click(screen.getByRole("button", { name: "Abrir cliente" }));

    const zone = screen.getByRole("button", { name: "Eliminar cliente" }).parentElement;
    if (!zone) throw new Error("Danger zone not found");
    expect(zone).toHaveAttribute("data-dialog-danger-zone");
    expect(zone).toHaveClass("border-t");
    expect(zone).not.toHaveClass("shadow-[var(--shadow-card)]");
    expect(screen.getByRole("button", { name: "Eliminar cliente" })).toHaveClass("border");
  });
});
