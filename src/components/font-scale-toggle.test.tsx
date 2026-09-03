import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FontScaleProvider } from "./font-scale-provider";
import { FontScaleToggle } from "./font-scale-toggle";

function renderWithFontScale() {
  return render(
    <FontScaleProvider>
      <FontScaleToggle />
    </FontScaleProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-font-scale");
});

describe("FontScaleToggle", () => {
  it("switches to large font scale and persists the choice", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sebasam-font-scale", "normal");
    renderWithFontScale();

    const button = await screen.findByRole("button", { name: "Aumentar tamaño de texto a grande" });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-font-scale")).toBe("large");
      expect(localStorage.getItem("sebasam-font-scale")).toBe("large");
    });
  });

  it("switches back to normal font scale and persists the choice", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sebasam-font-scale", "large");
    renderWithFontScale();

    await waitFor(() => expect(document.documentElement.getAttribute("data-font-scale")).toBe("large"));
    const button = await screen.findByRole("button", { name: "Restablecer tamaño de texto a normal" });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-font-scale")).toBeNull();
      expect(localStorage.getItem("sebasam-font-scale")).toBe("normal");
    });
  });
});
