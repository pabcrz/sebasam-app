import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function SimpleTestDialog({ disablePlatformDismiss }: { disablePlatformDismiss?: boolean }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" onClick={() => setOpen(true)}>
          Open simple dialog
        </button>
      </DialogTrigger>
      <DialogContent disablePlatformDismiss={disablePlatformDismiss}>
        <DialogTitle>Simple Dialog</DialogTitle>
        <DialogClose asChild>
          <button type="button">Close simple dialog</button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function TestDialog({ onInteractOutside }: Pick<React.ComponentPropsWithoutRef<typeof DialogContent>, "onInteractOutside">) {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" onClick={() => setOpen(true)}>
          Open dialog
        </button>
      </DialogTrigger>
      <DialogContent onInteractOutside={onInteractOutside}>
        <DialogTitle>Test dialog</DialogTitle>
        <Select>
          <SelectTrigger aria-label="Choose">
            <SelectValue placeholder="Pick one" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">Option A</SelectItem>
          </SelectContent>
        </Select>
      </DialogContent>
    </Dialog>
  );
}

describe("DialogContent", () => {
  it("renders the portaled SelectContent with the select-content marker", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.click(screen.getByRole("combobox", { name: "Choose" }));

    const selectContent = await waitFor(() => {
      const element = document.querySelector("[data-select-content]");
      if (!element) throw new Error("Select content not found");
      return element;
    });
    expect(selectContent).toBeInTheDocument();
  });

  it("keeps the dialog open when a portaled Select item is selected", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Choose" }));
    const option = await screen.findByRole("option", { name: "Option A" });
    await user.click(option);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("combobox", { name: "Choose" })).toHaveTextContent("Option A");
    expect(screen.queryByRole("option", { name: "Option A" })).not.toBeInTheDocument();
  });

  it("closes only an open Select on the first outside interaction and the dialog on the second", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.click(screen.getByRole("combobox", { name: "Choose" }));
    expect(await screen.findByRole("option", { name: "Option A" })).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toBeInstanceOf(HTMLElement);
    if (!(overlay instanceof HTMLElement)) throw new Error("Dialog overlay not found");

    await user.click(overlay);
    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Option A" })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(overlay);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("does not report the Select-closing interaction to the Dialog consumer", async () => {
    const user = userEvent.setup();
    const onInteractOutside = vi.fn();
    render(<TestDialog onInteractOutside={onInteractOutside} />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.click(screen.getByRole("combobox", { name: "Choose" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).toBeInstanceOf(HTMLElement);
    if (!(overlay instanceof HTMLElement)) throw new Error("Dialog overlay not found");

    // Select and Dialog share one Radix layer stack, so the open Select is the
    // top layer and owns this outside interaction.
    await user.click(overlay);
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    expect(onInteractOutside).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the dialog when clicking the overlay", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);

    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = document.querySelector("[data-dialog-overlay]");
    expect(overlay).not.toBeNull();
    // Click the overlay element that sits behind the dialog content.
    if (overlay instanceof HTMLElement) {
      await user.click(overlay);
    }

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Platform back dismiss", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("closes the dialog when CloseWatcher emits onclose", async () => {
      const destroyMock = vi.fn();
      let watcherInstance: { onclose?: () => void; destroy: typeof destroyMock } | null = null;
      class MockCloseWatcher {
        onclose?: () => void;
        destroy = destroyMock;
      }
      function MockCloseWatcherConstructor() {
        const instance = new MockCloseWatcher();
        watcherInstance = instance;
        return instance;
      }

      vi.stubGlobal("CloseWatcher", MockCloseWatcherConstructor);

      const user = userEvent.setup();
      render(<SimpleTestDialog />);

      await user.click(screen.getByRole("button", { name: "Open simple dialog" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(watcherInstance).not.toBeNull();

      await React.act(async () => {
        watcherInstance?.onclose?.();
      });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });
      await waitFor(() => {
        expect(destroyMock).toHaveBeenCalled();
      });
    });

    it("closes the dialog and does not trigger extra history.back when popstate fires (fallback mode)", async () => {
      const pushStateSpy = vi.spyOn(window.history, "pushState");
      const backSpy = vi.spyOn(window.history, "back");

      const user = userEvent.setup();
      render(<SimpleTestDialog />);

      await user.click(screen.getByRole("button", { name: "Open simple dialog" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(pushStateSpy).toHaveBeenCalled();

      await React.act(async () => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      await waitFor(() => {
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      });

      expect(backSpy).not.toHaveBeenCalled();
    });

    it("pops the pushed history state when dialog is closed via UI close button (fallback mode)", async () => {
      const backSpy = vi.spyOn(window.history, "back").mockImplementation(() => {});

      const user = userEvent.setup();
      const { unmount } = render(<SimpleTestDialog />);

      await user.click(screen.getByRole("button", { name: "Open simple dialog" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      unmount();

      expect(backSpy).toHaveBeenCalledTimes(1);
    });

    it("does not push history state or register dismiss when disablePlatformDismiss is true", async () => {
      const pushStateSpy = vi.spyOn(window.history, "pushState");

      const user = userEvent.setup();
      render(<SimpleTestDialog disablePlatformDismiss />);

      await user.click(screen.getByRole("button", { name: "Open simple dialog" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      expect(pushStateSpy).not.toHaveBeenCalled();
    });
  });
});
