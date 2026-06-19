import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

function renderWithTheme(defaultTheme = "light") {
  return render(
    <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem={false}>
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
    renderWithTheme("light");

    const button = await screen.findByRole("button", { name: "Cambiar a modo oscuro" });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement).toHaveClass("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });

  it("switches back to light mode and persists the choice", async () => {
    const user = userEvent.setup();
    renderWithTheme("dark");

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
    const button = await screen.findByRole("button", { name: "Cambiar a modo claro" });

    await user.click(button);

    await waitFor(() => {
      expect(document.documentElement).not.toHaveClass("dark");
      expect(localStorage.getItem("theme")).toBe("light");
    });
  });
});
