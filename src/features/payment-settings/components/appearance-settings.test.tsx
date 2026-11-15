import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/theme-provider";
import { FontScaleProvider } from "@/components/font-scale-provider";
import { AppearanceSettings } from "./appearance-settings";

function renderAppearance() {
  return render(
    <ThemeProvider>
      <FontScaleProvider>
        <AppearanceSettings />
      </FontScaleProvider>
    </ThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-font-scale");
});

describe("AppearanceSettings", () => {
  it("switches the theme immediately and remembers it on this device", async () => {
    const user = userEvent.setup();
    renderAppearance();

    await user.click(await screen.findByRole("button", { name: "Oscuro" }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("sebasam-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Oscuro" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Claro" }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("sebasam-theme")).toBe("light");
  });

  it("switches the text size immediately and remembers it on this device", async () => {
    const user = userEvent.setup();
    renderAppearance();

    await user.click(await screen.findByRole("button", { name: "Grande" }));

    expect(document.documentElement.getAttribute("data-font-scale")).toBe("large");
    expect(localStorage.getItem("sebasam-font-scale")).toBe("large");
    expect(screen.getByRole("button", { name: "Grande" })).toHaveAttribute("aria-pressed", "true");
  });

  it("has no change bar, because appearance is applied on this device, not saved", async () => {
    const user = userEvent.setup();
    renderAppearance();

    await user.click(await screen.findByRole("button", { name: "Oscuro" }));

    expect(screen.queryByRole("region", { name: "Cambios sin guardar" })).not.toBeInTheDocument();
  });
});
