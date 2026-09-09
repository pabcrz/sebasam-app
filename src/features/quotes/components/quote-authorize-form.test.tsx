import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteAuthorizeForm } from "./quote-authorize-form";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("QuoteAuthorizeForm", () => {
  beforeEach(() => {
    if (!window.localStorage) {
      const store = new Map<string, string>();
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => store.set(key, String(value)),
          removeItem: (key: string) => store.delete(key),
          clear: () => store.clear(),
        },
        writable: true,
        configurable: true,
      });
    }
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("relies on action revalidation instead of issuing a second route refresh", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue({ success: true });
    render(<QuoteAuthorizeForm action={action} quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: "Autorizar cotización C-001" }));
    expect(screen.getByRole("button", { name: "Cerrar autorización de cotización" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("overflow-hidden");
    await user.click(screen.getByRole("combobox", { name: "Medio de confirmación *" }));
    await user.click(screen.getByRole("option", { name: "Llamada telefónica" }));
    await user.click(screen.getByRole("button", { name: "Autorizar cotización" }));

    await waitFor(() => expect(action).toHaveBeenCalledWith("Llamada telefónica", undefined));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });

  it("logs an opt-in client action round trip without action arguments", async () => {
    const user = userEvent.setup();
    const sensitiveNote = "private customer authorization detail";
    const action = vi.fn().mockResolvedValue({ success: true });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    window.localStorage?.setItem?.("SEBASAM_PERF_TIMINGS", "1");
    render(<QuoteAuthorizeForm action={action} quoteNumber="C-001" />);

    await user.click(screen.getByRole("button", { name: "Autorizar cotización C-001" }));
    await user.click(screen.getByRole("combobox", { name: "Medio de confirmación *" }));
    await user.click(screen.getByRole("option", { name: "Llamada telefónica" }));
    await user.type(screen.getByRole("textbox", { name: /detalles u observaciones/i }), sensitiveNote);
    await user.click(screen.getByRole("button", { name: "Autorizar cotización" }));

    await waitFor(() => expect(info).toHaveBeenCalledWith("[client-timing]", {
      stage: "client",
      operation: "quote.authorize.action-round-trip",
      durationMs: expect.any(Number),
      outcome: "success",
    }));
    expect(action).toHaveBeenCalledWith(`Llamada telefónica - ${sensitiveNote}`, undefined);
    expect(JSON.stringify(info.mock.calls)).not.toContain(sensitiveNote);
  });
});
