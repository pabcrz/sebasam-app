import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  DialogContent,
  DialogMobileBody,
  DialogMobileClose,
  DialogMobileFooter,
  DialogMobileHeader,
  DialogTitle,
  DialogTrigger,
  Sheet,
} from "./dialog";
import { Button } from "./button";

function LongSheet() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button">Abrir vista</button>
      </DialogTrigger>
      <DialogContent variant="sheet">
        <DialogMobileHeader>
          <DialogTitle>Vista previa</DialogTitle>
          <DialogMobileClose />
        </DialogMobileHeader>
        <DialogMobileBody data-testid="sheet-body">
          <div style={{ height: 3000 }}>Documento largo</div>
        </DialogMobileBody>
        <DialogMobileFooter>
          <Button>Cerrar</Button>
        </DialogMobileFooter>
      </DialogContent>
    </Sheet>
  );
}

describe("sheet scroll and motion", () => {
  it("gives the body the height left between the fixed header and footer", async () => {
    const user = userEvent.setup();
    render(<LongSheet />);
    await user.click(screen.getByRole("button", { name: "Abrir vista" }));

    const dialog = screen.getByRole("dialog");
    const body = screen.getByTestId("sheet-body");
    expect(dialog).toHaveClass("grid-rows-[auto_minmax(0,1fr)_auto]");
    expect(body).toHaveClass("min-h-0", "overflow-y-auto");
  });

  it("makes the body the only element that scrolls inside the sheet", async () => {
    const user = userEvent.setup();
    render(<LongSheet />);
    await user.click(screen.getByRole("button", { name: "Abrir vista" }));

    const scrollers = Array.from(screen.getByRole("dialog").querySelectorAll(".overflow-y-auto"));
    expect(scrollers).toEqual([screen.getByTestId("sheet-body")]);
  });

  it("slides the mobile sheet up with the motion utility; the utility itself turns the motion off under reduced motion", async () => {
    const user = userEvent.setup();
    render(<LongSheet />);
    await user.click(screen.getByRole("button", { name: "Abrir vista" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("max-md:data-[state=open]:animate-bottom-sheet");
  });
});
