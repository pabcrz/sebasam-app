import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { FontScaleProvider, useFontScaleContext } from "./font-scale-provider";

function TestConsumer() {
  const { fontScale, setFontScale } = useFontScaleContext();
  return (
    <div>
      <span data-testid="scale">{fontScale}</span>
      <button onClick={() => setFontScale("large")}>Make Large</button>
      <button onClick={() => setFontScale("normal")}>Make Normal</button>
    </div>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  document.documentElement.removeAttribute("data-font-scale");
});

describe("FontScaleProvider", () => {
  it("throws an error if useFontScaleContext is used outside FontScaleProvider", () => {
    // Suppress console.error for expected throw
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      "useFontScaleContext must be used within a FontScaleProvider",
    );
    consoleError.mockRestore();
  });

  it("handles storage write errors gracefully", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });

    render(
      <FontScaleProvider>
        <TestConsumer />
      </FontScaleProvider>,
    );

    expect(screen.getByTestId("scale").textContent).toBe("normal");

    act(() => {
      screen.getByText("Make Large").click();
    });

    expect(screen.getByTestId("scale").textContent).toBe("large");
    expect(document.documentElement.getAttribute("data-font-scale")).toBe("large");
  });
});
