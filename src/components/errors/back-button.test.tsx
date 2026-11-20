import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackButton } from "./back-button";

describe("BackButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays hidden when the visitor arrived directly with no history", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);

    render(<BackButton />);

    expect(screen.queryByRole("button", { name: "Regresar" })).not.toBeInTheDocument();
  });

  it("goes back in history when there is somewhere to return to", async () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});

    render(<BackButton />);
    await userEvent.click(screen.getByRole("button", { name: "Regresar" }));

    expect(back).toHaveBeenCalledTimes(1);
  });
});
