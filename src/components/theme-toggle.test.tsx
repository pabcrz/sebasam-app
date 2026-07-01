import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

afterEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.style.colorScheme = "";
});

describe("ThemeToggle", () => {
  it("switches to dark mode and persists the choice", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sebasam-theme", "light");
    renderWithTheme();

    const button = await screen.findByRole("button", { name: "Cambiar a modo oscuro" });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem("sebasam-theme")).toBe("dark");
    });
  });

  it("switches back to light mode and persists the choice", async () => {
    const user = userEvent.setup();
    localStorage.setItem("sebasam-theme", "dark");
    renderWithTheme();

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    const button = await screen.findByRole("button", { name: "Cambiar a modo claro" });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass("dark");
      expect(localStorage.getItem("sebasam-theme")).toBe("light");
    });
  });
});
