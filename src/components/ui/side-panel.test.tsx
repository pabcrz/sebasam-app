import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  DialogContent,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileHeader,
  DialogTitle,
  Sheet,
} from "./dialog";

const originalMatchMedia = window.matchMedia;

function setViewport(viewport: "desktop" | "phone") {
  window.matchMedia = ((query: string) => ({
    matches: viewport === "desktop" && query === "(min-width: 1024px)",
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  })) as unknown as typeof window.matchMedia;
}

function PanelHarness({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = React.useState(true);

  return (
    <>
      <button type="button">Lista</button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next);
          setOpen(next);
        }}
      >
        <DialogContent variant="sheet">
          <DialogMobileHeader>
            <DialogTitle>Panel</DialogTitle>
            <DialogMobileClose />
          </DialogMobileHeader>
          <DialogMobileBody>Contenido</DialogMobileBody>
        </DialogContent>
      </Sheet>
    </>
  );
}

describe("desktop side panel (1024px and up)", () => {
  beforeEach(() => setViewport("desktop"));
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.removeAttribute("data-side-panel-open");
  });

  it("marks the document while the panel is open and clears the mark when it closes", async () => {
    const user = userEvent.setup();
    render(<PanelHarness onOpenChange={vi.fn()} />);

    expect(document.documentElement).toHaveAttribute("data-side-panel-open");

    await user.keyboard("{Escape}");

    expect(document.documentElement).not.toHaveAttribute("data-side-panel-open");
  });

  it("does not dismiss on an outside press, so the list beside it stays usable", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<PanelHarness onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Lista" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

describe("phone and tablet sheet (below 1024px)", () => {
  beforeEach(() => setViewport("phone"));
  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.documentElement.removeAttribute("data-side-panel-open");
  });

  it("stays a modal sheet: no side-panel mark, and an overlay press closes it", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<PanelHarness onOpenChange={onOpenChange} />);

    expect(document.documentElement).not.toHaveAttribute("data-side-panel-open");

    await user.click(document.querySelector("[data-dialog-overlay]") as HTMLElement);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
